/**
 * Plan-limit enforcement on the write paths.
 *
 * `PLAN_LIMITS` is the single source of the numbers and `wouldExceedLimit()`
 * the single comparison; these cases prove the services actually consult them
 * before writing, and that a pending invitation already holds its seat.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);
// The only double left in this suite. `@/lib/rate-limit` is real everywhere
// else, but these cases need to *choose* the verdict — the seat-quota refusal
// has to be provably about seats and not about a bucket the previous case
// happened to drain, and the throttling case needs a guaranteed denial.
vi.mock("@/lib/rate-limit", async () => (await import("./_support/doubles/misc")).rateLimitModule);

import { getPlanLimits } from "@/config/plan-limits";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as billingService from "@/server/services/billing-service";
import * as invitationService from "@/server/services/invitation-service";
import * as projectService from "@/server/services/project-service";
import * as usageService from "@/server/services/usage-service";
import { rateLimitState } from "./_support/doubles/misc";
import { createTenant, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";

let cleanup: () => void;
/** Free plan: 3 seats, 2 projects. The fixture seeds four members. */
let free: Tenant;
let growth: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  free = await createTenant("frugal", "free");
  growth = await createTenant("growing", "growth");
});

afterAll(() => {
  cleanup();
  rateLimitState.allowed = true;
});

describe("seat quota on invite", () => {
  it("rejects an invite once the plan's seats are taken", async () => {
    expect(getPlanLimits("free").seats).toBe(3);
    await expect(memberRepo.countActiveMembers(free.org.id)).resolves.toBe(4);

    await expect(
      invitationService.inviteMember(free.actors.owner, {
        orgId: free.org.id,
        email: "fifth@frugal.test",
        role: "member",
      }),
    ).rejects.toThrow(/seats/i);
  });

  it("writes no invitation row when the quota rejects the batch", async () => {
    await expect(
      invitationRepo.countPendingInvitations(free.org.id),
    ).resolves.toBe(0);
  });

  it("rejects a bulk invite as a whole rather than partially filling it", async () => {
    const limits = getPlanLimits("growth");
    expect(limits.seats).toBe(50);

    const invites = Array.from({ length: 49 }, (_, index) => ({
      email: `bulk-${index}@growing.test`,
      role: "member" as const,
    }));

    await expect(
      invitationService.inviteMembers(growth.actors.owner, {
        orgId: growth.org.id,
        invites,
      }),
    ).rejects.toThrow(/seats/i);

    await expect(
      invitationRepo.countPendingInvitations(growth.org.id),
    ).resolves.toBe(0);
  });

  it("counts a pending invitation against the seat quota", async () => {
    const before = await invitationRepo.countPendingInvitations(growth.org.id);

    await invitationService.inviteMember(growth.actors.owner, {
      orgId: growth.org.id,
      email: "solo@growing.test",
      role: "member",
    });

    await expect(
      invitationRepo.countPendingInvitations(growth.org.id),
    ).resolves.toBe(before + 1);
  });

  it("refuses the invite when the rate limiter says no", async () => {
    rateLimitState.allowed = false;

    await expect(
      invitationService.inviteMember(growth.actors.owner, {
        orgId: growth.org.id,
        email: "throttled@growing.test",
        role: "member",
      }),
    ).rejects.toThrow(/rate limit/i);

    rateLimitState.allowed = true;
  });
});

describe("project quota", () => {
  it("rejects the project that would exceed the plan", async () => {
    expect(getPlanLimits("free").projects).toBe(2);

    // The fixture already created one project; this fills the plan.
    await projectService.createProject(free.actors.owner, {
      orgId: free.org.id,
      name: "Second",
      slug: "second",
      key: "SEC",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    await expect(
      projectService.createProject(free.actors.owner, {
        orgId: free.org.id,
        name: "Third",
        slug: "third",
        key: "THR",
        description: null,
        visibility: "org",
        leadId: null,
        color: "#6366f1",
        targetDate: null,
      }),
    ).rejects.toThrow(/projects/i);
  });
});

describe("BillingService.checkLimit", () => {
  it("reports the plan, the usage and whether one more would breach", async () => {
    await usageService.recomputeUsage(free.org.id);

    const check = await billingService.checkLimit(free.org.id, "seats");

    expect(check).toMatchObject({
      resource: "seats",
      plan: "free",
      limit: 3,
      used: 4,
      remaining: 0,
      exceeded: true,
    });
  });

  it("leaves an org with room under its limit", async () => {
    await usageService.recomputeUsage(growth.org.id);

    const check = await billingService.checkLimit(growth.org.id, "seats");
    expect(check.exceeded).toBe(false);
    expect(check.remaining).toBeGreaterThan(0);
  });
});
