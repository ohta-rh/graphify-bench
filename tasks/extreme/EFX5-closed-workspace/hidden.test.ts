/**
 * EFX5 — closed workspace.
 *
 * Closing a workspace is final and immediate: nobody can open it, switch to
 * it or join it, nothing is notified or delivered for it, no plan change is
 * recorded for it, its subscription ends, and closing it again is a conflict.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { emit, subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import { runSearchReindexJob } from "@/server/jobs/search-reindex-job";
import { runTrialExpiryJob } from "@/server/jobs/trial-expiry-job";
import { runWebhookDeliveryJob } from "@/server/jobs/webhook-delivery-job";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as activityService from "@/server/services/activity-service";
import { buildDigest } from "@/server/services/digest-service";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import * as organizationService from "@/server/services/organization-service";
import * as sessionService from "@/server/services/session-service";
import * as usageService from "@/server/services/usage-service";
import * as webhookService from "@/server/services/webhook-service";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { SessionPrincipal } from "@/types/member";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];
let tokenCounter = 0;

const PAST = "2026-01-01T00:00:00.000Z";
const FAR_FUTURE = "2099-01-01T00:00:00.000Z";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

function principalFor(userId: UserId): SessionPrincipal {
  return {
    userId,
    email: `${userId}@principal.test`,
    activeOrgId: null,
    expiresAt: toIsoTimestamp(FAR_FUTURE),
  };
}

async function close(tenant: Tenant) {
  return organizationService.deleteOrganization(tenant.actors.owner, {
    orgId: tenant.org.id,
    confirmSlug: tenant.org.slug,
  });
}

async function notificationsFor(tenant: Tenant, recipientId: UserId) {
  return notificationService.listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    limit: 100,
    cursor: null,
  });
}

/** Mints a pending invitation whose raw token the test knows. */
async function invite(tenant: Tenant, email: string): Promise<string> {
  tokenCounter += 1;
  const raw = `efx5-token-${String(tokenCounter).padStart(4, "0")}`.padEnd(40, "x");
  await invitationRepo.insertInvitation(
    tenant.org.id,
    { orgId: tenant.org.id, email, role: "member", expiresInDays: 14 },
    tenant.userIds.admin,
    hashToken(raw),
  );
  return raw;
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

describe("closing a workspace", () => {
  let tenant: Tenant;
  let elsewhere: Tenant;

  beforeAll(async () => {
    tenant = await createTenant("efx5-close", "growth");
    elsewhere = await createTenant("efx5-close-elsewhere", "growth");
    await memberRepo.insertMember(elsewhere.org.id, tenant.userIds.owner, "member", null);
  });

  it("refuses a wrong confirmation and leaves the workspace open", async () => {
    await expect(
      organizationService.deleteOrganization(tenant.actors.owner, {
        orgId: tenant.org.id,
        confirmSlug: "not-this-one",
      }),
    ).rejects.toThrow();

    await expect(organizationService.resolveOrgBySlug(tenant.org.slug)).resolves.toMatchObject({
      id: tenant.org.id,
      archivedAt: null,
    });
    await expect(subscriptionRepo.findSubscription(tenant.org.id)).resolves.toMatchObject({
      status: "trialing",
      cancelAt: null,
    });
  });

  it("closes once and reports a second closing as a conflict", async () => {
    const closed = await close(tenant);
    expect(closed.archivedAt).not.toBeNull();

    await expect(close(tenant)).rejects.toBeInstanceOf(AlreadyArchivedError);
  });

  it("ends the subscription at the moment of closing", async () => {
    const subscription = await subscriptionRepo.findSubscription(tenant.org.id);
    expect(subscription?.status).toBe("canceled");
    expect(subscription?.cancelAt).not.toBeNull();
  });

  it("disappears from lookups and from every member's workspace list", async () => {
    await expect(organizationService.resolveOrgBySlug(tenant.org.slug)).resolves.toBeNull();

    const mine = await organizationService.listOrganizationsForUser(tenant.userIds.owner);
    expect(mine.map((org) => org.id)).not.toContain(tenant.org.id);
    expect(mine.map((org) => org.id)).toContain(elsewhere.org.id);
  });

  it("cannot be opened by a session that was valid before", async () => {
    await expect(
      sessionService.resolveActorForOrg(principalFor(tenant.userIds.member), tenant.org.slug),
    ).resolves.toBeNull();
    await expect(
      sessionService.resolveActorForOrg(principalFor(tenant.userIds.owner), elsewhere.org.slug),
    ).resolves.toMatchObject({ orgId: elsewhere.org.id });
  });

  it("cannot be switched into or read any more", async () => {
    await expect(
      sessionService.switchActiveOrg(principalFor(tenant.userIds.owner), {
        orgId: tenant.org.id,
      }),
    ).rejects.toThrow();
    await expect(
      organizationService.getOrganizationSummary(tenant.actors.owner, tenant.org.id),
    ).rejects.toThrow();
    await expect(
      sessionService.switchActiveOrg(principalFor(tenant.userIds.owner), {
        orgId: elsewhere.org.id,
      }),
    ).resolves.toBeUndefined();
  });

  it("keeps the closed workspace's address reserved without failing a new workspace", async () => {
    const again = await organizationService.createOrganization(tenant.userIds.owner, {
      name: "Acme again",
      slug: tenant.org.slug,
      plan: "free",
    });

    expect(again.id).not.toBe(tenant.org.id);
    expect(again.slug).not.toBe(tenant.org.slug);
    expect(again.archivedAt).toBeNull();
    await expect(organizationService.resolveOrgBySlug(again.slug)).resolves.toMatchObject({
      id: again.id,
    });
    await expect(organizationService.resolveOrgBySlug(tenant.org.slug)).resolves.toBeNull();
  });
});

describe("nobody joins a closed workspace and nothing is notified for it", () => {
  let quiet: Tenant;
  let live: Tenant;
  let newcomer: UserId;
  let quietToken: string;
  let liveToken: string;
  let quietIssueId: string;

  beforeAll(async () => {
    quiet = await createTenant("efx5-quiet", "growth");
    live = await createTenant("efx5-live", "growth");
    await memberRepo.insertMember(live.org.id, quiet.userIds.member, "member", null);

    const user = await userRepo.insertUser({
      email: "newcomer@efx5.test",
      name: "Newcomer",
      passwordHash: "seed",
    });
    newcomer = user.id;
    quietToken = await invite(quiet, "newcomer@efx5.test");
    liveToken = await invite(live, "newcomer@efx5.test");

    const issue = await issueService.createIssue(
      quiet.actors.member,
      issueInput(quiet.org.id, quiet.project.id, { title: "Before closing" }),
    );
    quietIssueId = issue.id;
    await notificationService.notify(quiet.org.id, "comment_created", [quiet.userIds.member], {
      title: "Before closing",
      body: "unread when the workspace closes",
      href: "/x",
      actorId: null,
    });

    await close(quiet);
  });

  it("refuses a pending invitation and creates no membership and no notification", async () => {
    const joined = capture("member.joined");
    const ownerBefore = await notificationsFor(quiet, quiet.userIds.owner);

    await expect(
      invitationService.acceptInvitation(newcomer, { token: quietToken }),
    ).rejects.toThrow();

    await expect(memberRepo.findMember(quiet.org.id, newcomer)).resolves.toBeNull();
    expect(joined).toHaveLength(0);
    const ownerAfter = await notificationsFor(quiet, quiet.userIds.owner);
    expect(ownerAfter.total).toBe(ownerBefore.total);
  });

  it("refuses an invitation minted after the closing just the same", async () => {
    const late = await invite(quiet, "newcomer@efx5.test");
    await expect(
      invitationService.acceptInvitation(newcomer, { token: late }),
    ).rejects.toThrow();
    await expect(memberRepo.findMember(quiet.org.id, newcomer)).resolves.toBeNull();
  });

  it("writes no notification for the closed workspace, whatever the trigger", async () => {
    const before = await notificationsFor(quiet, quiet.userIds.member);

    const rows = await notificationService.notify(
      quiet.org.id,
      "issue_assigned",
      [quiet.userIds.member, quiet.userIds.admin],
      { title: "t", body: "b", href: "/x", actorId: null },
    );
    expect(rows).toEqual([]);

    await emit("comment.created", {
      orgId: quiet.org.id,
      actorId: quiet.userIds.admin,
      occurredAt: toIsoTimestamp(new Date()),
      commentId: "01HZZZCLOSEDCOMMENT0000001" as never,
      issueId: quietIssueId as never,
      mentionedUserIds: [quiet.userIds.member],
    });

    const after = await notificationsFor(quiet, quiet.userIds.member);
    expect(after.total).toBe(before.total);
  });

  it("builds no digest for a closed workspace", async () => {
    const now = Date.now();
    await expect(
      buildDigest(
        quiet.org.id,
        quiet.userIds.member,
        toIsoTimestamp(new Date(now - MS_PER_DAY)),
        toIsoTimestamp(new Date(now + MS_PER_DAY)),
      ),
    ).resolves.toBeNull();
  });

  it("leaves other workspaces of the same people untouched", async () => {
    const rows = await notificationService.notify(
      live.org.id,
      "issue_assigned",
      [quiet.userIds.member],
      { title: "t", body: "b", href: "/x", actorId: null },
    );
    expect(rows).toHaveLength(1);

    await expect(
      sessionService.resolveActorForOrg(principalFor(quiet.userIds.member), live.org.slug),
    ).resolves.toMatchObject({ orgId: live.org.id });
    const mine = await organizationService.listOrganizationsForUser(quiet.userIds.member);
    expect(mine.map((org) => org.id)).toEqual([live.org.id]);

    const member = await invitationService.acceptInvitation(newcomer, { token: liveToken });
    expect(member.orgId).toBe(live.org.id);
  });
});

describe("background work stops for a closed workspace", () => {
  let closed: Tenant;
  let live: Tenant;

  beforeAll(async () => {
    closed = await createTenant("efx5-jobs", "growth");
    live = await createTenant("efx5-jobs-live", "growth");
    await usageService.recomputeUsage(closed.org.id);
    await usageService.recomputeUsage(live.org.id);

    for (const tenant of [closed, live]) {
      await webhookService.createWebhook(tenant.actors.admin, {
        orgId: tenant.org.id,
        url: "https://hooks.example.test/taskflow",
        eventTypes: ["issue.created"],
      });
      await issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, {
          title: "Overdue and hooked",
          assigneeId: tenant.userIds.member,
          dueAt: PAST,
        }),
      );
    }

    await close(closed);
  });

  it("sends no more overdue reminders", async () => {
    await runOverdueIssueJob(new Date("2026-06-01T07:00:00.000Z"));

    const liveRows = await notificationsFor(live, live.userIds.member);
    expect(liveRows.items.map((row) => row.kind)).toContain("issue_overdue");
    const closedRows = await notificationsFor(closed, closed.userIds.member);
    expect(closedRows.items.map((row) => row.kind)).not.toContain("issue_overdue");
  });

  it("delivers no webhooks, including ones queued before the closing", async () => {
    const result = await runWebhookDeliveryJob(new Date("2026-06-01T07:00:00.000Z"));
    expect(result.processed).toBe(1);
  });

  it("rebuilds no search index for a closed workspace", async () => {
    const closedResult = await runSearchReindexJob(closed.org.id);
    expect(closedResult.processed).toBe(0);
    const liveResult = await runSearchReindexJob(live.org.id);
    expect(liveResult.processed).toBeGreaterThan(0);
  });
});

describe("billing stops for a closed workspace", () => {
  let closed: Tenant;
  let live: Tenant;

  beforeAll(async () => {
    closed = await createTenant("efx5-trial", "growth");
    live = await createTenant("efx5-trial-live", "growth");
    await close(closed);
  });

  it("records no plan change when a closed workspace's trial runs out", async () => {
    const changed = capture("billing.plan_changed");
    await runTrialExpiryJob(new Date(Date.now() + 20 * MS_PER_DAY));

    expect(changed.map((event) => event.orgId)).toContain(live.org.id);
    expect(changed.map((event) => event.orgId)).not.toContain(closed.org.id);

    const liveActivity = await activityService.listActivity(live.actors.owner, {
      orgId: live.org.id,
      action: ["billing.plan_changed"],
      limit: 25,
      cursor: null,
    });
    expect(liveActivity.total).toBe(1);
    const closedActivity = await activityService.listActivity(closed.actors.owner, {
      orgId: closed.org.id,
      action: ["billing.plan_changed"],
      limit: 25,
      cursor: null,
    });
    expect(closedActivity.total).toBe(0);

    await expect(subscriptionRepo.findSubscription(live.org.id)).resolves.toMatchObject({
      plan: "free",
    });
    await expect(subscriptionRepo.findSubscription(closed.org.id)).resolves.toMatchObject({
      plan: "growth",
      status: "canceled",
    });
  });
});
