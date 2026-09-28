/**
 * EIM1 — workspace ownership handover with the new owner's consent.
 *
 * The recorded owner offers the workspace; the offered member accepts within
 * a week or the offer lapses. Acceptance moves the recorded owner, swaps the
 * roles (new owner up, former owner down to admin) and every place that
 * follows "the owner" — new-member alerts, billing — follows along.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { OwnershipHandoverError, isDomainError, toAppError } from "@/lib/errors";
import { emit, subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import { NotFoundError } from "@/server/services/_support";
import { registerActivityListeners } from "@/server/services/activity-service";
import * as billingService from "@/server/services/billing-service";
import * as memberService from "@/server/services/member-service";
import { listNotifications } from "@/server/services/notification-service";
import {
  acceptOwnershipHandover,
  cancelOwnershipHandover,
  declineOwnershipHandover,
  getPendingOwnershipHandover,
  initiateOwnershipHandover,
} from "@/server/services/organization-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { MemberId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Role } from "@/types/member";
import type { NotificationKind } from "@/types/notification";

let cleanup: () => void;
let detachActivity: Unsubscribe;
const detachers: Unsubscribe[] = [];

const DAY_MS = 24 * 60 * 60 * 1000;

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function memberIdOf(tenant: Tenant, role: Role): Promise<MemberId> {
  const member = await memberRepo.findMember(tenant.org.id, tenant.userIds[role]);
  if (!member) throw new Error(`fixture ${role} missing`);
  return member.id;
}

async function roleOf(tenant: Tenant, userId: UserId): Promise<Role | null> {
  const member = await memberRepo.findMember(tenant.org.id, userId);
  return member?.role ?? null;
}

async function inbox(tenant: Tenant, recipientId: UserId, kind: NotificationKind): Promise<number> {
  const page = await listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    kind: [kind],
    limit: 100,
    cursor: null,
  });
  return page.total;
}

async function refusal(work: Promise<unknown>): Promise<OwnershipHandoverError> {
  try {
    await work;
  } catch (error) {
    if (error instanceof OwnershipHandoverError) return error;
    throw error;
  }
  throw new Error("expected the handover to be refused");
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

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  detachActivity = registerActivityListeners();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.useRealTimers();
});

afterAll(() => {
  detachActivity();
  cleanup();
});

describe("EIM1 — ownership handover", () => {
  it("offers the workspace to an active member and alerts them", async () => {
    const tenant = await createTenant("eim1-offer");

    // Pinned clock: expiry and creation may be stamped by separate Date reads,
    // which drift by a millisecond under load on the real clock.
    const handover = await at("2026-07-01T10:00:00.000Z", () =>
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member),
    );

    expect(handover).toMatchObject({
      orgId: tenant.org.id,
      fromUserId: tenant.userIds.owner,
      toUserId: tenant.userIds.member,
      status: "pending",
      resolvedAt: null,
    });
    expect(new Date(handover.expiresAt).getTime() - new Date(handover.createdAt).getTime()).toBe(7 * DAY_MS);

    expect(await inbox(tenant, tenant.userIds.member, "ownership_handover")).toBe(1);
    expect(await inbox(tenant, tenant.userIds.owner, "ownership_handover")).toBe(0);

    const seen = await at("2026-07-01T10:00:01.000Z", () =>
      getPendingOwnershipHandover(tenant.actors.viewer, tenant.org.id),
    );
    expect(seen?.id).toBe(handover.id);
  });

  it("lets only the recorded owner offer the workspace", async () => {
    const tenant = await createTenant("eim1-recorded-owner");

    await expect(
      initiateOwnershipHandover(tenant.actors.admin, tenant.org.id, tenant.userIds.member),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    // A second member holding the owner role is still not the recorded owner.
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, "admin"),
      role: "owner",
    });
    await expect(
      initiateOwnershipHandover(
        { ...tenant.actors.admin, role: "owner" },
        tenant.org.id,
        tenant.userIds.member,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
  });

  it("refuses to offer the workspace to oneself, to a stranger or to a removed member", async () => {
    const tenant = await createTenant("eim1-target");
    const other = await createTenant("eim1-target-other");

    const self = await refusal(
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.owner),
    );
    expect(self.reason).toBe("self");

    await expect(
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, other.userIds.member),
    ).rejects.toBeInstanceOf(NotFoundError);

    await memberService.removeMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, "viewer"),
    });
    await expect(
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.viewer),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
  });

  it("keeps a single open offer per workspace", async () => {
    const tenant = await createTenant("eim1-single");

    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);
    const second = await refusal(
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.admin),
    );
    expect(second.reason).toBe("pending_exists");

    const canceled = await cancelOwnershipHandover(tenant.actors.owner, tenant.org.id);
    expect(canceled.status).toBe("canceled");
    expect(canceled.resolvedAt).not.toBeNull();

    const replacement = await initiateOwnershipHandover(
      tenant.actors.owner,
      tenant.org.id,
      tenant.userIds.admin,
    );
    expect(replacement.toUserId).toBe(tenant.userIds.admin);
    expect((await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id))?.id).toBe(replacement.id);
  });

  it("stays inside the workspace", async () => {
    const tenantA = await createTenant("eim1-tenant-a");
    const tenantB = await createTenant("eim1-tenant-b");

    await expect(
      initiateOwnershipHandover(tenantB.actors.owner, tenantA.org.id, tenantA.userIds.member),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      getPendingOwnershipHandover(tenantB.actors.owner, tenantA.org.id),
    ).rejects.toBeInstanceOf(TenantScopeError);

    await initiateOwnershipHandover(tenantA.actors.owner, tenantA.org.id, tenantA.userIds.member);
    expect(await getPendingOwnershipHandover(tenantB.actors.owner, tenantB.org.id)).toBeNull();
    await expect(
      acceptOwnershipHandover(tenantB.actors.member, tenantB.org.id),
    ).rejects.toBeInstanceOf(OwnershipHandoverError);
    expect(tenantA.org.ownerId).toBe((await orgRepo.findOrgById(tenantA.org.id))?.ownerId);
  });

  it("lets only the offered member accept or decline", async () => {
    const tenant = await createTenant("eim1-addressee");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);

    const accept = await refusal(acceptOwnershipHandover(tenant.actors.admin, tenant.org.id));
    expect(accept.reason).toBe("nothing_pending");
    const decline = await refusal(declineOwnershipHandover(tenant.actors.admin, tenant.org.id));
    expect(decline.reason).toBe("nothing_pending");

    expect((await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id))?.status).toBe("pending");
    expect((await orgRepo.findOrgById(tenant.org.id))?.ownerId).toBe(tenant.userIds.owner);
  });

  it("moves the recorded owner, swaps the roles and announces the handover on acceptance", async () => {
    const tenant = await createTenant("eim1-accept");
    const memberId = await memberIdOf(tenant, "member");
    const ownerId = await memberIdOf(tenant, "owner");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);

    const roleChanges = capture("member.role_changed");
    const transfers = capture("organization.ownership_transferred");

    const org = await acceptOwnershipHandover(tenant.actors.member, tenant.org.id);

    expect(org.id).toBe(tenant.org.id);
    expect(org.ownerId).toBe(tenant.userIds.member);
    expect((await orgRepo.findOrgById(tenant.org.id))?.ownerId).toBe(tenant.userIds.member);
    expect(await roleOf(tenant, tenant.userIds.member)).toBe("owner");
    expect(await roleOf(tenant, tenant.userIds.owner)).toBe("admin");
    expect(await roleOf(tenant, tenant.userIds.admin)).toBe("admin");

    expect(roleChanges).toHaveLength(2);
    expect(roleChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ orgId: tenant.org.id, memberId, from: "member", to: "owner" }),
        expect.objectContaining({ orgId: tenant.org.id, memberId: ownerId, from: "owner", to: "admin" }),
      ]),
    );
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      fromUserId: tenant.userIds.owner,
      toUserId: tenant.userIds.member,
    });

    const audit = await activityRepo.listActivity({
      orgId: tenant.org.id,
      action: ["organization.ownership_transferred"],
      limit: 25,
      cursor: null,
    });
    expect(audit.total).toBe(1);
    expect(audit.items[0]).toMatchObject({
      subjectKind: "organization",
      subjectId: tenant.org.id,
      metadata: { fromUserId: tenant.userIds.owner, toUserId: tenant.userIds.member },
    });

    expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
    const again = await refusal(acceptOwnershipHandover(tenant.actors.member, tenant.org.id));
    expect(again.reason).toBe("nothing_pending");
  });

  it("lets a viewer accept and become the owner", async () => {
    const tenant = await createTenant("eim1-viewer-accepts");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.viewer);

    const org = await acceptOwnershipHandover(tenant.actors.viewer, tenant.org.id);

    expect(org.ownerId).toBe(tenant.userIds.viewer);
    expect(await roleOf(tenant, tenant.userIds.viewer)).toBe("owner");
    expect(await roleOf(tenant, tenant.userIds.owner)).toBe("admin");
  });

  it("changes only the former owner's role when the new owner already holds the owner role", async () => {
    const tenant = await createTenant("eim1-already-owner");
    const ownerId = await memberIdOf(tenant, "owner");
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, "member"),
      role: "owner",
    });
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);

    const roleChanges = capture("member.role_changed");
    const org = await acceptOwnershipHandover(
      { ...tenant.actors.member, role: "owner" },
      tenant.org.id,
    );

    expect(org.ownerId).toBe(tenant.userIds.member);
    expect(roleChanges).toHaveLength(1);
    expect(roleChanges[0]).toMatchObject({ memberId: ownerId, from: "owner", to: "admin" });
    expect(await roleOf(tenant, tenant.userIds.member)).toBe("owner");
    expect(await roleOf(tenant, tenant.userIds.owner)).toBe("admin");
  });

  it("hands billing to the new owner and takes it from the former one", async () => {
    const tenant = await createTenant("eim1-billing", "starter");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.admin);
    await acceptOwnershipHandover(tenant.actors.admin, tenant.org.id);

    const former = { ...tenant.actors.owner, role: (await roleOf(tenant, tenant.userIds.owner)) ?? "admin" };
    await expect(
      billingService.changePlan(former, { orgId: tenant.org.id, plan: "growth", interval: "monthly" }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    const current = { ...tenant.actors.admin, role: (await roleOf(tenant, tenant.userIds.admin)) ?? "admin" };
    const subscription = await billingService.changePlan(current, {
      orgId: tenant.org.id,
      plan: "growth",
      interval: "monthly",
    });
    expect(subscription.plan).toBe("growth");
    expect((await subscriptionRepo.findSubscription(tenant.org.id))?.plan).toBe("growth");
  });

  it("sends new-member alerts to the new owner afterwards", async () => {
    const tenant = await createTenant("eim1-join-alerts");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);
    await acceptOwnershipHandover(tenant.actors.member, tenant.org.id);

    await emit("member.joined", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: tenant.org.createdAt,
      memberId: "eim1-new-member" as MemberId,
      userId: "01HZZZNEWJOINERAAAAAAAAAA1" as UserId,
      role: "member",
    });

    expect(await inbox(tenant, tenant.userIds.member, "member_joined")).toBe(1);
    expect(await inbox(tenant, tenant.userIds.owner, "member_joined")).toBe(0);
  });

  it("lets the former owner be removed once the handover is done", async () => {
    const tenant = await createTenant("eim1-former-removable");
    const formerId = await memberIdOf(tenant, "owner");

    await expect(
      memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: formerId }),
    ).rejects.toThrow();

    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.admin);
    await acceptOwnershipHandover(tenant.actors.admin, tenant.org.id);

    const removed = await memberService.removeMember(
      { ...tenant.actors.admin, role: "owner" },
      { orgId: tenant.org.id, memberId: formerId },
    );
    expect(removed.archivedAt).not.toBeNull();
  });

  it("lapses seven days after it was offered", async () => {
    const tenant = await createTenant("eim1-expiry");

    const handover = await at("2026-07-01T10:00:00.000Z", () =>
      initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member),
    );
    expect(handover.expiresAt).toBe("2026-07-08T10:00:00.000Z");

    const stillOpen = await at("2026-07-08T09:59:59.000Z", () =>
      getPendingOwnershipHandover(tenant.actors.member, tenant.org.id),
    );
    expect(stillOpen?.id).toBe(handover.id);

    const expired = await at("2026-07-08T10:00:00.000Z", () =>
      refusal(acceptOwnershipHandover(tenant.actors.member, tenant.org.id)),
    );
    expect(expired.reason).toBe("expired");
    expect((await orgRepo.findOrgById(tenant.org.id))?.ownerId).toBe(tenant.userIds.owner);
    expect(await roleOf(tenant, tenant.userIds.member)).toBe("member");

    const afterwards = await at("2026-07-08T10:00:01.000Z", async () => {
      expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
      return initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);
    });
    expect(afterwards.status).toBe("pending");
    expect(afterwards.id).not.toBe(handover.id);
  });

  it("can be declined by the offered member, after which nothing is pending", async () => {
    const tenant = await createTenant("eim1-decline");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);

    const declined = await declineOwnershipHandover(tenant.actors.member, tenant.org.id);
    expect(declined.status).toBe("declined");
    expect(declined.resolvedAt).not.toBeNull();

    expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
    const accept = await refusal(acceptOwnershipHandover(tenant.actors.member, tenant.org.id));
    expect(accept.reason).toBe("nothing_pending");
    expect((await orgRepo.findOrgById(tenant.org.id))?.ownerId).toBe(tenant.userIds.owner);

    const again = await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);
    expect(again.status).toBe("pending");
  });

  it("can be withdrawn only by the owner who offered it", async () => {
    const tenant = await createTenant("eim1-cancel");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.admin);

    await expect(
      cancelOwnershipHandover(tenant.actors.admin, tenant.org.id),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    const canceled = await cancelOwnershipHandover(tenant.actors.owner, tenant.org.id);
    expect(canceled.status).toBe("canceled");

    const nothing = await refusal(cancelOwnershipHandover(tenant.actors.owner, tenant.org.id));
    expect(nothing.reason).toBe("nothing_pending");
    const accept = await refusal(acceptOwnershipHandover(tenant.actors.admin, tenant.org.id));
    expect(accept.reason).toBe("nothing_pending");
  });

  it("is withdrawn when the offered member leaves the workspace", async () => {
    const tenant = await createTenant("eim1-target-leaves");
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.viewer);

    await memberService.removeMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, "viewer"),
    });

    expect(await getPendingOwnershipHandover(tenant.actors.owner, tenant.org.id)).toBeNull();
    const accept = await refusal(acceptOwnershipHandover(tenant.actors.viewer, tenant.org.id));
    expect(accept.reason).toBe("nothing_pending");
    expect((await orgRepo.findOrgById(tenant.org.id))?.ownerId).toBe(tenant.userIds.owner);
  });

  it("is withdrawn when the offering owner leaves the workspace", async () => {
    const tenant = await createTenant("eim1-owner-leaves");
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, "admin"),
      role: "owner",
    });
    await initiateOwnershipHandover(tenant.actors.owner, tenant.org.id, tenant.userIds.member);

    await memberService.removeMember(
      { ...tenant.actors.admin, role: "owner" },
      { orgId: tenant.org.id, memberId: await memberIdOf(tenant, "owner") },
    );

    expect(await getPendingOwnershipHandover(tenant.actors.member, tenant.org.id)).toBeNull();
    const accept = await refusal(acceptOwnershipHandover(tenant.actors.member, tenant.org.id));
    expect(accept.reason).toBe("nothing_pending");
    expect(await roleOf(tenant, tenant.userIds.member)).toBe("member");
  });

  it("maps a refused handover to the conflict error code", () => {
    const error = new OwnershipHandoverError("expired");
    expect(error.code).toBe("conflict");
    expect(isDomainError(error)).toBe(true);
    expect(toAppError(error).code).toBe("conflict");
  });
});
