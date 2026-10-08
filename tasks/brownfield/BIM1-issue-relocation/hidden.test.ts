/**
 * BIM1 — moving an issue to another project.
 *
 * The issue takes the target project's next number and its old number is
 * retired; everything on the issue stays; guards mirror an edit plus a
 * creation; one `issue.moved` event and one audit entry under the target;
 * search, boards and lists follow; the audit log is append-only.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { resetRateLimits } from "@/lib/rate-limit";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { activityFilterSchema } from "@/schemas/activity";
import { runMigrations } from "@/server/db/migrate";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as labelRepo from "@/server/repositories/label-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import { listActivity, registerActivityListeners } from "@/server/services/activity-service";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { registerSearchListeners, search } from "@/server/services/search-service";
import { registerUsageListeners, recomputeUsage } from "@/server/services/usage-service";
import type { PlanId } from "@/types/billing";
import type { IssueId, LabelId, ProjectId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

type Tenant = {
  org: Organization;
  platform: Project;
  docs: Project;
  actors: Record<Role, Actor>;
  userIds: Record<Role, UserId>;
};

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];
const UNKNOWN_ISSUE = "01HZZZQQQQQQQQQQQQQQQQQQQQ" as IssueId;
const UNKNOWN_PROJECT = "01HZZZRRRRRRRRRRRRRRRRRRRR" as ProjectId;

let dir: string;
const detachers: Unsubscribe[] = [];
const registrations: Unsubscribe[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bim1-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  registrations.push(registerActivityListeners(), registerSearchListeners(), registerUsageListeners());
});

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  while (registrations.length > 0) registrations.pop()?.();
  rmSync(dir, { recursive: true, force: true });
});

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function makeTenant(slug: string, plan: PlanId = "growth"): Promise<Tenant> {
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
    await memberRepo.insertMember(org.id, user.id, role, null);
    userIds[role] = user.id;
    actors[role] = { userId: user.id, orgId: org.id, role };
  }

  const platform = await addProject(org, "Platform", "platform", "PLAT", owner.id);
  const docs = await addProject(org, "Docs", "docs", "DOC", owner.id);

  return {
    org,
    platform,
    docs,
    actors: actors as Record<Role, Actor>,
    userIds: userIds as Record<Role, UserId>,
  };
}

async function addProject(org: Organization, name: string, slug: string, key: string, leadId: UserId): Promise<Project> {
  return projectRepo.insertProject({
    orgId: org.id,
    name,
    slug,
    key,
    description: null,
    visibility: "org",
    leadId,
    color: "#6366f1",
    targetDate: null,
  });
}

async function addIssue(
  tenant: Tenant,
  project: Project,
  title: string,
  overrides: Partial<{ by: Actor; status: IssueStatus; assigneeId: UserId | null; labelIds: readonly LabelId[] }> = {},
): Promise<Issue> {
  return issueService.createIssue(overrides.by ?? tenant.actors.member, {
    orgId: tenant.org.id,
    projectId: project.id,
    title,
    description: null,
    status: overrides.status ?? "backlog",
    priority: "high",
    assigneeId: overrides.assigneeId ?? null,
    parentId: null,
    estimate: 3,
    dueAt: null,
    labelIds: [...(overrides.labelIds ?? [])],
  });
}

async function move(tenant: Tenant, actor: Actor, issueId: IssueId, toProjectId: ProjectId): Promise<Issue> {
  return issueService.moveIssueToProject(actor, { orgId: tenant.org.id, issueId, toProjectId });
}

async function numbersIn(tenant: Tenant, project: Project): Promise<number[]> {
  const page = await issueService.listIssues(tenant.actors.owner, {
    orgId: tenant.org.id,
    projectId: project.id,
    includeArchived: true,
    limit: 100,
    cursor: null,
  });
  return page.items.map((issue) => issue.number).sort((a, b) => a - b);
}

async function boardIds(tenant: Tenant, project: Project): Promise<string[]> {
  const columns = await issueService.getBoard(tenant.actors.owner, tenant.org.id, project.id);
  return columns.flatMap((column) => column.issues.map((issue) => issue.id)).sort();
}

describe("BIM1 moving an issue to another project", () => {
  it("re-files the issue under the target with the target's next number, keeping everything else", async () => {
    const tenant = await makeTenant("bim1-basic");
    const bug = await labelRepo.insertLabel({ orgId: tenant.org.id, name: "bug", color: "#ef4444", description: null });
    await addIssue(tenant, tenant.docs, "docs one");
    await addIssue(tenant, tenant.docs, "docs two");
    const issue = await addIssue(tenant, tenant.platform, "misfiled", {
      status: "in_progress",
      assigneeId: tenant.userIds.viewer,
      labelIds: [bug.id],
    });
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "still relevant after the move",
      parentId: null,
      mentionedUserIds: [],
    });
    expect(issue.number).toBe(1);

    const moved = await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    expect(moved.id).toBe(issue.id);
    expect(moved.projectId).toBe(tenant.docs.id);
    expect(moved.number).toBe(3);
    expect(moved).toMatchObject({
      title: "misfiled",
      status: "in_progress",
      priority: "high",
      estimate: 3,
      assigneeId: tenant.userIds.viewer,
      authorId: tenant.userIds.member,
    });
    expect(moved.labelIds).toEqual([bug.id]);
    expect(moved.archivedAt).toBeNull();

    const stored = await issueService.getIssue(tenant.actors.owner, tenant.org.id, issue.id);
    expect(stored.issue.projectId).toBe(tenant.docs.id);
    expect(stored.issue.number).toBe(3);
    expect(stored.labels.map((label) => label.id)).toEqual([bug.id]);
    expect(stored.commentCount).toBe(1);
    expect((await commentRepo.findCommentById(tenant.org.id, comment.id))?.issueId).toBe(issue.id);
  });

  it("never re-issues the vacated number in the source project", async () => {
    const tenant = await makeTenant("bim1-retired");
    await addIssue(tenant, tenant.platform, "first");
    await addIssue(tenant, tenant.platform, "second");
    const third = await addIssue(tenant, tenant.platform, "third");
    expect(third.number).toBe(3);

    await move(tenant, tenant.actors.member, third.id, tenant.docs.id);
    expect(await numbersIn(tenant, tenant.platform)).toEqual([1, 2]);

    const fourth = await addIssue(tenant, tenant.platform, "fourth");
    expect(fourth.number).toBe(4);
    expect(await issueRepo.findIssueByNumber(tenant.org.id, tenant.platform.id, 3)).toBeNull();
  });

  it("continues the target's numbering after the moved issue", async () => {
    const tenant = await makeTenant("bim1-continue");
    const issue = await addIssue(tenant, tenant.platform, "incoming");
    await addIssue(tenant, tenant.docs, "docs one");

    const moved = await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);
    expect(moved.number).toBe(2);

    const next = await addIssue(tenant, tenant.docs, "docs after");
    expect(next.number).toBe(3);
    expect((await issueRepo.findIssueByNumber(tenant.org.id, tenant.docs.id, 2))?.id).toBe(issue.id);
  });

  it("gives a fresh number every time, including when an issue moves back", async () => {
    const tenant = await makeTenant("bim1-back-and-forth");
    const third = await addProject(tenant.org, "Ops", "ops", "OPS", tenant.userIds.owner);
    await addIssue(tenant, tenant.platform, "stays");
    const traveller = await addIssue(tenant, tenant.platform, "traveller");
    expect(traveller.number).toBe(2);

    const inDocs = await move(tenant, tenant.actors.member, traveller.id, tenant.docs.id);
    expect(inDocs.number).toBe(1);
    const inOps = await move(tenant, tenant.actors.member, traveller.id, third.id);
    expect(inOps.number).toBe(1);
    const home = await move(tenant, tenant.actors.member, traveller.id, tenant.platform.id);
    expect(home.number).toBe(3);

    const docsAgain = await addIssue(tenant, tenant.docs, "docs new");
    expect(docsAgain.number).toBe(2);
    const opsAgain = await addIssue(tenant, third, "ops new");
    expect(opsAgain.number).toBe(2);
    expect(await numbersIn(tenant, tenant.platform)).toEqual([1, 3]);
  });

  it("publishes one issue.moved and nothing else, and records one audit entry under the target", async () => {
    const tenant = await makeTenant("bim1-announce");
    const issue = await addIssue(tenant, tenant.platform, "announced");
    const moved = capture("issue.moved");
    const created = capture("issue.created");
    const updated = capture("issue.updated");
    const archived = capture("issue.archived");

    const result = await move(tenant, tenant.actors.admin, issue.id, tenant.docs.id);

    expect(moved).toHaveLength(1);
    expect(moved[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.admin,
      issueId: issue.id,
      fromProjectId: tenant.platform.id,
      toProjectId: tenant.docs.id,
      fromNumber: 1,
      toNumber: result.number,
    });
    expect(created).toHaveLength(0);
    expect(updated).toHaveLength(0);
    expect(archived).toHaveLength(0);

    const rows = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      action: ["issue.moved"],
      limit: 25,
      cursor: null,
    });
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]).toMatchObject({
      actorId: tenant.userIds.admin,
      subjectKind: "issue",
      subjectId: issue.id,
      projectId: tenant.docs.id,
    });
    expect(rows.items[0]?.metadata).toMatchObject({
      fromProjectId: tenant.platform.id,
      toProjectId: tenant.docs.id,
      fromNumber: 1,
      toNumber: result.number,
    });
    expect(
      activityFilterSchema.safeParse({ orgId: tenant.org.id, action: ["issue.moved"], limit: 25, cursor: null }).success,
    ).toBe(true);
  });

  it("leaves earlier audit entries under the project they were written for", async () => {
    const tenant = await makeTenant("bim1-append-only");
    const issue = await addIssue(tenant, tenant.platform, "with history");
    await issueService.changeIssueStatus(tenant.actors.member, { orgId: tenant.org.id, issueId: issue.id, status: "todo" });

    await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    const platformRows = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      projectId: tenant.platform.id,
      limit: 25,
      cursor: null,
    });
    expect(platformRows.items.map((row) => row.action).sort()).toEqual(["issue.created", "issue.status_changed"]);

    const docsRows = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      projectId: tenant.docs.id,
      limit: 25,
      cursor: null,
    });
    expect(docsRows.items.map((row) => row.action)).toEqual(["issue.moved"]);
  });

  it("is a no-op within the same project", async () => {
    const tenant = await makeTenant("bim1-noop");
    const issue = await addIssue(tenant, tenant.platform, "staying");
    const moved = capture("issue.moved");

    const result = await move(tenant, tenant.actors.member, issue.id, tenant.platform.id);

    expect(result.number).toBe(issue.number);
    expect(result.projectId).toBe(tenant.platform.id);
    expect(moved).toHaveLength(0);
    const rows = await listActivity(tenant.actors.owner, { orgId: tenant.org.id, action: ["issue.moved"], limit: 25, cursor: null });
    expect(rows.total).toBe(0);
    const next = await addIssue(tenant, tenant.platform, "next");
    expect(next.number).toBe(2);
  });

  it("guards tenant scope and existence like an edit plus a creation", async () => {
    const tenant = await makeTenant("bim1-guards");
    const stranger = await makeTenant("bim1-guards-other");
    const issue = await addIssue(tenant, tenant.platform, "guarded");
    const moved = capture("issue.moved");

    await expect(move(tenant, stranger.actors.owner, issue.id, tenant.docs.id)).rejects.toBeInstanceOf(TenantScopeError);
    await expect(move(tenant, tenant.actors.owner, UNKNOWN_ISSUE, tenant.docs.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(move(tenant, tenant.actors.owner, issue.id, UNKNOWN_PROJECT)).rejects.toBeInstanceOf(NotFoundError);
    await expect(move(tenant, tenant.actors.owner, issue.id, stranger.docs.id)).rejects.toBeInstanceOf(NotFoundError);

    expect(moved).toHaveLength(0);
    const stored = await issueRepo.findIssueById(tenant.org.id, issue.id);
    expect(stored?.projectId).toBe(tenant.platform.id);
    expect(stored?.number).toBe(1);
  });

  it("refuses an archived issue and an archived target, changing nothing", async () => {
    const tenant = await makeTenant("bim1-archived");
    const gone = await addIssue(tenant, tenant.platform, "archived issue");
    await issueService.archiveIssue(tenant.actors.member, tenant.org.id, gone.id);
    const live = await addIssue(tenant, tenant.platform, "live issue");
    const retired = await addProject(tenant.org, "Retired", "retired", "RET", tenant.userIds.owner);
    await projectService.archiveProject(tenant.actors.admin, { orgId: tenant.org.id, projectId: retired.id, archiveIssues: true });
    const moved = capture("issue.moved");

    await expect(move(tenant, tenant.actors.member, gone.id, tenant.docs.id)).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(move(tenant, tenant.actors.member, live.id, retired.id)).rejects.toBeInstanceOf(AlreadyArchivedError);

    expect(moved).toHaveLength(0);
    expect((await issueRepo.findIssueById(tenant.org.id, live.id))?.projectId).toBe(tenant.platform.id);
    expect((await issueRepo.findIssueById(tenant.org.id, gone.id))?.projectId).toBe(tenant.platform.id);
    const next = await addIssue(tenant, tenant.docs, "docs next");
    expect(next.number).toBe(1);
  });

  it("requires both the right to edit the issue and the right to create in the target", async () => {
    const tenant = await makeTenant("bim1-permission");
    const theirs = await addIssue(tenant, tenant.platform, "viewer's own", {
      by: tenant.actors.member,
      assigneeId: tenant.userIds.viewer,
    });
    const moved = capture("issue.moved");

    // The viewer may edit an issue assigned to them, but may not create issues anywhere.
    await expect(move(tenant, tenant.actors.viewer, theirs.id, tenant.docs.id)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(moved).toHaveLength(0);
    expect((await issueRepo.findIssueById(tenant.org.id, theirs.id))?.projectId).toBe(tenant.platform.id);

    const result = await move(tenant, tenant.actors.member, theirs.id, tenant.docs.id);
    expect(result.projectId).toBe(tenant.docs.id);
    expect(moved).toHaveLength(1);
  });

  it("applies the target project's issue quota and refuses a full project", async () => {
    const tenant = await makeTenant("bim1-quota", "free");
    for (let number = 1; number <= 100; number += 1) {
      await issueRepo.insertIssue(
        {
          orgId: tenant.org.id,
          projectId: tenant.docs.id,
          title: `Seed ${number}`,
          description: null,
          status: "backlog",
          priority: "none",
          assigneeId: null,
          parentId: null,
          estimate: null,
          dueAt: null,
          labelIds: [],
        },
        tenant.userIds.member,
        number,
      );
    }
    const issue = await addIssue(tenant, tenant.platform, "one too many");
    const moved = capture("issue.moved");

    await expect(move(tenant, tenant.actors.member, issue.id, tenant.docs.id)).rejects.toThrow();
    expect(moved).toHaveLength(0);
    expect((await issueRepo.findIssueById(tenant.org.id, issue.id))?.projectId).toBe(tenant.platform.id);
    expect(await issueRepo.countIssues(tenant.org.id, tenant.docs.id)).toBe(100);
    expect(await issueRepo.countIssues(tenant.org.id, tenant.platform.id)).toBe(1);
  });

  it("is found by a search scoped to the target and no longer by one scoped to the source", async () => {
    const tenant = await makeTenant("bim1-search");
    const issue = await addIssue(tenant, tenant.platform, "Searchable Zephyr");

    const before = await search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zephyr",
      kinds: ["issue"],
      projectId: tenant.platform.id,
      limit: 25,
      cursor: null,
    });
    expect(before.items.map((hit) => hit.id)).toEqual([issue.id]);

    await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    const inDocs = await search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zephyr",
      kinds: ["issue"],
      projectId: tenant.docs.id,
      limit: 25,
      cursor: null,
    });
    expect(inDocs.items.map((hit) => hit.id)).toEqual([issue.id]);
    expect(inDocs.total).toBe(1);

    const inPlatform = await search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zephyr",
      kinds: ["issue"],
      projectId: tenant.platform.id,
      limit: 25,
      cursor: null,
    });
    expect(inPlatform.total).toBe(0);
  });

  it("shows up on the target's board and list and disappears from the source's", async () => {
    const tenant = await makeTenant("bim1-views");
    const issue = await addIssue(tenant, tenant.platform, "on the board", { status: "todo" });
    await addIssue(tenant, tenant.platform, "stays behind");
    expect(await boardIds(tenant, tenant.platform)).toContain(issue.id);

    await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    expect(await boardIds(tenant, tenant.platform)).not.toContain(issue.id);
    const docsColumns = await issueService.getBoard(tenant.actors.owner, tenant.org.id, tenant.docs.id);
    const todo = docsColumns.find((column) => column.status === "todo");
    expect(todo?.issues.map((row) => row.id)).toEqual([issue.id]);

    const platformList = await issueService.listIssues(tenant.actors.owner, {
      orgId: tenant.org.id,
      projectId: tenant.platform.id,
      limit: 25,
      cursor: null,
    });
    expect(platformList.items.map((row) => row.title)).toEqual(["stays behind"]);
    expect(platformList.total).toBe(1);

    const docsList = await issueService.listIssues(tenant.actors.owner, {
      orgId: tenant.org.id,
      projectId: tenant.docs.id,
      limit: 25,
      cursor: null,
    });
    expect(docsList.items.map((row) => row.id)).toEqual([issue.id]);
    expect(docsList.total).toBe(1);
  });

  it("retires numbers whether an issue was archived or moved away", async () => {
    const tenant = await makeTenant("bim1-retire-both");
    await addIssue(tenant, tenant.platform, "one");
    const two = await addIssue(tenant, tenant.platform, "two");
    const three = await addIssue(tenant, tenant.platform, "three");
    await issueService.archiveIssue(tenant.actors.member, tenant.org.id, two.id);
    await move(tenant, tenant.actors.member, three.id, tenant.docs.id);

    const four = await addIssue(tenant, tenant.platform, "four");
    expect(four.number).toBe(4);
    expect(await numbersIn(tenant, tenant.platform)).toEqual([1, 2, 4]);

    const moveBack = await move(tenant, tenant.actors.member, three.id, tenant.platform.id);
    expect(moveBack.number).toBe(5);
    expect(await numbersIn(tenant, tenant.platform)).toEqual([1, 2, 4, 5]);
  });

  it("resolves the issue by its new key in the target and not by its old key in the source", async () => {
    const tenant = await makeTenant("bim1-keys");
    await addIssue(tenant, tenant.docs, "docs one");
    const issue = await addIssue(tenant, tenant.platform, "re-keyed");

    const moved = await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    expect(moved.number).toBe(2);
    expect((await issueRepo.findIssueByNumber(tenant.org.id, tenant.docs.id, 2))?.id).toBe(issue.id);
    expect(await issueRepo.findIssueByNumber(tenant.org.id, tenant.platform.id, 1)).toBeNull();
    expect(await issueRepo.findIssueByNumber(tenant.org.id, tenant.docs.id, 1)).not.toBeNull();
    expect((await issueRepo.findIssueByNumber(tenant.org.id, tenant.docs.id, 1))?.id).not.toBe(issue.id);
  });

  it("moves the issue between the projects' quotas without touching the workspace's issue meter", async () => {
    const tenant = await makeTenant("bim1-meter");
    await addIssue(tenant, tenant.platform, "a");
    const issue = await addIssue(tenant, tenant.platform, "b");
    await addIssue(tenant, tenant.docs, "c");
    const before = await recomputeUsage(tenant.org.id);
    expect(before.issuesUsed).toBe(3);

    await move(tenant, tenant.actors.member, issue.id, tenant.docs.id);

    expect(await issueRepo.countIssues(tenant.org.id, tenant.platform.id)).toBe(1);
    expect(await issueRepo.countIssues(tenant.org.id, tenant.docs.id)).toBe(2);
    const after = await recomputeUsage(tenant.org.id);
    expect(after.issuesUsed).toBe(3);
  });
});
