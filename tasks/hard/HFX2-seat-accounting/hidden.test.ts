/**
 * HFX2 — seats are given back when members are removed and invitations revoked.
 *
 * The seat usage the billing page and the plan checks read must drop as soon
 * as a member is removed and stay dropped after the periodic usage recount;
 * a revoked invitation must stop holding a seat, so re-sending an invitation
 * in a full workspace works.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";
import * as memberRepo from "@/server/repositories/member-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as billingService from "@/server/services/billing-service";
import * as invitationService from "@/server/services/invitation-service";
import * as memberService from "@/server/services/member-service";
import * as usageService from "@/server/services/usage-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";
import type { Role } from "@/types/member";

let cleanup: () => void;
let detach: Unsubscribe;

const NOW = new Date("2026-06-01T03:00:00.000Z");

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  detach = usageService.registerUsageListeners();
});

afterAll(() => {
  detach();
  cleanup();
});

async function removeRole(tenant: Tenant, role: Role) {
  const member = await memberRepo.findMember(tenant.org.id, tenant.userIds[role]);
  if (!member) throw new Error(`fixture has no ${role}`);
  return memberService.removeMember(tenant.actors.owner, {
    orgId: tenant.org.id,
    memberId: member.id,
  });
}

async function seatsUsed(tenant: Tenant): Promise<number> {
  return (await billingService.checkLimit(tenant.org.id, "seats", 0)).used;
}

function invite(tenant: Tenant, email: string) {
  return invitationService.inviteMember(tenant.actors.owner, {
    orgId: tenant.org.id,
    email,
    role: "member",
  });
}

async function fillStarterSeats(tenant: Tenant) {
  // Starter includes 10 seats; the fixture already has 4 members.
  return invitationService.inviteMembers(tenant.actors.owner, {
    orgId: tenant.org.id,
    invites: Array.from({ length: 6 }, (_, i) => ({
      email: `pending-${i}@${tenant.org.slug}.test`,
      role: "member" as const,
    })),
  });
}

describe("HFX2: removing a member gives the seat back", () => {
  it("drops seat usage as soon as the member is removed", async () => {
    const tenant = await createTenant("hfx2-immediate", "growth");
    await usageService.recomputeUsage(tenant.org.id);
    expect(await seatsUsed(tenant)).toBe(4);

    await removeRole(tenant, "viewer");

    expect(await seatsUsed(tenant)).toBe(3);
    const summary = await billingService.getBillingSummary(tenant.actors.owner, tenant.org.id);
    expect(summary.checks.find((check) => check.resource === "seats")?.used).toBe(3);
  });

  it("keeps the seat released after the periodic usage recount", async () => {
    const tenant = await createTenant("hfx2-recount", "growth");
    await usageService.recomputeUsage(tenant.org.id);

    await removeRole(tenant, "viewer");
    await removeRole(tenant, "member");

    await runUsageRollupJob(NOW);
    expect(await seatsUsed(tenant)).toBe(2);

    const recounted = await usageService.recomputeUsage(tenant.org.id);
    expect(recounted.seatsUsed).toBe(2);
  });

  it("lets a workspace downgrade once it has removed enough members", async () => {
    const tenant = await createTenant("hfx2-downgrade", "growth");
    await usageService.recomputeUsage(tenant.org.id);

    // Free includes 3 seats; four members do not fit.
    await expect(
      billingService.changePlan(tenant.actors.owner, {
        orgId: tenant.org.id,
        plan: "free",
        interval: "monthly",
      }),
    ).rejects.toThrow();

    await removeRole(tenant, "viewer");

    const subscription = await billingService.changePlan(tenant.actors.owner, {
      orgId: tenant.org.id,
      plan: "free",
      interval: "monthly",
    });
    expect(subscription.plan).toBe("free");
    expect((await subscriptionRepo.findSubscription(tenant.org.id))?.plan).toBe("free");
  });
});

describe("HFX2: revoking an invitation gives the seat back", () => {
  it("frees the seat of a revoked invitation for a new invite", async () => {
    const tenant = await createTenant("hfx2-revoke", "starter");
    const pending = await fillStarterSeats(tenant);

    await expect(invite(tenant, "one-too-many@hfx2-revoke.test")).rejects.toThrow();

    await invitationService.revokeInvitation(tenant.actors.owner, pending[0]!.id);

    const fresh = await invite(tenant, "replacement@hfx2-revoke.test");
    expect(fresh.email).toBe("replacement@hfx2-revoke.test");

    // Full again: the replacement took the freed seat.
    await expect(invite(tenant, "still-too-many@hfx2-revoke.test")).rejects.toThrow();
  });

  it("re-sends an invitation in a full workspace without taking a second seat", async () => {
    const tenant = await createTenant("hfx2-resend", "starter");
    const pending = await fillStarterSeats(tenant);

    const resent = await invitationService.resendInvitation(tenant.actors.owner, pending[2]!.id);
    expect(resent.email).toBe(pending[2]!.email);
    expect(resent.id).not.toBe(pending[2]!.id);

    // The re-sent invitation replaced the old one; the workspace is still full.
    await expect(invite(tenant, "after-resend@hfx2-resend.test")).rejects.toThrow();
  });

  it("still refuses an invite into a genuinely full workspace", async () => {
    const tenant = await createTenant("hfx2-full", "starter");
    await fillStarterSeats(tenant);
    await expect(invite(tenant, "nope@hfx2-full.test")).rejects.toThrow();
  });
});
