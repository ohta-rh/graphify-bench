/**
 * EIM6 — deleting a workspace is a grace period, then a purge.
 *
 * A deleted workspace is inert: nobody can sign in, nothing is created for
 * it, every background job leaves it alone. Its owner can bring it back for
 * 30 days; after that the retention sweep removes every trace of it.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { count, eq } from "drizzle-orm";
import { DELETED_WORKSPACE_RETENTION_DAYS } from "@/config/constants";
import { subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { PermissionDeniedError } from "@/lib/permissions";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { activityFilterSchema } from "@/schemas/activity";
import {
  activityEvents,
  comments,
  getDb,
  invitations,
  issues,
  labels,
  members,
  notifications,
  organizationUsage,
  projects,
  searchIndex,
  sessions,
  subscriptions,
  webhookDeliveries,
  webhookEndpoints,
} from "@/server/db";
import { runCleanupArchivedJob } from "@/server/jobs/cleanup-archived-job";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import { runTrialExpiryJob } from "@/server/jobs/trial-expiry-job";
import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";
import { runWebhookDeliveryJob } from "@/server/jobs/webhook-delivery-job";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as sessionRepo from "@/server/repositories/session-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { NotFoundError } from "@/server/services/_support";
import { listActivity, registerActivityListeners } from "@/server/services/activity-service";
import * as commentService from "@/server/services/comment-service";
import * as emailService from "@/server/services/email-service";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import { notify } from "@/server/services/notification-service";
import {
  createOrganization,
  deleteOrganization,
  listOrganizationsForUser,
  restoreOrganization,
} from "@/server/services/organization-service";
import { resolveActorForOrg } from "@/server/services/session-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Role, SessionPrincipal } from "@/types/member";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

const T0 = "2026-03-01T09:00:00.000Z";
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const UNKNOWN_ORG = "01HZZZQQQQQQQQQQQQQQQQQQQQ" as OrgId;

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

async function makeWorld(slug: string, plan: "growth" | "free" = "growth"): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function remove(tenant: Tenant) {
  return deleteOrganization(tenant.actors.owner, { orgId: tenant.org.id, confirmSlug: tenant.org.slug });
}

function principalFor(tenant: Tenant, role: Role): SessionPrincipal {
  return {
    userId: tenant.userIds[role],
    email: `${role}@${tenant.org.slug}.test`,
    activeOrgId: null,
    expiresAt: stamp("2030-01-01T00:00:00.000Z"),
  };
}

type OrgTable = { orgId: { name: string } };

function rowsFor(table: unknown, orgId: OrgId): number {
  const t = table as typeof members;
  const row = getDb().select({ value: count() }).from(t).where(eq(t.orgId, orgId)).get();
  return row?.value ?? 0;
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

describe("EIM6 workspace deletion", () => {
  it("publishes and audits the deletion, and refuses to delete twice", async () => {
    const tenant = await makeWorld("eim6-delete");
    detachers.push(registerActivityListeners());
    const seen = capture("organization.deleted");

    const deleted = await remove(tenant);
    expect(deleted.archivedAt).not.toBeNull();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ orgId: tenant.org.id, actorId: tenant.userIds.owner, slug: tenant.org.slug });

    const audit = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      action: ["organization.deleted"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]).toMatchObject({ subjectKind: "organization", subjectId: tenant.org.id, actorId: tenant.userIds.owner });
    expect(
      activityFilterSchema.safeParse({ orgId: tenant.org.id, action: ["organization.deleted", "organization.restored"], limit: 25, cursor: null }).success,
    ).toBe(true);

    await expect(remove(tenant)).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(seen).toHaveLength(1);
  });

  it("hides a deleted workspace from sign-in and keeps its slug reserved", async () => {
    const tenant = await makeWorld("eim6-hidden");
    await remove(tenant);

    await expect(resolveActorForOrg(principalFor(tenant, "owner"), tenant.org.slug)).resolves.toBeNull();
    expect((await listOrganizationsForUser(tenant.userIds.owner)).map((org) => org.id)).not.toContain(tenant.org.id);
    await expect(orgRepo.findOrgBySlug(tenant.org.slug)).resolves.toBeNull();

    // The name is not free until the purge: a new workspace gets a suffix.
    const again = await createOrganization(tenant.userIds.owner, { name: "Hidden again", slug: tenant.org.slug, plan: "free" });
    expect(again.slug).toBe(`${tenant.org.slug}-2`);
  });

  it("lets the owner restore it inside the window, publishing and auditing the restore", async () => {
    const tenant = await makeWorld("eim6-restore");
    detachers.push(registerActivityListeners());
    await remove(tenant);
    const seen = capture("organization.restored");

    clock(plus(T0, 29 * DAY));
    const restored = await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    expect(restored.archivedAt).toBeNull();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ orgId: tenant.org.id, actorId: tenant.userIds.owner, slug: tenant.org.slug });

    await expect(resolveActorForOrg(principalFor(tenant, "member"), tenant.org.slug)).resolves.toMatchObject({ role: "member" });
    expect((await listOrganizationsForUser(tenant.userIds.owner)).map((org) => org.id)).toContain(tenant.org.id);
    const audit = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      action: ["organization.restored"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]).toMatchObject({ subjectId: tenant.org.id, actorId: tenant.userIds.owner });

    // Restoring a live workspace changes nothing and says nothing.
    const unchanged = await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    expect(unchanged.archivedAt).toBeNull();
    expect(seen).toHaveLength(1);
  });

  it("refuses a restore by anyone but an owner of that workspace", async () => {
    const tenant = await makeWorld("eim6-restore-guards");
    const outsider = await userRepo.insertUser({ email: "outsider@eim6.test", name: "Outsider", passwordHash: "seed" });
    await remove(tenant);
    const seen = capture("organization.restored");

    await expect(restoreOrganization(outsider.id, tenant.org.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(restoreOrganization(tenant.userIds.admin, tenant.org.id)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(restoreOrganization(tenant.userIds.member, tenant.org.id)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(restoreOrganization(tenant.userIds.owner, UNKNOWN_ORG)).rejects.toBeInstanceOf(NotFoundError);

    expect((await orgRepo.findOrgById(tenant.org.id))?.archivedAt).not.toBeNull();
    expect(seen).toHaveLength(0);
  });

  it("treats the workspace as gone once the window has closed, even before the purge", async () => {
    const inside = await makeWorld("eim6-window-inside");
    const outside = await makeWorld("eim6-window-outside");
    await remove(inside);
    await remove(outside);

    clock(plus(T0, DELETED_WORKSPACE_RETENTION_DAYS * DAY - HOUR));
    expect((await restoreOrganization(inside.userIds.owner, inside.org.id)).archivedAt).toBeNull();

    clock(plus(T0, DELETED_WORKSPACE_RETENTION_DAYS * DAY + HOUR));
    await expect(restoreOrganization(outside.userIds.owner, outside.org.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await orgRepo.findOrgById(outside.org.id))?.archivedAt).not.toBeNull();
    await expect(resolveActorForOrg(principalFor(outside, "owner"), outside.org.slug)).resolves.toBeNull();
  });

  it("does not let an invitation be accepted while the workspace is deleted", async () => {
    const tenant = await makeWorld("eim6-invite");
    const rawToken = "f".repeat(32);
    await invitationRepo.insertInvitation(
      tenant.org.id,
      { orgId: tenant.org.id, email: "joiner@eim6-invite.test", role: "member", expiresInDays: 60 },
      tenant.userIds.admin,
      hashToken(rawToken),
    );
    const joiner = await userRepo.insertUser({ email: "joiner@eim6-invite.test", name: "Joiner", passwordHash: "seed" });
    await remove(tenant);
    const joined = capture("member.joined");

    await expect(invitationService.acceptInvitation(joiner.id, { token: rawToken })).rejects.toBeInstanceOf(NotFoundError);
    expect((await invitationRepo.listPendingInvitations(tenant.org.id)).map((row) => row.email)).toEqual(["joiner@eim6-invite.test"]);
    await expect(memberRepo.findMember(tenant.org.id, joiner.id)).resolves.toBeNull();
    expect(joined).toHaveLength(0);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    const member = await invitationService.acceptInvitation(joiner.id, { token: rawToken });
    expect(member.role).toBe("member");
    expect(joined).toHaveLength(1);
  });

  it("creates no notifications for a deleted workspace", async () => {
    const tenant = await makeWorld("eim6-notify");
    await remove(tenant);

    const rows = await notify(tenant.org.id, "member_joined", [tenant.userIds.member, tenant.userIds.viewer], {
      title: "t",
      body: "b",
      href: "/settings/members",
      actorId: null,
    });
    expect(rows).toEqual([]);
    await expect(notificationRepo.countUnread(tenant.org.id, tenant.userIds.member)).resolves.toBe(0);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    const later = await notify(tenant.org.id, "member_joined", [tenant.userIds.member], {
      title: "t",
      body: "b",
      href: "/settings/members",
      actorId: null,
    });
    expect(later).toHaveLength(1);
  });

  it("keeps the overdue sweep away from a deleted workspace until it is restored", async () => {
    const tenant = await makeWorld("eim6-overdue");
    const live = await makeWorld("eim6-overdue-live");
    const late = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Late", assigneeId: tenant.userIds.member, dueAt: "2026-02-01T00:00:00.000Z" }),
    );
    const liveLate = await issueService.createIssue(
      live.actors.admin,
      issueInput(live.org.id, live.project.id, { title: "Late too", assigneeId: live.userIds.member, dueAt: "2026-02-01T00:00:00.000Z" }),
    );
    await remove(tenant);
    const seen = capture("issue.overdue");

    await runOverdueIssueJob(plus(T0, HOUR));
    expect(seen.map((payload) => payload.issueId)).toContain(liveLate.id);
    expect(seen.map((payload) => payload.issueId)).not.toContain(late.id);
    await expect(notificationRepo.countUnread(tenant.org.id, tenant.userIds.member)).resolves.toBe(0);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    await runOverdueIssueJob(plus(T0, 2 * HOUR));
    expect(seen.map((payload) => payload.issueId)).toContain(late.id);
    await expect(notificationRepo.countUnread(tenant.org.id, tenant.userIds.member)).resolves.toBe(1);
  });

  it("sends no digest for a deleted workspace, and one after the restore", async () => {
    const tenant = await makeWorld("eim6-digest");
    await orgRepo.updateOrg(tenant.org.id, { orgId: tenant.org.id, settings: { digestHourUtc: 10 } });
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.member,
      kind: "issue_due_soon",
      inApp: true,
      email: true,
      digestOnly: true,
    });
    await notify(tenant.org.id, "comment_created", [tenant.userIds.member], { title: "Waiting", body: "b", href: "/x", actorId: null });
    await remove(tenant);
    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(plus(T0, HOUR));
    expect(mailsTo(sendSpy, "member@eim6-digest.test")).toBe(0);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    await runDigestEmailJob(plus(T0, HOUR + 5 * 60 * 1000));
    expect(mailsTo(sendSpy, "member@eim6-digest.test")).toBe(1);
  });

  it("freezes the usage counters of a deleted workspace", async () => {
    // Measured a day earlier so these two are first in the rollup's oldest-first list.
    clock(plus(T0, -DAY));
    const tenant = await makeWorld("eim6-rollup");
    const live = await makeWorld("eim6-rollup-live");
    clock(T0);
    await remove(tenant);
    const before = (await usageRepo.getUsage(tenant.org.id)).measuredAt;
    const liveBefore = (await usageRepo.getUsage(live.org.id)).measuredAt;

    await runUsageRollupJob(plus(T0, HOUR));
    expect((await usageRepo.getUsage(tenant.org.id)).measuredAt).toBe(before);
    expect((await usageRepo.getUsage(live.org.id)).measuredAt).not.toBe(liveBefore);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    await runUsageRollupJob(plus(T0, 2 * HOUR));
    expect((await usageRepo.getUsage(tenant.org.id)).measuredAt).not.toBe(before);
  });

  it("leaves a deleted workspace's expired trial alone until it is restored", async () => {
    const shrink = async (tenant: Tenant) => {
      const viewer = await memberRepo.findMember(tenant.org.id, tenant.userIds.viewer);
      if (!viewer) throw new Error("fixture viewer missing");
      await memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: viewer.id });
      await usageRepo.recomputeUsage(tenant.org.id);
    };
    const tenant = await makeWorld("eim6-trial");
    const live = await makeWorld("eim6-trial-live");
    await shrink(tenant);
    await shrink(live);
    await remove(tenant);
    const seen = capture("billing.plan_changed");

    const after = plus(T0, 15 * DAY);
    clock(after);
    await runTrialExpiryJob(after);
    expect((await subscriptionRepo.findSubscription(live.org.id))?.plan).toBe("free");
    expect((await subscriptionRepo.findSubscription(tenant.org.id))).toMatchObject({ plan: "growth", status: "trialing" });
    expect(seen.map((payload) => payload.orgId)).not.toContain(tenant.org.id);

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    await runTrialExpiryJob(after);
    expect((await subscriptionRepo.findSubscription(tenant.org.id))?.plan).toBe("free");
    expect(seen.map((payload) => payload.orgId)).toContain(tenant.org.id);
  });

  it("fails a deleted workspace's webhook deliveries instead of sending them", async () => {
    const tenant = await makeWorld("eim6-webhooks");
    const live = await makeWorld("eim6-webhooks-live");
    const endpoint = await webhookRepo.insertEndpoint(
      { orgId: tenant.org.id, url: "https://hooks.example.com/deleted", eventTypes: ["issue.created"] },
      "secret",
    );
    const liveEndpoint = await webhookRepo.insertEndpoint(
      { orgId: live.org.id, url: "https://hooks.example.com/live", eventTypes: ["issue.created"] },
      "secret",
    );
    const delivery = await webhookRepo.enqueueDelivery(tenant.org.id, endpoint.id, "issue.created", "{}");
    const liveDelivery = await webhookRepo.enqueueDelivery(live.org.id, liveEndpoint.id, "issue.created", "{}");
    await remove(tenant);

    await runWebhookDeliveryJob(plus(T0, HOUR));

    const statusOf = (id: string) =>
      getDb().select({ status: webhookDeliveries.status }).from(webhookDeliveries).where(eq(webhookDeliveries.id, id)).get()?.status;
    expect(statusOf(delivery.id)).toBe("failed");
    expect(statusOf(liveDelivery.id)).toBe("delivered");
  });

  it("keeps every row of a deleted workspace intact until the purge", async () => {
    clock(plus(T0, -DAY));
    const tenant = await makeWorld("eim6-retention", "free");
    const live = await makeWorld("eim6-retention-live", "free");
    clock(T0);
    const oldStamp = stamp(plus(T0, -40 * DAY).toISOString());
    for (const org of [tenant, live]) {
      await activityRepo.insertActivity({
        orgId: org.org.id,
        action: "issue.created",
        actorId: null,
        subjectKind: "issue",
        subjectId: "old",
        projectId: null,
        summary: "Old enough to purge",
        metadata: {},
        occurredAt: oldStamp,
      });
    }
    await remove(tenant);

    await runCleanupArchivedJob(plus(T0, DAY));
    expect(await activityRepo.listActivityForSubject(tenant.org.id, "issue", "old")).toHaveLength(1);
    expect(await activityRepo.listActivityForSubject(live.org.id, "issue", "old")).toHaveLength(0);
    expect((await orgRepo.findOrgById(tenant.org.id))?.archivedAt).not.toBeNull();

    await restoreOrganization(tenant.userIds.owner, tenant.org.id);
    await runCleanupArchivedJob(plus(T0, 2 * DAY));
    expect(await activityRepo.listActivityForSubject(tenant.org.id, "issue", "old")).toHaveLength(0);
  });

  it("purges every trace of a workspace once the window has closed", async () => {
    const tenant = await makeWorld("eim6-purge");
    const live = await makeWorld("eim6-purge-live");
    const issue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Doomed" }),
    );
    await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Doomed too",
      parentId: null,
      mentionedUserIds: [],
    });
    await searchRepo.upsertSearchDocument(tenant.org.id, "issue", issue.id, "Doomed", tenant.project.id);
    const endpoint = await webhookRepo.insertEndpoint(
      { orgId: tenant.org.id, url: "https://hooks.example.com/purge", eventTypes: ["issue.created"] },
      "secret",
    );
    await webhookRepo.enqueueDelivery(tenant.org.id, endpoint.id, "issue.created", "{}");
    await invitationRepo.insertInvitation(
      tenant.org.id,
      { orgId: tenant.org.id, email: "never@eim6-purge.test", role: "member", expiresInDays: 60 },
      tenant.userIds.admin,
      hashToken("g".repeat(32)),
    );
    await notify(tenant.org.id, "member_joined", [tenant.userIds.member], { title: "t", body: "b", href: "/x", actorId: null });
    getDb()
      .insert(sessions)
      .values({
        id: "01HZZZSESSIONEIM6PURGE0001",
        userId: tenant.userIds.member,
        activeOrgId: tenant.org.id,
        tokenHash: "eim6-purge-session",
        expiresAt: "2030-01-01T00:00:00.000Z",
        createdAt: T0,
        updatedAt: T0,
      })
      .run();
    const liveIssue = await issueService.createIssue(
      live.actors.admin,
      issueInput(live.org.id, live.project.id, { title: "Survives" }),
    );
    await remove(tenant);

    const tables = [members, projects, issues, comments, labels, notifications, invitations, activityEvents, subscriptions, webhookEndpoints, webhookDeliveries, searchIndex, organizationUsage];
    for (const table of tables.slice(0, 4)) expect(rowsFor(table, tenant.org.id)).toBeGreaterThan(0);

    // Inside the window nothing is touched.
    await runCleanupArchivedJob(plus(T0, DELETED_WORKSPACE_RETENTION_DAYS * DAY - HOUR));
    expect((await orgRepo.findOrgById(tenant.org.id))?.archivedAt).not.toBeNull();
    expect(rowsFor(issues, tenant.org.id)).toBe(1);

    await runCleanupArchivedJob(plus(T0, DELETED_WORKSPACE_RETENTION_DAYS * DAY + HOUR));

    await expect(orgRepo.findOrgById(tenant.org.id)).resolves.toBeNull();
    for (const table of tables) expect(rowsFor(table, tenant.org.id), String((table as OrgTable).orgId.name)).toBe(0);
    expect(await usageRepo.listOrgIdsForRollup(500)).not.toContain(tenant.org.id);
    await expect(userRepo.findUserById(tenant.userIds.member)).resolves.not.toBeNull();
    expect((await sessionRepo.findSessionByTokenHash("eim6-purge-session"))?.activeOrgId).toBeNull();
    await expect(restoreOrganization(tenant.userIds.owner, tenant.org.id)).rejects.toBeInstanceOf(NotFoundError);

    // The other workspace is untouched, and the name is free again.
    await expect(orgRepo.findOrgById(live.org.id)).resolves.toMatchObject({ archivedAt: null });
    expect(rowsFor(issues, live.org.id)).toBe(1);
    await expect(issueService.getIssue(live.actors.viewer, live.org.id, liveIssue.id)).resolves.toMatchObject({ issue: { title: "Survives" } });
    const reborn = await createOrganization(tenant.userIds.owner, { name: "Reborn", slug: tenant.org.slug, plan: "free" });
    expect(reborn.slug).toBe(tenant.org.slug);
  });

  it("never purges a live workspace or one deleted less than the window ago", async () => {
    const fresh = await makeWorld("eim6-purge-fresh");
    const live = await makeWorld("eim6-purge-alive");
    clock(plus(T0, 10 * DAY));
    await remove(fresh);

    await runCleanupArchivedJob(plus(T0, DELETED_WORKSPACE_RETENTION_DAYS * DAY + HOUR));

    expect((await orgRepo.findOrgById(fresh.org.id))?.archivedAt).not.toBeNull();
    expect(rowsFor(members, fresh.org.id)).toBe(4);
    await expect(orgRepo.findOrgById(live.org.id)).resolves.toMatchObject({ archivedAt: null });
    expect(rowsFor(members, live.org.id)).toBe(4);
    expect(rowsFor(organizationUsage, live.org.id)).toBe(1);
  });
});
