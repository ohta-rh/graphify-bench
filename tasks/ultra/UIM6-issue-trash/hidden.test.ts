/**
 * UIM6 — archived issues sit in a trash: restorable for the plan's retention
 * period, then purged for good by the retention sweep.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { toAppError } from "@/lib/errors";
import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { RestoreRefusedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { runCleanupArchivedJob } from "@/server/jobs/cleanup-archived-job";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as attachmentRepo from "@/server/repositories/attachment-repository";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { NotFoundError } from "@/server/services/_support";
import { registerActivityListeners } from "@/server/services/activity-service";
import * as attachmentService from "@/server/services/attachment-service";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { registerSearchListeners } from "@/server/services/search-service";
import { registerUsageListeners } from "@/server/services/usage-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { PlanId } from "@/types/billing";
import type { IssueId } from "@/types/common";
import type { TaskflowEventMap, Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";

let cleanup: () => void;
const listeners: Unsubscribe[] = [];
const detachers: Unsubscribe[] = [];

const MB = 1024 * 1024;

async function makeTenant(slug: string, plan: PlanId): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function at<T>(instant: string, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

function create(tenant: Tenant, actor: Actor, title: string, assigneeId: Issue["assigneeId"] = null) {
  return issueService.createIssue(
    actor,
    issueInput(tenant.org.id, tenant.project.id, { title, assigneeId }),
  );
}

function archive(tenant: Tenant, actor: Actor, issue: Issue) {
  return issueService.archiveIssue(actor, tenant.org.id, issue.id);
}

function restore(tenant: Tenant, actor: Actor, issue: Issue) {
  return issueService.restoreIssue(actor, tenant.org.id, issue.id);
}

async function refusal(promise: Promise<unknown>): Promise<RestoreRefusedError> {
  const error = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(RestoreRefusedError);
  return error as RestoreRefusedError;
}

function captureRestored(): TaskflowEventMap["issue.restored"][] {
  const seen: TaskflowEventMap["issue.restored"][] = [];
  detachers.push(
    subscribe("issue.restored", (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function allIssueIds(tenant: Tenant): Promise<string[]> {
  const page = await issueRepo.listIssues({
    orgId: tenant.org.id,
    limit: 100,
    cursor: null,
    includeArchived: true,
  });
  return page.items.map((issue) => issue.id);
}

async function bulkInsert(tenant: Tenant, count: number, prefix: string): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
    await issueRepo.insertIssue(
      issueInput(tenant.org.id, tenant.project.id, { title: `${prefix} ${i}` }),
      tenant.userIds.owner,
      number,
    );
  }
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  listeners.push(registerUsageListeners(), registerSearchListeners(), registerActivityListeners());
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.useRealTimers();
});

afterAll(() => {
  while (listeners.length > 0) listeners.pop()?.();
  cleanup();
});

describe("UIM6 trash: restore window and purge", () => {
  it("restores an archived issue with its number and tells every listener", async () => {
    const tenant = await makeTenant("uim6-restore", "growth");
    const member = tenant.actors.member;
    const issue = await create(tenant, member, "Printer on fire");
    await create(tenant, member, "Keep me live");
    await archive(tenant, member, issue);
    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(1);

    const seen = captureRestored();
    const restored = await restore(tenant, member, issue);

    expect(restored.id).toBe(issue.id);
    expect(restored.number).toBe(issue.number);
    expect(restored.archivedAt).toBeNull();
    expect((await issueRepo.findIssueById(tenant.org.id, issue.id))?.archivedAt).toBeNull();

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: member.userId,
      issueId: issue.id,
      projectId: issue.projectId,
    });

    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(2);
    expect((await usageRepo.recomputeUsage(tenant.org.id)).issuesUsed).toBe(2);

    const hits = await searchRepo.searchDocuments({
      orgId: tenant.org.id,
      q: "Printer on fire",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(hits.items.map((row) => row.subjectId)).toEqual([issue.id]);

    const history = await activityRepo.listActivityForSubject(tenant.org.id, "issue", issue.id);
    expect(history.map((event) => event.action)).toContain("issue.restored");
  });

  it("lets whoever may archive the issue restore it", async () => {
    const tenant = await makeTenant("uim6-permission", "growth");
    const stranger = await makeTenant("uim6-permission-other", "growth");

    const assigned = await create(tenant, tenant.actors.admin, "Assigned to the viewer", tenant.userIds.viewer);
    const unrelated = await create(tenant, tenant.actors.admin, "Nothing to do with the viewer");
    await archive(tenant, tenant.actors.admin, assigned);
    await archive(tenant, tenant.actors.admin, unrelated);

    // Ownership escalation: the assignee may restore even as a viewer.
    await expect(restore(tenant, tenant.actors.viewer, assigned)).resolves.toMatchObject({ archivedAt: null });

    await expect(restore(tenant, tenant.actors.viewer, unrelated)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      issueService.restoreIssue(stranger.actors.owner, tenant.org.id, unrelated.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      issueService.restoreIssue(tenant.actors.owner, tenant.org.id, "01JZZZZZZZZZZZZZZZZZZZZZZZ" as IssueId),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await issueRepo.findIssueById(tenant.org.id, unrelated.id))?.archivedAt).not.toBeNull();

    await expect(restore(tenant, tenant.actors.member, unrelated)).resolves.toMatchObject({ archivedAt: null });
  });

  it("refuses to restore a live issue or one whose project is archived", async () => {
    const tenant = await makeTenant("uim6-refusals", "growth");
    const admin = tenant.actors.admin;
    const live = await create(tenant, admin, "Never archived");

    const liveRefusal = await refusal(restore(tenant, admin, live));
    expect(liveRefusal.reason).toBe("not_archived");
    expect(toAppError(liveRefusal).code).toBe("conflict");

    const side = await projectService.createProject(admin, {
      orgId: tenant.org.id,
      name: "Side project",
      slug: "side",
      key: "SIDE",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
    const cascaded = await issueService.createIssue(
      admin,
      issueInput(tenant.org.id, side.id, { title: "Archived with its project" }),
    );
    await projectService.archiveProject(admin, {
      orgId: tenant.org.id,
      projectId: side.id,
      archiveIssues: true,
    });
    const usageBefore = (await usageRepo.getUsage(tenant.org.id)).issuesUsed;

    const seen = captureRestored();
    const projectRefusal = await refusal(restore(tenant, admin, cascaded));
    expect(projectRefusal.reason).toBe("project_archived");
    expect(toAppError(projectRefusal).code).toBe("conflict");

    expect(seen).toHaveLength(0);
    expect((await issueRepo.findIssueById(tenant.org.id, cascaded.id))?.archivedAt).not.toBeNull();
    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(usageBefore);
  });

  it("closes the restore window when the plan's retention period has passed", async () => {
    const tenant = await makeTenant("uim6-window", "free");
    const member = tenant.actors.member;
    const early = await create(tenant, member, "Restored in time");
    const late = await create(tenant, member, "Restored too late");

    await at("2026-01-01T00:00:00.000Z", async () => {
      await archive(tenant, member, early);
      await archive(tenant, member, late);
    });

    // Free plan: 30 days.
    await at("2026-01-30T12:00:00.000Z", async () => {
      await expect(restore(tenant, member, early)).resolves.toMatchObject({ archivedAt: null });
    });

    const seen = captureRestored();
    await at("2026-01-31T12:00:00.000Z", async () => {
      const expired = await refusal(restore(tenant, member, late));
      expect(expired.reason).toBe("expired");
    });
    expect(seen).toHaveLength(0);
    // Refused although the sweep has not removed it yet.
    expect((await issueRepo.findIssueById(tenant.org.id, late.id))?.archivedAt).not.toBeNull();
  });

  it("counts a restored issue against the per-project issue quota", async () => {
    const tenant = await makeTenant("uim6-quota", "free");
    const member = tenant.actors.member;
    const first = await create(tenant, member, "First in the trash");
    const second = await create(tenant, member, "Second in the trash");
    await archive(tenant, member, first);
    await archive(tenant, member, second);

    // Free plan: 100 issues per project; 99 live ones leave room for one.
    await bulkInsert(tenant, 99, "Filler");

    await expect(restore(tenant, member, first)).resolves.toMatchObject({ archivedAt: null });

    const full = await refusal(restore(tenant, member, second));
    expect(full.reason).toBe("quota");
    expect(await issueRepo.countIssues(tenant.org.id, tenant.project.id)).toBe(100);
  });

  it("purges an expired issue together with its comments and attachments", async () => {
    const tenant = await makeTenant("uim6-purge", "free");
    const member = tenant.actors.member;

    const { doomed, kept, live, commentId } = await at("2026-02-01T00:00:00.000Z", async () => {
      const doomed = await create(tenant, member, "Doomed issue");
      const kept = await create(tenant, member, "Archived recently");
      const live = await create(tenant, member, "Still live");
      const comment = await commentService.createComment(member, {
        orgId: tenant.org.id,
        issueId: doomed.id,
        body: "uim6 zebra comment",
        parentId: null,
        mentionedUserIds: [],
      });
      await archive(tenant, member, doomed);
      return { doomed, kept, live, commentId: comment.id };
    });
    await at("2026-02-21T00:00:00.000Z", () => archive(tenant, member, kept));

    await runCleanupArchivedJob(new Date("2026-03-13T00:00:00.000Z"));

    expect(await issueRepo.findIssueById(tenant.org.id, doomed.id)).toBeNull();
    const remaining = await allIssueIds(tenant);
    expect(remaining).not.toContain(doomed.id);
    expect(remaining).toEqual(expect.arrayContaining([kept.id, live.id]));

    expect(await commentRepo.findCommentById(tenant.org.id, commentId)).toBeNull();
    const commentHits = await searchRepo.searchDocuments({
      orgId: tenant.org.id,
      q: "uim6 zebra comment",
      kinds: ["comment"],
      limit: 25,
      cursor: null,
    });
    expect(commentHits.total).toBe(0);

    await expect(restore(tenant, member, doomed)).rejects.toBeInstanceOf(NotFoundError);

    // Archived 20 days before the sweep: still in the trash, still restorable.
    await at("2026-03-13T00:00:00.000Z", async () => {
      await expect(restore(tenant, member, kept)).resolves.toMatchObject({ archivedAt: null });
    });

    await runCleanupArchivedJob(new Date("2026-03-13T01:00:00.000Z"));
    expect(await allIssueIds(tenant)).toEqual(expect.arrayContaining([kept.id, live.id]));
  });

  it("gives a purged issue's storage back to the quota", async () => {
    const tenant = await makeTenant("uim6-storage", "free");
    const member = tenant.actors.member;

    const doomed = await at("2026-02-01T00:00:00.000Z", async () => {
      const doomed = await create(tenant, member, "Has big attachments");
      const live = await create(tenant, member, "Has a small attachment");
      await attachmentService.addAttachment(member, {
        orgId: tenant.org.id,
        issueId: doomed.id,
        filename: "scan.pdf",
        contentType: "application/pdf",
        sizeBytes: Math.round(2.5 * MB),
      });
      await attachmentService.addAttachment(member, {
        orgId: tenant.org.id,
        issueId: doomed.id,
        filename: "notes.txt",
        contentType: "text/plain",
        sizeBytes: 10,
      });
      await attachmentService.addAttachment(member, {
        orgId: tenant.org.id,
        issueId: live.id,
        filename: "logo.png",
        contentType: "image/png",
        sizeBytes: MB,
      });
      await archive(tenant, member, doomed);
      return doomed;
    });
    expect((await usageRepo.getUsage(tenant.org.id)).storageMbUsed).toBe(5);

    await runCleanupArchivedJob(new Date("2026-03-13T00:00:00.000Z"));

    expect(await attachmentRepo.listAttachments(tenant.org.id, doomed.id)).toEqual([]);
    expect(await attachmentRepo.sumStorageBytes(tenant.org.id)).toBe(MB);
    expect((await usageRepo.getUsage(tenant.org.id)).storageMbUsed).toBe(1);
    expect((await usageRepo.recomputeUsage(tenant.org.id)).storageMbUsed).toBe(1);
  });

  it("finds every expired issue, however many newer issues the workspace has", async () => {
    const tenant = await makeTenant("uim6-paging", "free");
    const old = await at("2026-02-01T00:00:00.000Z", async () => {
      const old = await create(tenant, tenant.actors.member, "Old and archived");
      await archive(tenant, tenant.actors.member, old);
      return old;
    });
    await at("2026-02-02T00:00:00.000Z", () => bulkInsert(tenant, 105, "Newer"));

    await runCleanupArchivedJob(new Date("2026-03-15T00:00:00.000Z"));

    expect(await issueRepo.findIssueById(tenant.org.id, old.id)).toBeNull();
    expect(await issueRepo.countIssues(tenant.org.id, tenant.project.id)).toBe(105);
  });

  it("never hands out a purged issue's number again", async () => {
    const tenant = await makeTenant("uim6-numbers", "free");
    const member = tenant.actors.member;

    const third = await at("2026-02-01T00:00:00.000Z", async () => {
      await create(tenant, member, "Number one");
      await create(tenant, member, "Number two");
      const third = await create(tenant, member, "Number three");
      await archive(tenant, member, third);
      return third;
    });
    expect(third.number).toBe(3);

    await runCleanupArchivedJob(new Date("2026-03-13T00:00:00.000Z"));
    expect(await issueRepo.findIssueById(tenant.org.id, third.id)).toBeNull();

    const next = await create(tenant, member, "After the purge");
    expect(next.number).toBe(4);
    const after = await create(tenant, member, "And another");
    expect(after.number).toBe(5);
  });

  it("purges by each workspace's own retention period", async () => {
    const free = await makeTenant("uim6-retention-free", "free");
    const growth = await makeTenant("uim6-retention-growth", "growth");

    const [freeIssue, growthIssue] = await at("2026-02-01T00:00:00.000Z", async () => {
      const a = await create(free, free.actors.member, "Free plan trash");
      const b = await create(growth, growth.actors.member, "Growth plan trash");
      await archive(free, free.actors.member, a);
      await archive(growth, growth.actors.member, b);
      return [a, b] as const;
    });

    await runCleanupArchivedJob(new Date("2026-03-13T00:00:00.000Z"));

    expect(await issueRepo.findIssueById(free.org.id, freeIssue.id)).toBeNull();
    expect(await issueRepo.findIssueById(growth.org.id, growthIssue.id)).not.toBeNull();
    await at("2026-03-13T00:00:00.000Z", async () => {
      await expect(restore(growth, growth.actors.member, growthIssue)).resolves.toMatchObject({
        archivedAt: null,
      });
    });
  });
});
