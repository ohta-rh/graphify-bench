/**
 * EIM5 — a workspace that is not in good standing is read-only.
 *
 * The lock is derived from the subscription row at the moment of the write:
 * past due, canceled once the cancellation date has arrived, or a trial that
 * has run out. Billing, reads, notification housekeeping and background jobs
 * keep working; every user write is refused after its permission check.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { eq } from "drizzle-orm";
import { WorkspaceLockedError, lockReasonFor } from "@/lib/billing-lock";
import { HTTP_STATUS_BY_CODE, isDomainError, toAppError } from "@/lib/errors";
import { subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { getDb, subscriptions } from "@/server/db";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import { runTrialExpiryJob } from "@/server/jobs/trial-expiry-job";
import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { record } from "@/server/services/activity-service";
import * as attachmentService from "@/server/services/attachment-service";
import * as billingService from "@/server/services/billing-service";
import * as commentService from "@/server/services/comment-service";
import * as emailService from "@/server/services/email-service";
import * as featureFlagService from "@/server/services/feature-flag-service";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as labelService from "@/server/services/label-service";
import * as memberService from "@/server/services/member-service";
import * as notificationService from "@/server/services/notification-service";
import * as organizationService from "@/server/services/organization-service";
import * as projectService from "@/server/services/project-service";
import * as webhookService from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Subscription, SubscriptionStatus, WorkspaceLockReason } from "@/types/billing";
import type { IsoTimestamp, OrgId, SubscriptionId, WebhookId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

/** Every tenant in this file is created at T0; a growth trial ends T0 + 14 days. */
const T0 = "2026-03-01T09:00:00.000Z";
const DAY = 24 * 60 * 60 * 1000;

function stamp(value: string): IsoTimestamp {
  return value as IsoTimestamp;
}

function plus(base: string, ms: number): Date {
  return new Date(new Date(base).getTime() + ms);
}

function clock(instant: Date | string): void {
  vi.setSystemTime(typeof instant === "string" ? new Date(instant) : instant);
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

function subscriptionOf(overrides: Partial<Subscription>): Subscription {
  return {
    id: "01HZZZSSSSSSSSSSSSSSSSSSS1" as SubscriptionId,
    orgId: "01HZZZAAAAAAAAAAAAAAAAAAAA" as OrgId,
    plan: "growth",
    interval: "monthly",
    status: "active",
    seats: 4,
    currentPeriodStart: stamp("2026-03-01T00:00:00.000Z"),
    currentPeriodEnd: stamp("2026-03-15T00:00:00.000Z"),
    cancelAt: null,
    createdAt: stamp("2026-03-01T00:00:00.000Z"),
    updatedAt: stamp("2026-03-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** Puts the tenant's subscription row into `status` without going through billing. */
function setStatus(tenant: Tenant, status: SubscriptionStatus): void {
  getDb()
    .update(subscriptions)
    .set({ status })
    .where(eq(subscriptions.orgId, tenant.org.id))
    .run();
}

async function makeWorld(slug: string, plan: "growth" | "starter" | "free" = "growth"): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function makeIssue(tenant: Tenant, title: string, assignee = false): Promise<Issue> {
  return issueService.createIssue(
    tenant.actors.admin,
    issueInput(tenant.org.id, tenant.project.id, {
      title,
      assigneeId: assignee ? tenant.userIds.member : null,
    }),
  );
}

async function lockedWith<T>(work: Promise<T>, reason: WorkspaceLockReason): Promise<void> {
  const error: unknown = await work.then(() => null).catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(WorkspaceLockedError);
  expect((error as WorkspaceLockedError).reason).toBe(reason);
}

function mailsTo(
  spy: { mock: { calls: ReadonlyArray<ReadonlyArray<{ to: string }>> } },
  to: string,
): number {
  return spy.mock.calls.filter((call) => call[0]?.to === to).length;
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  clock(T0);
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

describe("EIM5 workspace lock", () => {
  it("derives the lock reason from the subscription row and the instant", () => {
    const now = new Date("2026-03-10T00:00:00.000Z");

    expect(lockReasonFor(null, now)).toBeNull();
    expect(lockReasonFor(subscriptionOf({ status: "active" }), now)).toBeNull();
    expect(lockReasonFor(subscriptionOf({ status: "past_due" }), now)).toBe("past_due");

    expect(lockReasonFor(subscriptionOf({ status: "trialing" }), now)).toBeNull();
    expect(
      lockReasonFor(subscriptionOf({ status: "trialing" }), new Date("2026-03-15T00:00:00.000Z")),
    ).toBe("trial_ended");
    expect(
      lockReasonFor(subscriptionOf({ status: "trialing" }), new Date("2026-03-14T23:59:59.000Z")),
    ).toBeNull();

    const scheduled = subscriptionOf({ status: "canceled", cancelAt: stamp("2026-03-15T00:00:00.000Z") });
    expect(lockReasonFor(scheduled, now)).toBeNull();
    expect(lockReasonFor(scheduled, new Date("2026-03-15T00:00:00.000Z"))).toBe("canceled");
    expect(lockReasonFor(subscriptionOf({ status: "canceled", cancelAt: null }), now)).toBe("canceled");
  });

  it("maps the lock to the plan_limit_exceeded error code", () => {
    const error = new WorkspaceLockedError("01HZZZAAAAAAAAAAAAAAAAAAAA" as OrgId, "past_due");
    expect(error.code).toBe("plan_limit_exceeded");
    expect(isDomainError(error)).toBe(true);

    const shape = toAppError(error);
    expect(shape.code).toBe("plan_limit_exceeded");
    expect(shape.meta?.reason).toBe("past_due");
    expect(HTTP_STATUS_BY_CODE[shape.code]).toBe(402);
  });

  it("reports the lock on the billing summary", async () => {
    const tenant = await makeWorld("eim5-summary");
    expect((await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id)).lockReason).toBeNull();

    setStatus(tenant, "past_due");
    const summary = await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id);
    expect(summary.lockReason).toBe("past_due");
    expect(summary.subscription.status).toBe("past_due");

    // The shell's organization summary carries the same answer for every role.
    const shell = await organizationService.getOrganizationSummary(tenant.actors.viewer, tenant.org.id);
    expect(shell.lockReason).toBe("past_due");
  });

  it("refuses every issue write on a past-due workspace and keeps every read", async () => {
    const tenant = await makeWorld("eim5-issues");
    const issue = await makeIssue(tenant, "Before the lock");
    setStatus(tenant, "past_due");
    const created = capture("issue.created");
    const changed = capture("issue.status_changed");
    const assigned = capture("issue.assigned");
    const updated = capture("issue.updated");
    const archived = capture("issue.archived");
    const orgId = tenant.org.id;

    await lockedWith(
      issueService.createIssue(tenant.actors.admin, issueInput(orgId, tenant.project.id, { title: "Nope" })),
      "past_due",
    );
    await lockedWith(
      issueService.updateIssue(tenant.actors.admin, { orgId, issueId: issue.id, title: "Renamed" }),
      "past_due",
    );
    await lockedWith(
      issueService.changeIssueStatus(tenant.actors.admin, { orgId, issueId: issue.id, status: "in_progress" }),
      "past_due",
    );
    // Even a status "change" to the current status is a write attempt.
    await lockedWith(
      issueService.changeIssueStatus(tenant.actors.admin, { orgId, issueId: issue.id, status: "backlog" }),
      "past_due",
    );
    await lockedWith(
      issueService.moveIssue(tenant.actors.admin, { orgId, issueId: issue.id, toStatus: "done", toIndex: 0 }),
      "past_due",
    );
    await lockedWith(
      issueService.assignIssue(tenant.actors.admin, { orgId, issueId: issue.id, assigneeId: tenant.userIds.member }),
      "past_due",
    );
    await lockedWith(issueService.archiveIssue(tenant.actors.admin, orgId, issue.id), "past_due");

    const stored = await issueService.getIssue(tenant.actors.viewer, orgId, issue.id);
    expect(stored.issue).toMatchObject({ title: "Before the lock", status: "backlog", assigneeId: null, archivedAt: null });
    const page = await issueService.listIssues(tenant.actors.viewer, { orgId, limit: 25, cursor: null });
    expect(page.total).toBe(1);
    const board = await issueService.getBoard(tenant.actors.viewer, orgId, tenant.project.id);
    expect(board.flatMap((column) => column.issues).map((row) => row.id)).toEqual([issue.id]);
    expect([created, changed, assigned, updated, archived].map((seen) => seen.length)).toEqual([0, 0, 0, 0, 0]);
  });

  it("refuses comment writes and keeps the thread readable", async () => {
    const tenant = await makeWorld("eim5-comments");
    const issue = await makeIssue(tenant, "Discussed");
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Before the lock",
      parentId: null,
      mentionedUserIds: [],
    });
    setStatus(tenant, "past_due");
    const seen = capture("comment.created");
    const deleted = capture("comment.deleted");

    await lockedWith(
      commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "Nope",
        parentId: null,
        mentionedUserIds: [],
      }),
      "past_due",
    );
    await lockedWith(
      commentService.updateComment(tenant.actors.member, { orgId: tenant.org.id, commentId: comment.id, body: "Edited" }),
      "past_due",
    );
    await lockedWith(
      commentService.deleteComment(tenant.actors.admin, { orgId: tenant.org.id, commentId: comment.id }),
      "past_due",
    );

    const thread = await commentService.getThread(tenant.actors.viewer, tenant.org.id, issue.id);
    expect(thread).toHaveLength(1);
    expect(thread[0]?.comment).toMatchObject({ body: "Before the lock", archivedAt: null });
    expect(seen).toHaveLength(0);
    expect(deleted).toHaveLength(0);
  });

  it("refuses project, label and attachment writes", async () => {
    const tenant = await makeWorld("eim5-projects");
    const issue = await makeIssue(tenant, "Has attachments");
    const label = await labelService.createLabel(tenant.actors.admin, {
      orgId: tenant.org.id,
      name: "bug",
      color: "#ef4444",
      description: null,
    });
    const attachment = await attachmentService.addAttachment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      filename: "spec.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
    });
    const parked = await projectService.createProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      name: "Parked",
      slug: "parked",
      key: "PRK",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
    await projectService.archiveProject(tenant.actors.admin, { orgId: tenant.org.id, projectId: parked.id, archiveIssues: true });
    setStatus(tenant, "past_due");
    const projectEvents = [capture("project.created"), capture("project.archived"), capture("project.restored")];

    await lockedWith(
      projectService.createProject(tenant.actors.admin, {
        orgId: tenant.org.id,
        name: "Nope",
        slug: "nope",
        key: "NOP",
        description: null,
        visibility: "org",
        leadId: null,
        color: "#6366f1",
        targetDate: null,
      }),
      "past_due",
    );
    await lockedWith(
      projectService.updateProject(tenant.actors.admin, { orgId: tenant.org.id, projectId: tenant.project.id, name: "Renamed" }),
      "past_due",
    );
    await lockedWith(
      projectService.archiveProject(tenant.actors.admin, { orgId: tenant.org.id, projectId: tenant.project.id, archiveIssues: true }),
      "past_due",
    );
    await lockedWith(projectService.restoreProject(tenant.actors.admin, tenant.org.id, parked.id), "past_due");
    await lockedWith(
      labelService.createLabel(tenant.actors.admin, { orgId: tenant.org.id, name: "feature", color: "#22c55e", description: null }),
      "past_due",
    );
    await lockedWith(
      labelService.updateLabel(tenant.actors.admin, { orgId: tenant.org.id, labelId: label.id, name: "defect" }),
      "past_due",
    );
    await lockedWith(labelService.deleteLabel(tenant.actors.admin, tenant.org.id, label.id), "past_due");
    await lockedWith(
      attachmentService.addAttachment(tenant.actors.admin, {
        orgId: tenant.org.id,
        issueId: issue.id,
        filename: "more.pdf",
        contentType: "application/pdf",
        sizeBytes: 2048,
      }),
      "past_due",
    );
    await lockedWith(
      attachmentService.removeAttachment(tenant.actors.admin, { orgId: tenant.org.id, attachmentId: attachment.id }),
      "past_due",
    );

    const project = await projectService.getProject(tenant.actors.viewer, tenant.org.id, tenant.project.slug);
    expect(project.project).toMatchObject({ name: `${tenant.org.slug} platform`, archivedAt: null });
    const listed = await projectService.listProjects(tenant.actors.viewer, { orgId: tenant.org.id, limit: 25, cursor: null });
    expect(listed.items.map((row) => row.project.id)).toEqual([tenant.project.id]);
    expect(await labelService.listLabels(tenant.actors.viewer, tenant.org.id)).toMatchObject([{ name: "bug" }]);
    expect(await attachmentService.listAttachments(tenant.actors.viewer, tenant.org.id, issue.id)).toHaveLength(1);
    expect((await projectRepo.findProjectById(tenant.org.id, parked.id))?.archivedAt).not.toBeNull();
    expect(projectEvents.map((seen) => seen.length)).toEqual([0, 0, 0]);
  });

  it("refuses membership changes and invitations while keeping them readable", async () => {
    const tenant = await makeWorld("eim5-members");
    const pending = await invitationService.inviteMember(tenant.actors.admin, {
      orgId: tenant.org.id,
      email: "waiting@eim5-members.test",
      role: "member",
    });
    const rawToken = "e".repeat(32);
    await invitationRepo.insertInvitation(
      tenant.org.id,
      { orgId: tenant.org.id, email: "joiner@eim5-members.test", role: "member", expiresInDays: 14 },
      tenant.userIds.admin,
      hashToken(rawToken),
    );
    const joiner = await userRepo.insertUser({ email: "joiner@eim5-members.test", name: "Joiner", passwordHash: "seed" });
    const target = await memberRepo.findMember(tenant.org.id, tenant.userIds.member);
    if (!target) throw new Error("fixture member missing");
    setStatus(tenant, "past_due");
    const roleChanged = capture("member.role_changed");
    const removed = capture("member.removed");
    const invited = capture("member.invited");
    const joined = capture("member.joined");

    await lockedWith(
      memberService.updateMemberRole(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id, role: "admin" }),
      "past_due",
    );
    await lockedWith(memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id }), "past_due");
    await lockedWith(
      invitationService.inviteMember(tenant.actors.admin, { orgId: tenant.org.id, email: "another@eim5-members.test", role: "member" }),
      "past_due",
    );
    await lockedWith(invitationService.revokeInvitation(tenant.actors.admin, pending.id), "past_due");
    await lockedWith(invitationService.resendInvitation(tenant.actors.admin, pending.id), "past_due");
    await lockedWith(invitationService.acceptInvitation(joiner.id, { token: rawToken }), "past_due");

    const stillPending = await invitationRepo.listPendingInvitations(tenant.org.id);
    expect(stillPending.map((row) => row.email).sort()).toEqual(["joiner@eim5-members.test", "waiting@eim5-members.test"]);
    expect(stillPending.find((row) => row.id === pending.id)?.revokedAt).toBeNull();
    await expect(memberRepo.findMember(tenant.org.id, joiner.id)).resolves.toBeNull();
    expect((await memberRepo.findMember(tenant.org.id, tenant.userIds.member))).toMatchObject({ role: "member", archivedAt: null });
    const members = await memberService.listMembers(tenant.actors.viewer, { orgId: tenant.org.id, limit: 25, cursor: null });
    expect(members.total).toBe(4);
    expect([roleChanged, removed, invited, joined].map((seen) => seen.length)).toEqual([0, 0, 0, 0]);

    // A bad token is still reported as such: the token checks come first.
    await invitationRepo.revokeInvitation(tenant.org.id, stillPending.find((row) => row.email === "joiner@eim5-members.test")!.id);
    await expect(invitationService.acceptInvitation(joiner.id, { token: rawToken })).rejects.toThrow(/revoked/);
  });

  it("refuses settings, flag and webhook writes but still allows deleting the workspace", async () => {
    const tenant = await makeWorld("eim5-settings");
    const endpoint = await webhookService.createWebhook(tenant.actors.admin, {
      orgId: tenant.org.id,
      url: "https://hooks.example.com/eim5",
      eventTypes: ["issue.created"],
    });
    setStatus(tenant, "past_due");
    const toggled = capture("flag.toggled");

    await lockedWith(
      organizationService.updateOrganization(tenant.actors.owner, { orgId: tenant.org.id, name: "Renamed workspace" }),
      "past_due",
    );
    await lockedWith(
      featureFlagService.toggleFlag(tenant.actors.admin, { orgId: tenant.org.id, flag: "kanban_board", enabled: true }),
      "past_due",
    );
    await lockedWith(
      webhookService.createWebhook(tenant.actors.admin, { orgId: tenant.org.id, url: "https://hooks.example.com/two", eventTypes: ["issue.created"] }),
      "past_due",
    );
    await lockedWith(
      webhookService.updateWebhook(tenant.actors.admin, {
        orgId: tenant.org.id,
        webhookId: endpoint.id as WebhookId,
        enabled: false,
      }),
      "past_due",
    );
    await lockedWith(
      webhookService.deleteWebhook(tenant.actors.admin, { orgId: tenant.org.id, webhookId: endpoint.id as WebhookId }),
      "past_due",
    );

    const org = await orgRepo.findOrgById(tenant.org.id);
    expect(org?.name).toBe(`${tenant.org.slug} inc`);
    expect(org?.settings.enabledFlagOverrides).toEqual([]);
    expect(toggled).toHaveLength(0);
    const hooks = await webhookService.listWebhooks(tenant.actors.admin, tenant.org.id);
    expect(hooks.map((row) => ({ id: row.id, enabled: row.enabled }))).toEqual([{ id: endpoint.id, enabled: true }]);
    expect(await webhookRepo.countEndpoints(tenant.org.id)).toBe(1);

    const deleted = await organizationService.deleteOrganization(tenant.actors.owner, {
      orgId: tenant.org.id,
      confirmSlug: tenant.org.slug,
    });
    expect(deleted.archivedAt).not.toBeNull();
  });

  it("checks the lock only after the tenant and permission checks", async () => {
    const tenant = await makeWorld("eim5-ordering");
    const stranger = await makeWorld("eim5-ordering-other");
    const issue = await makeIssue(tenant, "Guarded");
    setStatus(tenant, "past_due");

    await expect(
      issueService.createIssue(stranger.actors.owner, issueInput(tenant.org.id, tenant.project.id, { title: "x" })),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      issueService.createIssue(tenant.actors.viewer, issueInput(tenant.org.id, tenant.project.id, { title: "x" })),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      commentService.createComment(tenant.actors.viewer, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "x",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      invitationService.inviteMember(tenant.actors.member, { orgId: tenant.org.id, email: "x@eim5-ordering.test", role: "member" }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      billingService.changePlan(tenant.actors.admin, { orgId: tenant.org.id, plan: "enterprise", interval: "monthly" }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await lockedWith(
      issueService.createIssue(tenant.actors.member, issueInput(tenant.org.id, tenant.project.id, { title: "x" })),
      "past_due",
    );
  });

  it("keeps a member's notification housekeeping available", async () => {
    const tenant = await makeWorld("eim5-housekeeping");
    const [row] = await notificationService.notify(tenant.org.id, "member_joined", [tenant.userIds.member], {
      title: "Before",
      body: "b",
      href: "/settings/members",
      actorId: null,
    });
    if (!row) throw new Error("notification missing");
    setStatus(tenant, "past_due");

    const read = await notificationService.markRead(tenant.actors.member, { orgId: tenant.org.id, notificationId: row.id });
    expect(read.readAt).not.toBeNull();
    await expect(notificationService.markAllRead(tenant.actors.member, tenant.org.id)).resolves.toBe(0);
    const preference = await notificationService.updatePreference(tenant.actors.member, {
      orgId: tenant.org.id,
      userId: tenant.userIds.member,
      kind: "comment_created",
      inApp: true,
      email: false,
      digestOnly: false,
    });
    expect(preference.email).toBe(false);
  });

  it("leaves billing open, and a plan change unlocks the workspace", async () => {
    const tenant = await makeWorld("eim5-billing");
    setStatus(tenant, "past_due");
    const planChanged = capture("billing.plan_changed");

    await expect(billingService.updateSeats(tenant.actors.owner, { orgId: tenant.org.id, seats: 6 })).resolves.toMatchObject({ seats: 6 });
    await expect(billingService.listInvoices(tenant.actors.owner, tenant.org.id)).resolves.toEqual([]);
    await lockedWith(
      issueService.createIssue(tenant.actors.admin, issueInput(tenant.org.id, tenant.project.id, { title: "Still locked" })),
      "past_due",
    );

    const subscription = await billingService.changePlan(tenant.actors.owner, {
      orgId: tenant.org.id,
      plan: "enterprise",
      interval: "monthly",
    });
    expect(subscription.status).toBe("active");
    expect(planChanged).toHaveLength(1);
    expect((await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id)).lockReason).toBeNull();
    expect((await organizationService.getOrganizationSummary(tenant.actors.member, tenant.org.id)).lockReason).toBeNull();
    const issue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Unlocked" }),
    );
    expect(issue.title).toBe("Unlocked");
  });

  it("treats a cancellation as effective only once its date arrives", async () => {
    const tenant = await makeWorld("eim5-cancel");
    const before = await subscriptionRepo.findSubscription(tenant.org.id);
    if (!before) throw new Error("subscription missing");
    expect(before.status).toBe("trialing");

    const scheduled = await billingService.cancelSubscription(tenant.actors.owner, {
      orgId: tenant.org.id,
      cancelImmediately: false,
    });
    expect(scheduled.status).toBe("canceled");
    expect(scheduled.cancelAt).toBe(before.currentPeriodEnd);

    await expect(makeIssue(tenant, "Still paid for")).resolves.toMatchObject({ title: "Still paid for" });
    clock(plus(T0, 13 * DAY));
    await expect(makeIssue(tenant, "Last day")).resolves.toMatchObject({ title: "Last day" });
    expect((await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id)).lockReason).toBeNull();

    clock(plus(T0, 14 * DAY));
    await lockedWith(makeIssue(tenant, "Gone"), "canceled");
    expect((await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id)).lockReason).toBe("canceled");

    const immediate = await makeWorld("eim5-cancel-now");
    await billingService.cancelSubscription(immediate.actors.owner, { orgId: immediate.org.id, cancelImmediately: true });
    await lockedWith(makeIssue(immediate, "Gone at once"), "canceled");
  });

  it("locks a trial that has run out until the expiry job or a plan change resolves it", async () => {
    const fits = await makeWorld("eim5-trial-fits");
    const viewer = await memberRepo.findMember(fits.org.id, fits.userIds.viewer);
    if (!viewer) throw new Error("fixture viewer missing");
    await memberService.removeMember(fits.actors.owner, { orgId: fits.org.id, memberId: viewer.id });
    await usageRepo.recomputeUsage(fits.org.id);
    const tooBig = await makeWorld("eim5-trial-too-big");
    const chosen = await makeWorld("eim5-trial-chosen");

    clock(plus(T0, 13 * DAY));
    await expect(makeIssue(fits, "Trial day 13")).resolves.toMatchObject({ title: "Trial day 13" });
    await expect(makeIssue(tooBig, "Trial day 13")).resolves.toMatchObject({ title: "Trial day 13" });

    const ended = plus(T0, 14 * DAY + 60 * 60 * 1000);
    clock(ended);
    await lockedWith(makeIssue(fits, "Over"), "trial_ended");
    await lockedWith(makeIssue(tooBig, "Over"), "trial_ended");
    await lockedWith(makeIssue(chosen, "Over"), "trial_ended");
    expect((await billingService.getBillingSummary(fits.actors.owner, fits.org.id)).lockReason).toBe("trial_ended");

    await runTrialExpiryJob(ended);
    expect((await subscriptionRepo.findSubscription(fits.org.id))?.plan).toBe("free");
    await expect(makeIssue(fits, "Back on free")).resolves.toMatchObject({ title: "Back on free" });

    // Over the free plan: the job leaves the trial alone, so the lock stays.
    expect((await subscriptionRepo.findSubscription(tooBig.org.id))?.status).toBe("trialing");
    await lockedWith(makeIssue(tooBig, "Still over"), "trial_ended");

    await billingService.changePlan(chosen.actors.owner, { orgId: chosen.org.id, plan: "growth", interval: "monthly" });
    await expect(makeIssue(chosen, "Paid now")).resolves.toMatchObject({ title: "Paid now" });
  });

  it("never locks a workspace on the free plan or one without a subscription row", async () => {
    const free = await makeWorld("eim5-free", "free");
    clock(plus(T0, 400 * DAY));
    await expect(makeIssue(free, "Free forever")).resolves.toMatchObject({ title: "Free forever" });
    expect((await billingService.getBillingSummary(free.actors.owner, free.org.id)).lockReason).toBeNull();

    const owner = await userRepo.insertUser({ email: "owner@eim5-bare.test", name: "Bare", passwordHash: "seed" });
    const org = await orgRepo.insertOrg({ name: "Bare", slug: "eim5-bare", plan: "growth" }, owner.id);
    await memberRepo.insertMember(org.id, owner.id, "owner", null);
    const project = await projectRepo.insertProject({
      orgId: org.id,
      name: "Bare project",
      slug: "bare",
      key: "BAR",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
    const actor = { userId: owner.id, orgId: org.id, role: "owner" as const };
    await expect(
      issueService.createIssue(actor, issueInput(org.id, project.id, { title: "No subscription" })),
    ).resolves.toMatchObject({ title: "No subscription" });
  });

  it("keeps background work flowing on a locked workspace", async () => {
    const tenant = await makeWorld("eim5-jobs");
    // T0 is 09:00Z; the jobs below run one hour later, at the digest hour.
    await orgRepo.updateOrg(tenant.org.id, { orgId: tenant.org.id, settings: { digestHourUtc: 10 } });
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.viewer,
      kind: "issue_due_soon",
      inApp: true,
      email: true,
      digestOnly: true,
    });
    const late = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late",
        assigneeId: tenant.userIds.member,
        dueAt: "2026-02-01T00:00:00.000Z",
      }),
    );
    await notificationService.notify(tenant.org.id, "comment_created", [tenant.userIds.viewer], {
      title: "For the digest",
      body: "b",
      href: `/issues/${late.id}`,
      actorId: null,
    });
    const measuredBefore = (await usageRepo.getUsage(tenant.org.id)).measuredAt;
    setStatus(tenant, "past_due");
    const overdue = capture("issue.overdue");

    const later = plus(T0, 60 * 60 * 1000);
    clock(later);
    await runOverdueIssueJob(later);
    expect(overdue.map((payload) => payload.issueId)).toContain(late.id);
    const alerts = await notificationService.listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.member,
      unreadOnly: false,
      kind: ["issue_overdue"],
      limit: 25,
      cursor: null,
    });
    expect(alerts.items).toHaveLength(1);

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(later);
    expect(mailsTo(sendSpy, "viewer@eim5-jobs.test")).toBe(1);

    await runUsageRollupJob(later);
    expect((await usageRepo.getUsage(tenant.org.id)).measuredAt).not.toBe(measuredBefore);

    const row = await record(tenant.org.id, "organization.updated", {
      actorId: null,
      subjectKind: "organization",
      subjectId: tenant.org.id,
      projectId: null,
      summary: "System note",
    });
    expect(row.orgId).toBe(tenant.org.id);
  });
});
