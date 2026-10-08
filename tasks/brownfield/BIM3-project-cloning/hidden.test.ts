/**
 * BIM3 — cloning a project.
 *
 * A clone is a new project with the chosen name/slug/key and the source's
 * description, visibility, colour and lead; a fresh-start copy of every live
 * issue, numbered from 1 in source order; gated like a creation, as a batch;
 * one `project.cloned`, indexed and metered directly.
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
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import { listActivity, registerActivityListeners } from "@/server/services/activity-service";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { search } from "@/server/services/search-service";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, LabelId, ProjectId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

type Tenant = {
  org: Organization;
  platform: Project;
  actors: Record<Role, Actor>;
  userIds: Record<Role, UserId>;
};

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];
const UNKNOWN_PROJECT = "01HZZZRRRRRRRRRRRRRRRRRRRR" as ProjectId;

let dir: string;
let detachActivity: Unsubscribe;
const detachers: Unsubscribe[] = [];

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bim3-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  detachActivity = registerActivityListeners();
});

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  detachActivity();
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

  const platform = await projectRepo.insertProject({
    orgId: org.id,
    name: "Platform",
    slug: "platform",
    key: "PLAT",
    description: "The platform work",
    visibility: "org",
    leadId: userIds.admin ?? owner.id,
    color: "#0ea5e9",
    targetDate: "2026-12-31T00:00:00.000Z" as IsoTimestamp,
  });
  await usageRepo.recomputeUsage(org.id);

  return { org, platform, actors: actors as Record<Role, Actor>, userIds: userIds as Record<Role, UserId> };
}

async function addIssue(
  tenant: Tenant,
  title: string,
  overrides: Partial<{ by: Actor; status: IssueStatus; assigneeId: UserId | null; labelIds: readonly LabelId[]; dueAt: string | null; description: string | null }> = {},
): Promise<Issue> {
  return issueService.createIssue(overrides.by ?? tenant.actors.member, {
    orgId: tenant.org.id,
    projectId: tenant.platform.id,
    title,
    description: overrides.description ?? null,
    status: overrides.status ?? "backlog",
    priority: "high",
    assigneeId: overrides.assigneeId ?? null,
    parentId: null,
    estimate: 5,
    dueAt: (overrides.dueAt ?? null) as IsoTimestamp | null,
    labelIds: [...(overrides.labelIds ?? [])],
  });
}

async function clone(
  tenant: Tenant,
  actor: Actor,
  overrides: Partial<{ name: string; slug: string; key: string; includeIssues: boolean; projectId: ProjectId }> = {},
): Promise<Project> {
  return projectService.cloneProject(actor, {
    orgId: tenant.org.id,
    projectId: overrides.projectId ?? tenant.platform.id,
    name: overrides.name ?? "Platform (copy)",
    slug: overrides.slug ?? "platform-copy",
    key: overrides.key ?? "PLC",
    includeIssues: overrides.includeIssues ?? true,
  });
}

async function issuesOf(tenant: Tenant, project: Project): Promise<Issue[]> {
  const out: Issue[] = [];
  let cursor: string | null = null;
  do {
    const page = await issueRepo.listIssues({
      orgId: tenant.org.id,
      projectId: project.id,
      includeArchived: true,
      limit: 100,
      cursor,
    });
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return out.sort((a, b) => a.number - b.number);
}

async function projectCount(tenant: Tenant): Promise<number> {
  return projectRepo.countProjects(tenant.org.id, { includeArchived: true });
}

describe("BIM3 cloning a project", () => {
  it("creates a new project from the source's description, visibility, colour and lead, with the chosen name, slug and key", async () => {
    const tenant = await makeTenant("bim3-project");

    const copy = await clone(tenant, tenant.actors.member, { name: "Platform 2027", slug: "platform-2027", key: "P27" });

    expect(copy.id).not.toBe(tenant.platform.id);
    expect(copy.orgId).toBe(tenant.org.id);
    expect(copy).toMatchObject({
      name: "Platform 2027",
      slug: "platform-2027",
      key: "P27",
      description: "The platform work",
      visibility: "org",
      color: "#0ea5e9",
      leadId: tenant.userIds.admin,
      status: "active",
      startsAt: null,
      targetDate: null,
      archivedAt: null,
    });
    const stored = await projectRepo.findProjectById(tenant.org.id, copy.id);
    expect(stored?.slug).toBe("platform-2027");
    expect(await projectCount(tenant)).toBe(2);
  });

  it("copies every live issue as a fresh start, numbered from 1 in source order", async () => {
    const tenant = await makeTenant("bim3-issues");
    await orgRepo.updateOrg(tenant.org.id, { orgId: tenant.org.id, settings: { defaultIssueStatus: "todo" } });
    const bug = await labelRepo.insertLabel({ orgId: tenant.org.id, name: "bug", color: "#ef4444", description: null });
    const first = await addIssue(tenant, "first", { status: "done", assigneeId: tenant.userIds.viewer, labelIds: [bug.id], description: "see PLAT-2", dueAt: "2026-07-01T00:00:00.000Z" });
    const second = await addIssue(tenant, "second", { status: "in_progress", assigneeId: tenant.userIds.member, by: tenant.actors.admin });
    const third = await addIssue(tenant, "third", { status: "backlog" });
    await commentService.createComment(tenant.actors.member, { orgId: tenant.org.id, issueId: first.id, body: "a conversation", parentId: null, mentionedUserIds: [] });
    await issueService.changeIssueStatus(tenant.actors.member, { orgId: tenant.org.id, issueId: third.id, status: "in_progress" });
    expect([first.number, second.number, third.number]).toEqual([1, 2, 3]);

    const copy = await clone(tenant, tenant.actors.owner);
    const copies = await issuesOf(tenant, copy);

    expect(copies.map((issue) => issue.number)).toEqual([1, 2, 3]);
    expect(copies.map((issue) => issue.title)).toEqual(["first", "second", "third"]);
    for (const issue of copies) {
      expect(issue.status).toBe("todo");
      expect(issue.assigneeId).toBeNull();
      expect(issue.authorId).toBe(tenant.userIds.owner);
      expect(issue.startedAt).toBeNull();
      expect(issue.completedAt).toBeNull();
      expect(issue.parentId).toBeNull();
      expect(issue.archivedAt).toBeNull();
      expect(issue.projectId).toBe(copy.id);
      expect(issue.priority).toBe("high");
      expect(issue.estimate).toBe(5);
      expect(await commentRepo.countComments(tenant.org.id, issue.id)).toBe(0);
    }
    expect(copies[0]?.description).toBe("see PLAT-2");
    expect(copies[0]?.dueAt).toBe("2026-07-01T00:00:00.000Z");
    expect(copies[0]?.labelIds).toEqual([bug.id]);
    expect(copies[1]?.labelIds).toEqual([]);

    // The source is untouched.
    const originals = await issuesOf(tenant, tenant.platform);
    expect(originals.map((issue) => [issue.number, issue.status, issue.assigneeId])).toEqual([
      [1, "done", tenant.userIds.viewer],
      [2, "in_progress", tenant.userIds.member],
      [3, "in_progress", null],
    ]);
  });

  it("leaves archived issues out and continues the clone's numbering after the copies", async () => {
    const tenant = await makeTenant("bim3-archived");
    await addIssue(tenant, "keep one");
    const gone = await addIssue(tenant, "archived one");
    await addIssue(tenant, "keep two");
    await issueService.archiveIssue(tenant.actors.member, tenant.org.id, gone.id);

    const copy = await clone(tenant, tenant.actors.member);
    const copies = await issuesOf(tenant, copy);
    expect(copies.map((issue) => [issue.number, issue.title])).toEqual([
      [1, "keep one"],
      [2, "keep two"],
    ]);

    const next = await issueService.createIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      projectId: copy.id,
      title: "new in the clone",
      description: null,
      status: "backlog",
      priority: "none",
      assigneeId: null,
      parentId: null,
      estimate: null,
      dueAt: null,
      labelIds: [],
    });
    expect(next.number).toBe(3);
  });

  it("copies only the project when issues are not included", async () => {
    const tenant = await makeTenant("bim3-no-issues");
    await addIssue(tenant, "stays in the source");

    const copy = await clone(tenant, tenant.actors.member, { includeIssues: false });

    expect(await issuesOf(tenant, copy)).toEqual([]);
    expect(await issueRepo.countIssues(tenant.org.id, tenant.platform.id)).toBe(1);
  });

  it("publishes one project.cloned and no creations, and records one audit entry under the clone", async () => {
    const tenant = await makeTenant("bim3-announce");
    await addIssue(tenant, "one");
    await addIssue(tenant, "two");
    const cloned = capture("project.cloned");
    const projectCreated = capture("project.created");
    const issueCreated = capture("issue.created");

    const copy = await clone(tenant, tenant.actors.admin);

    expect(cloned).toHaveLength(1);
    expect(cloned[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.admin,
      projectId: copy.id,
      sourceProjectId: tenant.platform.id,
      issuesCopied: 2,
    });
    expect(projectCreated).toHaveLength(0);
    expect(issueCreated).toHaveLength(0);

    const rows = await listActivity(tenant.actors.owner, { orgId: tenant.org.id, action: ["project.cloned"], limit: 25, cursor: null });
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0]).toMatchObject({
      actorId: tenant.userIds.admin,
      subjectKind: "project",
      subjectId: copy.id,
      projectId: copy.id,
    });
    expect(rows.items[0]?.metadata).toMatchObject({ sourceProjectId: tenant.platform.id, issuesCopied: 2 });
    const perIssue = await listActivity(tenant.actors.owner, { orgId: tenant.org.id, projectId: copy.id, limit: 25, cursor: null });
    expect(perIssue.items.map((row) => row.action)).toEqual(["project.cloned"]);
    expect(activityFilterSchema.safeParse({ orgId: tenant.org.id, action: ["project.cloned"], limit: 25, cursor: null }).success).toBe(true);
  });

  it("needs the right to read the source and to create a project", async () => {
    const tenant = await makeTenant("bim3-permission");
    const cloned = capture("project.cloned");

    await expect(clone(tenant, tenant.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(cloned).toHaveLength(0);
    expect(await projectCount(tenant)).toBe(1);

    await expect(clone(tenant, tenant.actors.member)).resolves.toMatchObject({ key: "PLC" });
    expect(cloned).toHaveLength(1);
  });

  it("guards tenant scope and existence", async () => {
    const tenant = await makeTenant("bim3-guards");
    const stranger = await makeTenant("bim3-guards-other");
    const cloned = capture("project.cloned");

    await expect(clone(tenant, stranger.actors.owner)).rejects.toBeInstanceOf(TenantScopeError);
    await expect(clone(tenant, tenant.actors.owner, { projectId: UNKNOWN_PROJECT })).rejects.toBeInstanceOf(NotFoundError);
    await expect(clone(tenant, tenant.actors.owner, { projectId: stranger.platform.id })).rejects.toBeInstanceOf(NotFoundError);

    expect(cloned).toHaveLength(0);
    expect(await projectCount(tenant)).toBe(1);
    expect(await projectCount(stranger)).toBe(1);
  });

  it("refuses to clone an archived project", async () => {
    const tenant = await makeTenant("bim3-source-archived");
    await addIssue(tenant, "one");
    await projectService.archiveProject(tenant.actors.admin, { orgId: tenant.org.id, projectId: tenant.platform.id, archiveIssues: false });
    const cloned = capture("project.cloned");

    await expect(clone(tenant, tenant.actors.owner)).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(cloned).toHaveLength(0);
    expect(await projectCount(tenant)).toBe(1);
  });

  it("applies the plan's project quota like a creation", async () => {
    const tenant = await makeTenant("bim3-project-quota", "free");
    await projectService.createProject(tenant.actors.owner, {
      orgId: tenant.org.id,
      name: "Second",
      slug: "second",
      key: "SEC",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
    const cloned = capture("project.cloned");

    await expect(clone(tenant, tenant.actors.owner)).rejects.toThrow();
    expect(cloned).toHaveLength(0);
    expect(await projectCount(tenant)).toBe(2);
  });

  it("refuses the whole clone when the copies would not fit the per-project issue quota, writing nothing", async () => {
    const tenant = await makeTenant("bim3-issue-quota", "free");
    for (let number = 1; number <= 120; number += 1) {
      await issueRepo.insertIssue(
        {
          orgId: tenant.org.id,
          projectId: tenant.platform.id,
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
    const cloned = capture("project.cloned");
    const usageBefore = await usageRepo.recomputeUsage(tenant.org.id);

    await expect(clone(tenant, tenant.actors.owner)).rejects.toThrow();

    expect(cloned).toHaveLength(0);
    expect(await projectCount(tenant)).toBe(1);
    expect(await projectRepo.findProjectBySlug(tenant.org.id, "platform-copy")).toBeNull();
    const usageAfter = await usageRepo.recomputeUsage(tenant.org.id);
    expect(usageAfter.issuesUsed).toBe(usageBefore.issuesUsed);

    // Without the issues the clone fits.
    const copy = await clone(tenant, tenant.actors.owner, { includeIssues: false });
    expect(copy.key).toBe("PLC");
  });

  it("copies every live issue, however many, in source order", async () => {
    const tenant = await makeTenant("bim3-scale");
    for (let number = 1; number <= 150; number += 1) {
      await issueRepo.insertIssue(
        {
          orgId: tenant.org.id,
          projectId: tenant.platform.id,
          title: `Bulk ${number}`,
          description: null,
          status: "todo",
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

    const copy = await clone(tenant, tenant.actors.owner);
    const copies = await issuesOf(tenant, copy);

    expect(copies).toHaveLength(150);
    expect(copies.map((issue) => issue.number)).toEqual(Array.from({ length: 150 }, (_, i) => i + 1));
    expect(copies.map((issue) => issue.title)).toEqual(Array.from({ length: 150 }, (_, i) => `Bulk ${i + 1}`));
    expect(await issueRepo.countIssues(tenant.org.id, copy.id)).toBe(150);
  });

  it("makes the clone and its issues searchable at once", async () => {
    const tenant = await makeTenant("bim3-search");
    await addIssue(tenant, "Zephyr rollout");

    const copy = await clone(tenant, tenant.actors.member, { name: "Zephyr copy" });

    const issues = await search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zephyr",
      kinds: ["issue"],
      projectId: copy.id,
      limit: 25,
      cursor: null,
    });
    expect(issues.total).toBe(1);
    expect(issues.items[0]?.kind).toBe("issue");
    const copies = await issuesOf(tenant, copy);
    expect(issues.items[0]?.id).toBe(copies[0]?.id);

    const projects = await search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zephyr copy",
      kinds: ["project"],
      limit: 25,
      cursor: null,
    });
    expect(projects.items.map((hit) => hit.id)).toEqual([copy.id]);
  });

  it("reflects the clone in the workspace's project and issue meters at once", async () => {
    const tenant = await makeTenant("bim3-meter");
    await addIssue(tenant, "one");
    await addIssue(tenant, "two");
    const before = await usageRepo.recomputeUsage(tenant.org.id);
    expect(before).toMatchObject({ projectsUsed: 1, issuesUsed: 2 });

    await clone(tenant, tenant.actors.member);

    const usage = await usageRepo.getUsage(tenant.org.id);
    expect(usage.projectsUsed).toBe(2);
    expect(usage.issuesUsed).toBe(4);
    const recount = await usageRepo.recomputeUsage(tenant.org.id);
    expect(recount).toMatchObject({ projectsUsed: 2, issuesUsed: 4 });
  });

  it("treats the chosen slug like a created project's: suffixed when taken", async () => {
    const tenant = await makeTenant("bim3-slug");

    const copy = await clone(tenant, tenant.actors.member, { slug: "platform", key: "PL2" });

    expect(copy.slug).toBe("platform-2");
    expect((await projectRepo.findProjectBySlug(tenant.org.id, "platform"))?.id).toBe(tenant.platform.id);
  });

  it("copies a project without a lead and keeps the source's visibility", async () => {
    const tenant = await makeTenant("bim3-lead");
    const privateProject = await projectRepo.insertProject({
      orgId: tenant.org.id,
      name: "Secret",
      slug: "secret",
      key: "SEC",
      description: null,
      visibility: "private",
      leadId: null,
      color: "#111111",
      targetDate: null,
    });

    const copy = await clone(tenant, tenant.actors.owner, { projectId: privateProject.id, name: "Secret copy", slug: "secret-copy", key: "SC2" });

    expect(copy.leadId).toBeNull();
    expect(copy.visibility).toBe("private");
    expect(copy.color).toBe("#111111");
    expect(copy.description).toBeNull();
  });
});
