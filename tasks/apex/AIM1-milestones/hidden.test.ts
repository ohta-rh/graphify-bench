/**
 * Hidden test for AIM1-milestones: per-project milestones with unique names,
 * an open-milestone cap, progress counted over every live issue, overdue
 * detection on a strict boundary, closing that moves only open live work and
 * tells each assignee once, reopening, and the same gate on both ways an
 * issue enters a milestone.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MAX_OPEN_MILESTONES_PER_PROJECT } from "@/config/constants";
import { subscribe } from "@/lib/event-bus";
import { MilestoneStateError } from "@/lib/milestones";
import { PermissionDeniedError } from "@/lib/permissions";
import { resetRateLimits } from "@/lib/rate-limit";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { runMigrations } from "@/server/db/migrate";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import * as activityService from "@/server/services/activity-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as milestoneService from "@/server/services/milestone-service";
import * as notificationService from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, IssueId, MilestoneId, OrgId, ProjectId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Milestone } from "@/types/milestone";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const T0 = new Date("2026-07-01T09:00:00.000Z");
const SECOND = 1000;
const DAY = 24 * 60 * 60 * SECOND;

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

function stamp(ms: number): IsoTimestamp {
  return new Date(ms).toISOString() as IsoTimestamp;
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

async function milestone(
  t: Tenant,
  name: string,
  options: Partial<{ projectId: ProjectId; targetDate: IsoTimestamp | null; actor: Actor }> = {},
): Promise<Milestone> {
  tick();
  return milestoneService.createMilestone(options.actor ?? t.actors.admin, {
    orgId: t.org.id,
    projectId: options.projectId ?? t.project.id,
    name,
    targetDate: options.targetDate ?? null,
  });
}

async function issue(
  t: Tenant,
  options: Partial<{ projectId: ProjectId; milestoneId: MilestoneId | null; assigneeId: UserId | null; actor: Actor; title: string }> = {},
): Promise<Issue> {
  tick();
  return issueService.createIssue(options.actor ?? t.actors.member, {
    orgId: t.org.id,
    projectId: options.projectId ?? t.project.id,
    title: options.title ?? "Milestone work",
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId: options.assigneeId ?? null,
    parentId: null,
    milestoneId: options.milestoneId ?? null,
    estimate: null,
    dueAt: null,
    labelIds: [],
  });
}

async function setStatus(t: Tenant, issueId: IssueId, status: IssueStatus): Promise<Issue> {
  tick();
  return issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId, status });
}

async function move(t: Tenant, issueId: IssueId, milestoneId: MilestoneId | null, actor?: Actor): Promise<Issue> {
  tick();
  return issueService.setIssueMilestone(actor ?? t.actors.member, { orgId: t.org.id, issueId, milestoneId });
}

async function close(t: Tenant, milestoneId: MilestoneId, moveOpenIssuesTo: MilestoneId | null = null, actor?: Actor) {
  tick();
  return milestoneService.closeMilestone(actor ?? t.actors.admin, { orgId: t.org.id, milestoneId, moveOpenIssuesTo });
}

async function progress(t: Tenant, milestoneId: MilestoneId) {
  const found = await milestoneService.getMilestone(t.actors.viewer, t.org.id, milestoneId);
  return { ...found.progress, overdue: found.overdue, closed: found.progress.closed, open: found.progress.open };
}

async function alertsOf(t: Tenant, role: Role) {
  const page = await notificationService.listNotifications(t.actors[role], {
    orgId: t.org.id,
    recipientId: t.userIds[role],
    unreadOnly: false,
    kind: ["issue_milestone_changed"],
    limit: 100,
    cursor: null,
  });
  return page.items;
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-aim1-"));
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

describe("creating and naming", () => {
  it("creates an open milestone, lists it with empty progress, announces and audits it", async () => {
    const t = await createTenant("create");
    const created = capture("milestone.created");
    const target = stamp(clockMs + 30 * DAY);

    const m = await milestone(t, "Launch", { targetDate: target });

    expect(m).toMatchObject({ orgId: t.org.id, projectId: t.project.id, name: "Launch", targetDate: target, closedAt: null });
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ milestoneId: m.id, projectId: t.project.id, actorId: t.userIds.admin });

    const listed = await milestoneService.listMilestones(t.actors.viewer, t.org.id, t.project.id);
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ milestone: { id: m.id }, progress: { total: 0, open: 0, closed: 0 }, overdue: false });

    const audit = await activityService.listActivity(t.actors.admin, {
      orgId: t.org.id,
      action: ["milestone.created"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items.map((row) => [row.subjectKind, row.subjectId, row.projectId])).toEqual([["milestone", m.id, t.project.id]]);
  });

  it("keeps names unique per project without regard to letter case, closed ones included", async () => {
    const t = await createTenant("names");
    const first = await milestone(t, "Launch");

    await expect(milestone(t, "launch")).rejects.toBeInstanceOf(MilestoneStateError);
    await expect(milestone(t, " LAUNCH ")).rejects.toBeInstanceOf(MilestoneStateError);

    await close(t, first.id);
    await expect(milestone(t, "Launch")).rejects.toBeInstanceOf(MilestoneStateError);

    const elsewhere = await otherProject(t, "Mobile", "MOB");
    const twin = await milestone(t, "Launch", { projectId: elsewhere.id });
    expect(twin.projectId).toBe(elsewhere.id);

    const second = await milestone(t, "Beta");
    await expect(
      milestoneService.updateMilestone(t.actors.admin, { orgId: t.org.id, milestoneId: second.id, name: "LAUNCH" }),
    ).rejects.toBeInstanceOf(MilestoneStateError);
    const renamed = await milestoneService.updateMilestone(t.actors.admin, { orgId: t.org.id, milestoneId: second.id, name: "Beta 2" });
    expect(renamed.name).toBe("Beta 2");
  });

  it("caps the open milestones of a project; closing one makes room, reopening needs room", async () => {
    const t = await createTenant("cap");
    const opened: Milestone[] = [];
    for (let i = 1; i <= MAX_OPEN_MILESTONES_PER_PROJECT; i += 1) {
      opened.push(await milestone(t, `Sprint ${i}`));
    }

    await expect(milestone(t, "One too many")).rejects.toBeInstanceOf(MilestoneStateError);

    const first = opened[0]!;
    await close(t, first.id);
    const extra = await milestone(t, "Now there is room");
    expect(extra.closedAt).toBeNull();

    tick();
    await expect(milestoneService.reopenMilestone(t.actors.admin, t.org.id, first.id)).rejects.toBeInstanceOf(
      MilestoneStateError,
    );
    await close(t, extra.id);
    tick();
    const reopened = await milestoneService.reopenMilestone(t.actors.admin, t.org.id, first.id);
    expect(reopened.closedAt).toBeNull();
  });

  it("is guarded like editing the project", async () => {
    const t = await createTenant("guards");
    const other = await createTenant("guards-other");

    await expect(milestone(t, "By a viewer", { actor: t.actors.viewer })).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      milestoneService.createMilestone(other.actors.admin, { orgId: t.org.id, projectId: t.project.id, name: "Foreign", targetDate: null }),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      milestoneService.createMilestone(t.actors.admin, { orgId: t.org.id, projectId: other.project.id, name: "Foreign", targetDate: null }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const mine = await milestone(t, "By a member", { actor: t.actors.member });
    expect(mine.name).toBe("By a member");

    const doomed = await otherProject(t, "Doomed", "DOM");
    const kept = await milestone(t, "Kept", { projectId: doomed.id });
    tick();
    await projectService.archiveProject(t.actors.admin, { orgId: t.org.id, projectId: doomed.id, archiveIssues: true });

    await expect(milestone(t, "Too late", { projectId: doomed.id })).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(close(t, kept.id)).rejects.toBeInstanceOf(AlreadyArchivedError);
    const listed = await milestoneService.listMilestones(t.actors.viewer, t.org.id, doomed.id);
    expect(listed.map((row) => row.milestone.id)).toEqual([kept.id]);
  });
});

describe("issues in milestones", () => {
  it("accepts an open milestone of the issue's project at creation and later, and takes the issue out again", async () => {
    const t = await createTenant("assign");
    const m = await milestone(t, "Launch");

    const born = await issue(t, { milestoneId: m.id });
    expect(born.milestoneId).toBe(m.id);
    expect((await issueRepo.findIssueById(t.org.id, born.id))?.milestoneId).toBe(m.id);

    const later = await issue(t);
    expect(later.milestoneId).toBeNull();
    const moved = await move(t, later.id, m.id);
    expect(moved.milestoneId).toBe(m.id);
    expect(await progress(t, m.id)).toMatchObject({ total: 2, open: 2, closed: 0 });

    const out = await move(t, later.id, null);
    expect(out.milestoneId).toBeNull();
    expect(await progress(t, m.id)).toMatchObject({ total: 1 });
  });

  it("refuses a milestone of another project or workspace, a closed one, and an archived issue", async () => {
    const t = await createTenant("refuse");
    const other = await createTenant("refuse-other");
    const elsewhere = await otherProject(t, "Mobile", "MOB");
    const foreign = await milestone(t, "Mobile launch", { projectId: elsewhere.id });
    const abroad = await milestone(other, "Abroad");
    const done = await milestone(t, "Done already");
    await close(t, done.id);
    const open = await milestone(t, "Open");
    const subject = await issue(t);

    await expect(move(t, subject.id, foreign.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(move(t, subject.id, abroad.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(move(t, subject.id, done.id)).rejects.toBeInstanceOf(MilestoneStateError);
    expect((await issueRepo.findIssueById(t.org.id, subject.id))?.milestoneId).toBeNull();

    await expect(move(t, subject.id, open.id, t.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);

    tick();
    await issueService.archiveIssue(t.actors.member, t.org.id, subject.id);
    await expect(move(t, subject.id, open.id)).rejects.toBeInstanceOf(AlreadyArchivedError);
  });

  it("applies the same gate when the milestone is given at creation, creating nothing otherwise", async () => {
    const t = await createTenant("create-gate");
    const elsewhere = await otherProject(t, "Mobile", "MOB");
    const foreign = await milestone(t, "Mobile launch", { projectId: elsewhere.id });
    const done = await milestone(t, "Done already");
    await close(t, done.id);
    const created = capture("issue.created");

    await expect(issue(t, { milestoneId: foreign.id })).rejects.toBeInstanceOf(NotFoundError);
    await expect(issue(t, { milestoneId: done.id })).rejects.toBeInstanceOf(MilestoneStateError);

    expect(created).toHaveLength(0);
    expect(await issueRepo.countIssues(t.org.id, t.project.id, { includeArchived: true })).toBe(0);
  });

  it("lets an issue's own assignee move it, whatever their role", async () => {
    const t = await createTenant("assignee-move");
    const m = await milestone(t, "Launch");
    const mine = await issue(t, { assigneeId: t.userIds.viewer });
    const theirs = await issue(t, { assigneeId: t.userIds.member });

    const moved = await move(t, mine.id, m.id, t.actors.viewer);
    expect(moved.milestoneId).toBe(m.id);
    await expect(move(t, theirs.id, m.id, t.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("counts progress over every live issue: closed means done or canceled, archived ones leave", async () => {
    const t = await createTenant("progress");
    const m = await milestone(t, "Big");
    const ids: IssueId[] = [];
    for (let i = 0; i < 150; i += 1) {
      ids.push((await issue(t, { milestoneId: m.id, title: `Work ${i}` })).id);
    }
    for (let i = 0; i < 100; i += 1) await setStatus(t, ids[i]!, "done");
    for (let i = 100; i < 120; i += 1) await setStatus(t, ids[i]!, "canceled");
    for (let i = 120; i < 125; i += 1) {
      tick();
      await issueService.archiveIssue(t.actors.member, t.org.id, ids[i]!);
    }

    expect(await progress(t, m.id)).toMatchObject({ total: 145, open: 25, closed: 120 });
  });
});

describe("overdue", () => {
  it("is overdue only when open, strictly past its target and still holding open work", async () => {
    const t = await createTenant("overdue");
    const target = stamp(clockMs + 2 * DAY);
    const m = await milestone(t, "Dated", { targetDate: target });
    const undated = await milestone(t, "Undated");
    const work = await issue(t, { milestoneId: m.id });
    await issue(t, { milestoneId: undated.id });

    expect((await progress(t, m.id)).overdue).toBe(false);

    vi.setSystemTime(new Date(target));
    clockMs = new Date(target).getTime();
    expect((await progress(t, m.id)).overdue).toBe(false);

    tick();
    expect((await progress(t, m.id)).overdue).toBe(true);
    expect((await progress(t, undated.id)).overdue).toBe(false);

    await setStatus(t, work.id, "done");
    expect((await progress(t, m.id)).overdue).toBe(false);

    const second = await issue(t, { milestoneId: m.id });
    expect((await progress(t, m.id)).overdue).toBe(true);
    await close(t, m.id);
    expect((await progress(t, m.id)).overdue).toBe(false);
    expect((await issueRepo.findIssueById(t.org.id, second.id))?.milestoneId).toBeNull();
  });

  it("follows a changed target date", async () => {
    const t = await createTenant("overdue-retarget");
    const m = await milestone(t, "Dated", { targetDate: stamp(clockMs - DAY) });
    await issue(t, { milestoneId: m.id });
    expect((await progress(t, m.id)).overdue).toBe(true);

    tick();
    const pushed = await milestoneService.updateMilestone(t.actors.admin, {
      orgId: t.org.id,
      milestoneId: m.id,
      targetDate: stamp(clockMs + 10 * DAY),
    });
    expect(pushed.targetDate).toBe(stamp(clockMs + 10 * DAY));
    expect((await progress(t, m.id)).overdue).toBe(false);

    tick();
    const cleared = await milestoneService.updateMilestone(t.actors.admin, { orgId: t.org.id, milestoneId: m.id, targetDate: null });
    expect(cleared.targetDate).toBeNull();
    expect((await progress(t, m.id)).overdue).toBe(false);
  });
});

describe("closing and reopening", () => {
  it("moves only the open live issues to the target, keeps closed and archived ones, and announces once", async () => {
    const t = await createTenant("close-move");
    const from = await milestone(t, "Sprint 1");
    const to = await milestone(t, "Sprint 2");
    const open1 = await issue(t, { milestoneId: from.id, assigneeId: t.userIds.member });
    const open2 = await issue(t, { milestoneId: from.id, assigneeId: t.userIds.viewer });
    const finished = await issue(t, { milestoneId: from.id, assigneeId: t.userIds.member });
    const dropped = await issue(t, { milestoneId: from.id });
    const shelved = await issue(t, { milestoneId: from.id, assigneeId: t.userIds.viewer });
    await setStatus(t, finished.id, "done");
    await setStatus(t, dropped.id, "canceled");
    tick();
    await issueService.archiveIssue(t.actors.member, t.org.id, shelved.id);
    const closedEvents = capture("milestone.closed");

    const result = await close(t, from.id, to.id);

    expect(result.milestone.closedAt).not.toBeNull();
    expect([...result.movedIssueIds].sort()).toEqual([open1.id, open2.id].sort());
    expect(closedEvents).toHaveLength(1);
    expect([...(closedEvents[0]?.movedIssueIds ?? [])].sort()).toEqual([open1.id, open2.id].sort());

    expect((await issueRepo.findIssueById(t.org.id, open1.id))?.milestoneId).toBe(to.id);
    expect((await issueRepo.findIssueById(t.org.id, open2.id))?.milestoneId).toBe(to.id);
    expect((await issueRepo.findIssueById(t.org.id, finished.id))?.milestoneId).toBe(from.id);
    expect((await issueRepo.findIssueById(t.org.id, dropped.id))?.milestoneId).toBe(from.id);
    expect((await issueRepo.findIssueById(t.org.id, shelved.id))?.milestoneId).toBe(from.id);

    expect(await progress(t, from.id)).toMatchObject({ total: 2, open: 0, closed: 2 });
    expect(await progress(t, to.id)).toMatchObject({ total: 2, open: 2, closed: 0 });

    const audit = await activityService.listActivity(t.actors.admin, {
      orgId: t.org.id,
      action: ["milestone.closed"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items.map((row) => row.subjectId)).toEqual([from.id]);
  });

  it("tells each assignee of a moved issue once, and never whoever closed the milestone", async () => {
    const t = await createTenant("close-alerts");
    const from = await milestone(t, "Sprint 1");
    await issue(t, { milestoneId: from.id, assigneeId: t.userIds.member });
    await issue(t, { milestoneId: from.id, assigneeId: t.userIds.member });
    await issue(t, { milestoneId: from.id, assigneeId: t.userIds.admin });
    await issue(t, { milestoneId: from.id });
    const finished = await issue(t, { milestoneId: from.id, assigneeId: t.userIds.viewer });
    await setStatus(t, finished.id, "done");

    await close(t, from.id, null, t.actors.admin);

    expect(await alertsOf(t, "member")).toHaveLength(2);
    expect(await alertsOf(t, "admin")).toHaveLength(0);
    expect(await alertsOf(t, "viewer")).toHaveLength(0);
    expect(await alertsOf(t, "owner")).toHaveLength(0);
  });

  it("moves every open issue, however many", async () => {
    const t = await createTenant("close-many");
    const from = await milestone(t, "Sprint 1");
    const to = await milestone(t, "Sprint 2");
    for (let i = 0; i < 120; i += 1) await issue(t, { milestoneId: from.id, title: `Work ${i}` });

    const result = await close(t, from.id, to.id);

    expect(result.movedIssueIds).toHaveLength(120);
    expect(await progress(t, from.id)).toMatchObject({ total: 0 });
    expect(await progress(t, to.id)).toMatchObject({ total: 120, open: 120 });
  });

  it("closes an empty milestone, moving nothing and alerting nobody", async () => {
    const t = await createTenant("close-empty");
    const m = await milestone(t, "Empty");
    const finished = await issue(t, { milestoneId: m.id, assigneeId: t.userIds.member });
    await setStatus(t, finished.id, "done");
    const closedEvents = capture("milestone.closed");

    const result = await close(t, m.id);

    expect(result.movedIssueIds).toEqual([]);
    expect(closedEvents).toHaveLength(1);
    expect(closedEvents[0]?.movedIssueIds).toEqual([]);
    expect(await alertsOf(t, "member")).toHaveLength(0);
    expect((await issueRepo.findIssueById(t.org.id, finished.id))?.milestoneId).toBe(m.id);
  });

  it("takes the open issues out of any milestone when no target is given", async () => {
    const t = await createTenant("close-null");
    const from = await milestone(t, "Sprint 1");
    const work = await issue(t, { milestoneId: from.id });

    const result = await close(t, from.id, null);

    expect(result.movedIssueIds).toEqual([work.id]);
    expect((await issueRepo.findIssueById(t.org.id, work.id))?.milestoneId).toBeNull();
  });

  it("requires the target to be another open milestone of the same project", async () => {
    const t = await createTenant("close-target");
    const elsewhere = await otherProject(t, "Mobile", "MOB");
    const from = await milestone(t, "Sprint 1");
    const closedTarget = await milestone(t, "Closed target");
    await close(t, closedTarget.id);
    const foreign = await milestone(t, "Mobile launch", { projectId: elsewhere.id });
    const work = await issue(t, { milestoneId: from.id });
    const closedEvents = capture("milestone.closed");

    await expect(close(t, from.id, closedTarget.id)).rejects.toBeInstanceOf(MilestoneStateError);
    await expect(close(t, from.id, foreign.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(close(t, from.id, from.id)).rejects.toBeInstanceOf(NotFoundError);

    expect(closedEvents).toHaveLength(0);
    expect((await milestoneService.getMilestone(t.actors.viewer, t.org.id, from.id)).milestone.closedAt).toBeNull();
    expect((await issueRepo.findIssueById(t.org.id, work.id))?.milestoneId).toBe(from.id);
  });

  it("refuses to close twice or reopen an open milestone, and reopens a closed one", async () => {
    const t = await createTenant("close-twice");
    const m = await milestone(t, "Sprint 1");
    const reopenedEvents = capture("milestone.reopened");

    await expect(milestoneService.reopenMilestone(t.actors.admin, t.org.id, m.id)).rejects.toBeInstanceOf(
      MilestoneStateError,
    );
    await close(t, m.id);
    await expect(close(t, m.id)).rejects.toBeInstanceOf(MilestoneStateError);

    tick();
    const reopened = await milestoneService.reopenMilestone(t.actors.admin, t.org.id, m.id);
    expect(reopened.closedAt).toBeNull();
    expect(reopenedEvents).toHaveLength(1);

    const work = await issue(t, { milestoneId: m.id });
    expect(work.milestoneId).toBe(m.id);

    const audit = await activityService.listActivity(t.actors.admin, {
      orgId: t.org.id,
      action: ["milestone.reopened"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items.map((row) => row.subjectId)).toEqual([m.id]);
  });

  it("is guarded like editing the project", async () => {
    const t = await createTenant("close-guards");
    const other = await createTenant("close-guards-other");
    const m = await milestone(t, "Sprint 1");

    await expect(close(t, m.id, null, t.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      milestoneService.closeMilestone(other.actors.admin, { orgId: t.org.id, milestoneId: m.id, moveOpenIssuesTo: null }),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      milestoneService.closeMilestone(other.actors.admin, { orgId: other.org.id, milestoneId: m.id, moveOpenIssuesTo: null }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(milestoneService.getMilestone(other.actors.admin, other.org.id, m.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listing", () => {
  it("lists open milestones first by target date, undated last, then closed ones", async () => {
    const t = await createTenant("listing");
    const late = await milestone(t, "Late", { targetDate: stamp(clockMs + 30 * DAY) });
    const soon = await milestone(t, "Soon", { targetDate: stamp(clockMs + 3 * DAY) });
    const undated = await milestone(t, "Undated");
    const finished = await milestone(t, "Finished", { targetDate: stamp(clockMs + DAY) });
    await close(t, finished.id);
    const alsoUndated = await milestone(t, "Also undated");

    const listed = await milestoneService.listMilestones(t.actors.viewer, t.org.id, t.project.id);

    expect(listed.map((row) => row.milestone.id)).toEqual([soon.id, late.id, undated.id, alsoUndated.id, finished.id]);
    expect(listed.map((row) => row.milestone.closedAt === null)).toEqual([true, true, true, true, false]);
  });

  it("is readable by anyone who may read the project, in their own workspace only", async () => {
    const t = await createTenant("list-guards");
    const other = await createTenant("list-guards-other");
    await milestone(t, "Visible");

    const listed = await milestoneService.listMilestones(t.actors.viewer, t.org.id, t.project.id);
    expect(listed).toHaveLength(1);

    await expect(milestoneService.listMilestones(other.actors.owner, t.org.id, t.project.id)).rejects.toBeInstanceOf(
      TenantScopeError,
    );
    await expect(milestoneService.listMilestones(t.actors.viewer, t.org.id, other.project.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
