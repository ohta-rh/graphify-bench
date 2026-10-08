/**
 * Hidden test for AFX3-project-lifecycle: keys and addresses stay unique
 * across archived projects, only live projects take plan slots (archiving
 * frees one, restoring takes one and is refused when there is no room, the
 * meter follows at once), restoring a live project is refused, a project's
 * status sticks, paused and completed projects take no new issues, and a
 * project is completed only when none of its issues — however many — is open.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { subscribe } from "@/lib/event-bus";
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
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as commentService from "@/server/services/comment-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import * as usageService from "@/server/services/usage-service";
import type { PlanId } from "@/types/billing";
import type { IssueId, OrgId, ProjectId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project, ProjectStatus } from "@/types/project";

const T0 = new Date("2026-06-15T09:00:00.000Z");
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

async function createTenant(slug: string, plan: PlanId = "free"): Promise<Tenant> {
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

function projectInput(t: Tenant, name: string, key: string, slug?: string) {
  return {
    orgId: t.org.id,
    name,
    slug: slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key,
    description: null,
    visibility: "org" as const,
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  };
}

async function newProject(t: Tenant, name: string, key: string, slug?: string): Promise<Project> {
  tick();
  return projectService.createProject(t.actors.admin, projectInput(t, name, key, slug));
}

async function newIssue(t: Tenant, projectId: ProjectId, title = "Work"): Promise<Issue> {
  tick();
  return issueService.createIssue(t.actors.member, {
    orgId: t.org.id,
    projectId,
    title,
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId: null,
    parentId: null,
    estimate: null,
    dueAt: null,
    labelIds: [],
  });
}

/** Inserts an issue straight into the table, bypassing every service gate. */
async function seedIssue(t: Tenant, projectId: ProjectId, number: number, status: IssueStatus): Promise<Issue> {
  tick();
  const issue = await issueRepo.insertIssue(
    {
      orgId: t.org.id,
      projectId,
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
    t.userIds.member,
    number,
  );
  return status === "backlog" ? issue : issueRepo.setIssueStatus(t.org.id, issue.id, status);
}

async function setStatus(t: Tenant, projectId: ProjectId, status: ProjectStatus): Promise<Project> {
  tick();
  return projectService.updateProject(t.actors.admin, { orgId: t.org.id, projectId, status });
}

async function archive(t: Tenant, projectId: ProjectId, archiveIssues = true): Promise<Project> {
  tick();
  return projectService.archiveProject(t.actors.admin, { orgId: t.org.id, projectId, archiveIssues });
}

async function restore(t: Tenant, projectId: ProjectId): Promise<Project> {
  tick();
  return projectService.restoreProject(t.actors.admin, t.org.id, projectId);
}

async function liveProjects(t: Tenant, status?: ProjectStatus): Promise<readonly Project[]> {
  const page = await projectService.listProjects(t.actors.admin, {
    orgId: t.org.id,
    ...(status === undefined ? {} : { status }),
    limit: 100,
    cursor: null,
  });
  return page.items.map((row) => row.project);
}

async function issueCount(t: Tenant, projectId: ProjectId): Promise<number> {
  return issueRepo.countIssues(t.org.id, projectId, { includeArchived: true });
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-afx3-"));
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

describe("keys and addresses", () => {
  it("gives two projects with the same derived key distinct keys", async () => {
    const t = await createTenant("keys-derived", "growth");
    const visitors = await newProject(t, "Web Visitors", "WV");
    const vendors = await newProject(t, "Web Vendors", "WV");

    expect(visitors.key).toBe("WV");
    expect(vendors.key).toBe("WV2");
    expect(vendors.id).not.toBe(visitors.id);
    expect((await liveProjects(t)).map((p) => p.id)).toEqual(expect.arrayContaining([visitors.id, vendors.id]));
  });

  it("keeps the key of an archived project reserved", async () => {
    const t = await createTenant("keys-archived", "growth");
    const visitors = await newProject(t, "Web Visitors", "WV");
    await archive(t, visitors.id);

    const vendors = await newProject(t, "Web Vendors", "WV");
    expect(vendors.key).toBe("WV2");
  });

  it("makes an explicitly chosen key unique the same way, within four characters", async () => {
    const t = await createTenant("keys-explicit", "growth");
    const again = await newProject(t, "Platform again", "PLAT");
    expect(again.key).toBe("PLA2");
    const third = await newProject(t, "Platform third", "PLAT");
    expect(third.key).toBe("PLA3");
  });

  it("allows the same key in two different workspaces", async () => {
    const a = await createTenant("keys-a", "growth");
    const b = await createTenant("keys-b", "growth");
    const pa = await newProject(a, "Ops", "OPS");
    const pb = await newProject(b, "Ops", "OPS");
    expect(pa.key).toBe("OPS");
    expect(pb.key).toBe("OPS");
  });

  it("keeps the address of an archived project reserved and restores it intact", async () => {
    const t = await createTenant("slug-archived", "growth");
    const first = await newProject(t, "Rollout", "ROL", "rollout");
    await archive(t, first.id);

    const second = await newProject(t, "Rollout", "RLO", "rollout");
    expect(second.slug).not.toBe("rollout");

    const restored = await restore(t, first.id);
    expect(restored.slug).toBe("rollout");
    expect(restored.archivedAt).toBeNull();
    expect((await liveProjects(t)).map((p) => p.id)).toEqual(expect.arrayContaining([first.id, second.id]));
  });
});

describe("plan slots", () => {
  it("frees a slot when a project is archived", async () => {
    const t = await createTenant("slot-free");
    const second = await newProject(t, "Second", "SEC");
    await expect(newProject(t, "Third", "THR")).rejects.toThrow();

    await archive(t, second.id);
    const third = await newProject(t, "Third", "THR");
    expect(third.archivedAt).toBeNull();
    expect((await liveProjects(t)).map((p) => p.id).sort()).toEqual([t.project.id, third.id].sort());
  });

  it("refuses a restore when the plan has no room and announces nothing", async () => {
    const t = await createTenant("slot-full");
    const second = await newProject(t, "Second", "SEC");
    await archive(t, second.id);
    await newProject(t, "Third", "THR");
    const restored = capture("project.restored");

    tick();
    await expect(restore(t, second.id)).rejects.toThrow();

    expect(restored).toHaveLength(0);
    expect((await projectRepo.findProjectById(t.org.id, second.id))?.archivedAt).not.toBeNull();
    expect(await liveProjects(t)).toHaveLength(2);
  });

  it("takes the slot back on restore and moves the meter at once", async () => {
    const t = await createTenant("slot-restore");
    const second = await newProject(t, "Second", "SEC");
    await archive(t, second.id);
    expect((await usageRepo.getUsage(t.org.id)).projectsUsed).toBe(1);

    const restoredEvents = capture("project.restored");
    await restore(t, second.id);

    expect(restoredEvents).toHaveLength(1);
    expect((await usageRepo.getUsage(t.org.id)).projectsUsed).toBe(2);
    expect((await usageService.recomputeUsage(t.org.id)).projectsUsed).toBe(2);
    await expect(newProject(t, "Third", "THR")).rejects.toThrow();
  });

  it("keeps the meter consistent through archive, restore and archive again", async () => {
    const t = await createTenant("slot-cycle");
    const second = await newProject(t, "Second", "SEC");
    await archive(t, second.id);
    await restore(t, second.id);
    await archive(t, second.id);

    expect((await usageRepo.getUsage(t.org.id)).projectsUsed).toBe(1);
    expect((await usageService.recomputeUsage(t.org.id)).projectsUsed).toBe(1);
    expect(await liveProjects(t)).toHaveLength(1);
  });
});

describe("restoring", () => {
  it("refuses to restore a project that is not archived and announces nothing", async () => {
    const t = await createTenant("restore-live");
    const restored = capture("project.restored");

    await expect(restore(t, t.project.id)).rejects.toThrow();

    expect(restored).toHaveLength(0);
    expect((await usageRepo.getUsage(t.org.id)).projectsUsed).toBe(1);
  });

  it("refuses a restore across workspaces", async () => {
    const a = await createTenant("restore-a");
    const b = await createTenant("restore-b");
    await archive(a, a.project.id);

    await expect(
      projectService.restoreProject(b.actors.admin, a.org.id, a.project.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
    expect((await projectRepo.findProjectById(a.org.id, a.project.id))?.archivedAt).not.toBeNull();
  });

  it("brings a project back with its status and leaves its archived issues archived", async () => {
    const t = await createTenant("restore-intact", "growth");
    const project = await newProject(t, "Paused later", "PAU");
    const issue = await newIssue(t, project.id);
    await setStatus(t, project.id, "paused");
    await archive(t, project.id, true);

    const restored = await restore(t, project.id);

    expect(restored.status).toBe("paused");
    expect((await issueRepo.findIssueById(t.org.id, issue.id))?.archivedAt).not.toBeNull();
  });
});

describe("status", () => {
  it("keeps the status that was saved and shows it in the status filter", async () => {
    const t = await createTenant("status-sticks", "growth");
    const project = await newProject(t, "Pausable", "PSE");

    const paused = await setStatus(t, project.id, "paused");
    expect(paused.status).toBe("paused");
    expect((await projectRepo.findProjectById(t.org.id, project.id))?.status).toBe("paused");
    expect((await liveProjects(t, "paused")).map((p) => p.id)).toEqual([project.id]);
    expect((await liveProjects(t, "active")).map((p) => p.id)).toEqual([t.project.id]);

    const completed = await setStatus(t, project.id, "completed");
    expect(completed.status).toBe("completed");
    expect((await liveProjects(t, "completed")).map((p) => p.id)).toEqual([project.id]);
  });

  it("takes no new issues while paused, but existing issues stay workable", async () => {
    const t = await createTenant("status-paused", "growth");
    const project = await newProject(t, "On hold", "HLD");
    const existing = await newIssue(t, project.id);
    await setStatus(t, project.id, "paused");
    const created = capture("issue.created");

    await expect(newIssue(t, project.id, "Not now")).rejects.toThrow();
    expect(created).toHaveLength(0);
    expect(await issueCount(t, project.id)).toBe(1);

    tick();
    const moved = await issueService.changeIssueStatus(t.actors.member, {
      orgId: t.org.id,
      issueId: existing.id,
      status: "in_progress",
    });
    expect(moved.status).toBe("in_progress");
    tick();
    await expect(
      commentService.createComment(t.actors.member, {
        orgId: t.org.id,
        issueId: existing.id,
        body: "Still discussing while paused",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).resolves.toMatchObject({ issueId: existing.id });
  });

  it("takes no new issues while completed and takes them again once reactivated", async () => {
    const t = await createTenant("status-completed", "growth");
    const project = await newProject(t, "Done deal", "DDL");
    await setStatus(t, project.id, "completed");

    await expect(newIssue(t, project.id)).rejects.toThrow();
    expect(await issueCount(t, project.id)).toBe(0);

    await setStatus(t, project.id, "active");
    const issue = await newIssue(t, project.id);
    expect(issue.projectId).toBe(project.id);
  });

  it("refuses to complete a project with an open issue and leaves it active", async () => {
    const t = await createTenant("complete-open", "growth");
    const project = await newProject(t, "Nearly", "NRL");
    const open = await newIssue(t, project.id, "Still open");

    await expect(setStatus(t, project.id, "completed")).rejects.toThrow();
    expect((await projectRepo.findProjectById(t.org.id, project.id))?.status).toBe("active");

    tick();
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: open.id, status: "done" });
    const completed = await setStatus(t, project.id, "completed");
    expect(completed.status).toBe("completed");
  });

  it("treats canceled and archived issues as not open", async () => {
    const t = await createTenant("complete-closed", "growth");
    const project = await newProject(t, "Wrapping", "WRP");
    const canceled = await newIssue(t, project.id, "Dropped");
    const archived = await newIssue(t, project.id, "Shelved");
    tick();
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: canceled.id, status: "canceled" });
    tick();
    await issueService.archiveIssue(t.actors.member, t.org.id, archived.id);

    const completed = await setStatus(t, project.id, "completed");
    expect(completed.status).toBe("completed");
  });

  it("sees an open issue beyond the first hundred when completing", async () => {
    const t = await createTenant("complete-large", "growth");
    const project = await newProject(t, "Long haul", "LNG");
    const open = await seedIssue(t, project.id, 1, "backlog");
    for (let number = 2; number <= 121; number += 1) {
      await seedIssue(t, project.id, number, "done");
    }

    await expect(setStatus(t, project.id, "completed")).rejects.toThrow();
    expect((await projectRepo.findProjectById(t.org.id, project.id))?.status).toBe("active");

    tick();
    await issueRepo.setIssueStatus(t.org.id, open.id, "done");
    const completed = await setStatus(t, project.id, "completed");
    expect(completed.status).toBe("completed");
  });

  it("can always be paused, open issues or not, and completed again when already completed", async () => {
    const t = await createTenant("pause-any", "growth");
    const project = await newProject(t, "Busy", "BSY");
    await newIssue(t, project.id, "Open work");

    const paused = await setStatus(t, project.id, "paused");
    expect(paused.status).toBe("paused");

    const empty = await newProject(t, "Empty", "EMP");
    await setStatus(t, empty.id, "completed");
    const again = await setStatus(t, empty.id, "completed");
    expect(again.status).toBe("completed");
  });

  it("cannot change the status of an archived project", async () => {
    const t = await createTenant("status-archived", "growth");
    const project = await newProject(t, "Gone", "GNE");
    await archive(t, project.id);

    await expect(setStatus(t, project.id, "paused")).rejects.toBeInstanceOf(AlreadyArchivedError);
  });

  it("lets only those who may edit the project change its status", async () => {
    const t = await createTenant("status-perms", "growth");
    const project = await newProject(t, "Guarded", "GRD");

    await expect(
      projectService.updateProject(t.actors.viewer, { orgId: t.org.id, projectId: project.id, status: "paused" }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect((await projectRepo.findProjectById(t.org.id, project.id))?.status).toBe("active");
  });
});
