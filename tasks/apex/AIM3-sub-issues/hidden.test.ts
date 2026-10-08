/**
 * Hidden test for AIM3-sub-issues: an issue may sit under a parent of its own
 * project, the tree never loops or exceeds the depth limit (subtrees move
 * whole), roll-ups count every live descendant, archiving cascades and
 * announces each issue once, and the assignee of a parent hears once when its
 * last open sub-issue closes.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_SUB_ISSUE_DEPTH } from "@/config/constants";
import { subscribe } from "@/lib/event-bus";
import { IssueHierarchyError } from "@/lib/issue-hierarchy";
import { PermissionDeniedError } from "@/lib/permissions";
import { resetRateLimits } from "@/lib/rate-limit";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { runMigrations } from "@/server/db/migrate";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import type { PlanId } from "@/types/billing";
import type { IssueId, OrgId, ProjectId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const T0 = new Date("2026-08-03T09:00:00.000Z");
const SECOND = 1000;

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

interface Tenant {
  readonly org: Organization;
  readonly project: Project;
  readonly actors: Readonly<Record<Role, Actor>>;
  readonly userIds: Readonly<Record<Role, UserId>>;
}

let dir: string;
let clockMs = T0.getTime();
const detachers: Unsubscribe[] = [];

function tick(ms = SECOND): void {
  clockMs += ms;
  vi.setSystemTime(new Date(clockMs));
}

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function createTenant(slug: string, plan: PlanId = "growth"): Promise<Tenant> {
  const owner = await userRepo.insertUser({ email: `owner@${slug}.test`, name: `${slug} owner`, passwordHash: "seed" });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");

  const userIds: Partial<Record<Role, UserId>> = {};
  const actors: Partial<Record<Role, Actor>> = {};
  for (const role of ROLES) {
    const user =
      role === "owner"
        ? owner
        : await userRepo.insertUser({ email: `${role}@${slug}.test`, name: `${slug} ${role}`, passwordHash: "seed" });
    tick();
    await memberRepo.insertMember(org.id, user.id, role, null);
    userIds[role] = user.id;
    actors[role] = { userId: user.id, orgId: org.id, role };
  }

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: owner.id,
    color: "#6366f1",
    targetDate: null,
  });
  await usageRepo.recomputeUsage(org.id);

  return {
    org,
    project,
    actors: actors as Readonly<Record<Role, Actor>>,
    userIds: userIds as Readonly<Record<Role, UserId>>,
  };
}

async function otherProject(t: Tenant, name: string, key: string): Promise<Project> {
  tick();
  return projectService.createProject(t.actors.admin, {
    orgId: t.org.id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key,
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  });
}

async function issue(
  t: Tenant,
  options: Partial<{ projectId: ProjectId; parentId: IssueId | null; assigneeId: UserId | null; actor: Actor; title: string }> = {},
): Promise<Issue> {
  tick();
  return issueService.createIssue(options.actor ?? t.actors.member, {
    orgId: t.org.id,
    projectId: options.projectId ?? t.project.id,
    title: options.title ?? "Tree work",
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId: options.assigneeId ?? null,
    parentId: options.parentId ?? null,
    estimate: null,
    dueAt: null,
    labelIds: [],
  });
}

async function reparent(t: Tenant, issueId: IssueId, parentId: IssueId | null, actor?: Actor): Promise<Issue> {
  tick();
  return issueService.setIssueParent(actor ?? t.actors.member, { orgId: t.org.id, issueId, parentId });
}

async function setStatus(t: Tenant, issueId: IssueId, status: IssueStatus, actor?: Actor): Promise<Issue> {
  tick();
  return issueService.changeIssueStatus(actor ?? t.actors.member, { orgId: t.org.id, issueId, status });
}

async function archive(t: Tenant, issueId: IssueId, actor?: Actor): Promise<Issue> {
  tick();
  return issueService.archiveIssue(actor ?? t.actors.member, t.org.id, issueId);
}

async function children(t: Tenant, issueId: IssueId): Promise<readonly IssueId[]> {
  return (await issueService.listSubIssues(t.actors.viewer, t.org.id, issueId)).map((row) => row.id);
}

async function rollup(t: Tenant, issueId: IssueId) {
  return issueService.getIssueRollup(t.actors.viewer, t.org.id, issueId);
}

async function parentOf(t: Tenant, issueId: IssueId): Promise<IssueId | null> {
  return (await issueRepo.findIssueById(t.org.id, issueId))?.parentId ?? null;
}

async function completionAlerts(t: Tenant, role: Role) {
  const page = await notificationService.listNotifications(t.actors[role], {
    orgId: t.org.id,
    recipientId: t.userIds[role],
    unreadOnly: false,
    kind: ["sub_issues_completed"],
    limit: 100,
    cursor: null,
  });
  return page.items;
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-aim3-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  registerEventHandlers();
});

beforeEach(() => {
  resetRateLimits();
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

describe("parents", () => {
  it("places an issue under a parent at creation or later, and makes it a root again", async () => {
    const t = await createTenant("parents");
    const root = await issue(t, { title: "Epic" });
    const born = await issue(t, { parentId: root.id, title: "Born under" });
    const later = await issue(t, { title: "Moved under" });

    expect(born.parentId).toBe(root.id);
    expect(await children(t, root.id)).toEqual([born.id]);

    const moved = await reparent(t, later.id, root.id);
    expect(moved.parentId).toBe(root.id);
    expect(await children(t, root.id)).toEqual([born.id, later.id]);
    expect(await rollup(t, root.id)).toEqual({ total: 2, open: 2, closed: 0 });

    const freed = await reparent(t, later.id, null);
    expect(freed.parentId).toBeNull();
    expect(await children(t, root.id)).toEqual([born.id]);
  });

  it("announces a move as an update of the parent field", async () => {
    const t = await createTenant("parents-event");
    const root = await issue(t);
    const child = await issue(t);
    const updated = capture("issue.updated");

    await reparent(t, child.id, root.id);

    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ issueId: child.id, changedFields: ["parentId"] });
  });

  it("refuses a parent of another project or workspace, or an archived one, changing nothing", async () => {
    const t = await createTenant("parents-refuse");
    const other = await createTenant("parents-refuse-other");
    const elsewhere = await otherProject(t, "Mobile", "MOB");
    const foreign = await issue(t, { projectId: elsewhere.id });
    const abroad = await issue(other);
    const gone = await issue(t);
    await archive(t, gone.id);
    const subject = await issue(t);
    const created = capture("issue.created");

    await expect(reparent(t, subject.id, foreign.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(reparent(t, subject.id, abroad.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(reparent(t, subject.id, gone.id)).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(await parentOf(t, subject.id)).toBeNull();

    await expect(issue(t, { parentId: foreign.id })).rejects.toBeInstanceOf(NotFoundError);
    await expect(issue(t, { parentId: gone.id })).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(created).toHaveLength(0);
    expect(await issueRepo.countIssues(t.org.id, t.project.id, { includeArchived: true })).toBe(2);
  });

  it("allows a move to a shallower place in the same tree, and making a root a root again", async () => {
    const t = await createTenant("shallower");
    const root = await issue(t, { title: "root" });
    const mid = await issue(t, { parentId: root.id, title: "mid" });
    const leaf = await issue(t, { parentId: mid.id, title: "leaf" });

    const lifted = await reparent(t, leaf.id, root.id);
    expect(lifted.parentId).toBe(root.id);
    expect(await children(t, root.id)).toEqual([mid.id, leaf.id]);

    const stillRoot = await reparent(t, root.id, null);
    expect(stillRoot.parentId).toBeNull();
  });

  it("never lets an issue become its own ancestor", async () => {
    const t = await createTenant("cycles");
    const a = await issue(t, { title: "A" });
    const b = await issue(t, { parentId: a.id, title: "B" });
    const c = await issue(t, { parentId: b.id, title: "C" });

    await expect(reparent(t, a.id, a.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    await expect(reparent(t, a.id, b.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    await expect(reparent(t, a.id, c.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    expect(await parentOf(t, a.id)).toBeNull();
    expect(await parentOf(t, b.id)).toBe(a.id);
  });

  it("keeps the tree within the depth limit, counting the subtree that moves", async () => {
    const t = await createTenant("depth");
    expect(MAX_SUB_ISSUE_DEPTH).toBe(3);
    const root = await issue(t, { title: "root" });
    const l1 = await issue(t, { parentId: root.id, title: "level 1" });
    const l2 = await issue(t, { parentId: l1.id, title: "level 2" });
    const l3 = await issue(t, { parentId: l2.id, title: "level 3" });

    await expect(issue(t, { parentId: l3.id, title: "level 4" })).rejects.toBeInstanceOf(IssueHierarchyError);
    const loose = await issue(t, { title: "loose" });
    await expect(reparent(t, loose.id, l3.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    expect(await parentOf(t, loose.id)).toBeNull();

    // A subtree two levels tall cannot hang under a level-2 issue, but can under a root.
    const stem = await issue(t, { title: "stem" });
    const twig = await issue(t, { parentId: stem.id, title: "twig" });
    const leaf = await issue(t, { parentId: twig.id, title: "leaf" });
    await expect(reparent(t, stem.id, l2.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    await expect(reparent(t, stem.id, l1.id)).rejects.toBeInstanceOf(IssueHierarchyError);
    const placed = await reparent(t, stem.id, root.id);
    expect(placed.parentId).toBe(root.id);
    expect(await parentOf(t, twig.id)).toBe(stem.id);
    expect(await parentOf(t, leaf.id)).toBe(twig.id);
  });

  it("moves a subtree whole when its top is reparented", async () => {
    const t = await createTenant("subtree");
    const oldRoot = await issue(t, { title: "old root" });
    const newRoot = await issue(t, { title: "new root" });
    const mid = await issue(t, { parentId: oldRoot.id, title: "mid" });
    const leafA = await issue(t, { parentId: mid.id, title: "leaf a" });
    const leafB = await issue(t, { parentId: mid.id, title: "leaf b" });

    await reparent(t, mid.id, newRoot.id);

    expect(await children(t, oldRoot.id)).toEqual([]);
    expect(await children(t, newRoot.id)).toEqual([mid.id]);
    expect(await children(t, mid.id)).toEqual([leafA.id, leafB.id]);
    expect(await rollup(t, oldRoot.id)).toEqual({ total: 0, open: 0, closed: 0 });
    expect(await rollup(t, newRoot.id)).toEqual({ total: 3, open: 3, closed: 0 });
  });

  it("takes the same right as editing the issue, and reads the same right as reading it", async () => {
    const t = await createTenant("perms");
    const other = await createTenant("perms-other");
    const root = await issue(t);
    const mine = await issue(t, { assigneeId: t.userIds.viewer });
    const theirs = await issue(t);

    const moved = await reparent(t, mine.id, root.id, t.actors.viewer);
    expect(moved.parentId).toBe(root.id);
    await expect(reparent(t, theirs.id, root.id, t.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      issueService.setIssueParent(other.actors.admin, { orgId: t.org.id, issueId: theirs.id, parentId: root.id }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await children(t, root.id)).toEqual([mine.id]);
    await expect(issueService.listSubIssues(other.actors.owner, t.org.id, root.id)).rejects.toBeInstanceOf(TenantScopeError);
    await expect(issueService.listSubIssues(other.actors.owner, other.org.id, root.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(issueService.getIssueRollup(other.actors.owner, other.org.id, root.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("roll-ups and listings", () => {
  it("counts every live descendant at any depth, closed meaning done or canceled", async () => {
    const t = await createTenant("rollup");
    const root = await issue(t);
    const a = await issue(t, { parentId: root.id });
    const a1 = await issue(t, { parentId: a.id });
    const a2 = await issue(t, { parentId: a.id });
    const b = await issue(t, { parentId: root.id });
    await setStatus(t, a1.id, "done");
    await setStatus(t, b.id, "canceled");
    await archive(t, a2.id);

    expect(await rollup(t, root.id)).toEqual({ total: 3, open: 1, closed: 2 });
    expect(await rollup(t, a.id)).toEqual({ total: 1, open: 0, closed: 1 });
    expect(await children(t, a.id)).toEqual([a1.id]);
  });

  it("counts a parent with a hundred and fifty children in full", async () => {
    const t = await createTenant("rollup-many");
    const root = await issue(t);
    const ids: IssueId[] = [];
    for (let i = 0; i < 150; i += 1) {
      ids.push((await issue(t, { parentId: root.id, title: `child ${i}` })).id);
    }
    for (let i = 0; i < 40; i += 1) await setStatus(t, ids[i]!, "done");
    const grandchild = await issue(t, { parentId: ids[149]!, title: "grandchild" });

    expect(await rollup(t, root.id)).toEqual({ total: 151, open: 111, closed: 40 });
    expect((await children(t, root.id)).length).toBe(150);
    expect(await children(t, ids[149]!)).toEqual([grandchild.id]);
  });

  it("reports nothing below a leaf", async () => {
    const t = await createTenant("leaf");
    const leaf = await issue(t);

    expect(await rollup(t, leaf.id)).toEqual({ total: 0, open: 0, closed: 0 });
    expect(await children(t, leaf.id)).toEqual([]);
  });

  it("lists direct live sub-issues oldest first, excluding archived ones and grandchildren", async () => {
    const t = await createTenant("listing");
    const root = await issue(t);
    const first = await issue(t, { parentId: root.id, title: "first" });
    const second = await issue(t, { parentId: root.id, title: "second" });
    const third = await issue(t, { parentId: root.id, title: "third" });
    await issue(t, { parentId: first.id, title: "grandchild" });
    await archive(t, second.id);

    expect(await children(t, root.id)).toEqual([first.id, third.id]);
  });
});

describe("archiving", () => {
  it("archives every live descendant with the issue, announcing each once and keeping the counters honest", async () => {
    const t = await createTenant("archive-cascade");
    const root = await issue(t);
    const a = await issue(t, { parentId: root.id });
    const a1 = await issue(t, { parentId: a.id });
    const b = await issue(t, { parentId: root.id });
    const earlier = await issue(t, { parentId: root.id, title: "archived earlier" });
    const stranger = await issue(t, { title: "unrelated" });
    const earlierArchived = await archive(t, earlier.id);
    const before = (await usageRepo.getUsage(t.org.id)).issuesUsed;
    const archivedEvents = capture("issue.archived");

    await archive(t, root.id);

    expect([...archivedEvents.map((row) => row.issueId)].sort()).toEqual([root.id, a.id, a1.id, b.id].sort());
    for (const id of [root.id, a.id, a1.id, b.id]) {
      expect((await issueRepo.findIssueById(t.org.id, id))?.archivedAt).not.toBeNull();
    }
    expect((await issueRepo.findIssueById(t.org.id, earlier.id))?.archivedAt).toBe(earlierArchived.archivedAt);
    expect((await issueRepo.findIssueById(t.org.id, stranger.id))?.archivedAt).toBeNull();
    expect((await usageRepo.getUsage(t.org.id)).issuesUsed).toBe(before - 4);
    expect((await usageService_recompute(t.org.id)).issuesUsed).toBe(before - 4);
    for (const id of [root.id, a.id, a1.id, b.id]) {
      const hits = await searchRepo.searchDocuments({ orgId: t.org.id, q: "Tree work", kinds: ["issue"], limit: 100, cursor: null });
      expect(hits.items.map((row) => row.subjectId)).not.toContain(id);
    }
  });

  it("tells nobody when a parent is archived together with its open sub-issues", async () => {
    const t = await createTenant("archive-parent-quiet");
    const parent = await issue(t, { assigneeId: t.userIds.member, title: "parent" });
    const grand = await issue(t, { assigneeId: t.userIds.owner, title: "grand" });
    await reparent(t, parent.id, grand.id);
    await issue(t, { parentId: parent.id, title: "open child" });

    await archive(t, parent.id, t.actors.admin);

    expect(await completionAlerts(t, "member")).toHaveLength(0);
    // The grandparent lost its only (open) sub-issue to the archive: that is a close for it.
    expect(await completionAlerts(t, "owner")).toHaveLength(1);
  });

  it("leaves the parent alone when a sub-issue is archived", async () => {
    const t = await createTenant("archive-child");
    const root = await issue(t);
    const child = await issue(t, { parentId: root.id });

    await archive(t, child.id);

    expect((await issueRepo.findIssueById(t.org.id, root.id))?.archivedAt).toBeNull();
    expect(await rollup(t, root.id)).toEqual({ total: 0, open: 0, closed: 0 });
  });
});

async function usageService_recompute(orgId: OrgId) {
  return usageRepo.recomputeUsage(orgId);
}

describe("when the last sub-issue closes", () => {
  it("tells the parent's assignee once, not before, and not about their own change", async () => {
    const t = await createTenant("completion");
    const parent = await issue(t, { assigneeId: t.userIds.member, title: "parent" });
    const first = await issue(t, { parentId: parent.id, title: "first" });
    const second = await issue(t, { parentId: parent.id, title: "second" });

    await setStatus(t, first.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(0);

    await setStatus(t, second.id, "canceled", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(1);
    expect(await completionAlerts(t, "admin")).toHaveLength(0);

    await setStatus(t, second.id, "todo", t.actors.admin);
    await setStatus(t, second.id, "done", t.actors.member);
    expect(await completionAlerts(t, "member")).toHaveLength(1);

    await setStatus(t, first.id, "in_progress", t.actors.admin);
    await setStatus(t, first.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(2);
  });

  it("counts an archived open sub-issue as closed, and says nothing for a parent without an assignee or without children", async () => {
    const t = await createTenant("completion-archive");
    const parent = await issue(t, { assigneeId: t.userIds.member, title: "parent" });
    const only = await issue(t, { parentId: parent.id, title: "only" });
    await archive(t, only.id, t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(1);

    const orphan = await issue(t, { title: "orphan" });
    const unowned = await issue(t, { title: "unowned" });
    const child = await issue(t, { parentId: unowned.id, title: "child" });
    await setStatus(t, orphan.id, "done", t.actors.admin);
    await setStatus(t, child.id, "done", t.actors.admin);
    for (const role of ROLES) {
      expect(await completionAlerts(t, role)).toHaveLength(role === "member" ? 1 : 0);
    }
  });

  it("is a closing, not a rearrangement: moving the last open sub-issue away says nothing", async () => {
    const t = await createTenant("completion-move");
    const parent = await issue(t, { assigneeId: t.userIds.member, title: "parent" });
    const done = await issue(t, { parentId: parent.id, title: "done soon" });
    const open = await issue(t, { parentId: parent.id, title: "still open" });
    await setStatus(t, done.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(0);

    await reparent(t, open.id, null, t.actors.admin);
    expect(await rollup(t, parent.id)).toEqual({ total: 1, open: 0, closed: 1 });
    expect(await completionAlerts(t, "member")).toHaveLength(0);

    const fresh = await issue(t, { parentId: parent.id, title: "fresh" });
    await setStatus(t, fresh.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(1);
  });

  it("goes through the recipient's own preferences", async () => {
    const t = await createTenant("completion-prefs");
    await notificationService.updatePreference(t.actors.member, {
      orgId: t.org.id,
      userId: t.userIds.member,
      kind: "sub_issues_completed",
      inApp: false,
      email: false,
      digestOnly: false,
    });
    const parent = await issue(t, { assigneeId: t.userIds.member, title: "parent" });
    const child = await issue(t, { parentId: parent.id, title: "child" });

    await setStatus(t, child.id, "done", t.actors.admin);

    expect(await completionAlerts(t, "member")).toHaveLength(0);
  });

  it("looks only at the direct parent and only at live sub-issues", async () => {
    const t = await createTenant("completion-depth");
    const grand = await issue(t, { assigneeId: t.userIds.owner, title: "grand" });
    const parent = await issue(t, { parentId: grand.id, assigneeId: t.userIds.member, title: "parent" });
    const leaf = await issue(t, { parentId: parent.id, title: "leaf" });
    const sibling = await issue(t, { parentId: grand.id, title: "sibling" });

    await setStatus(t, leaf.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "member")).toHaveLength(1);
    expect(await completionAlerts(t, "owner")).toHaveLength(0);

    await setStatus(t, sibling.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "owner")).toHaveLength(0);
    await setStatus(t, parent.id, "done", t.actors.admin);
    expect(await completionAlerts(t, "owner")).toHaveLength(1);
  });
});
