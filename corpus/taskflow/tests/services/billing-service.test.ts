/**
 * `checkLimit` arithmetic and downgrade refusal.
 *
 * Owner C implements `@/server/services/billing-service`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as billingService from "@/server/services/billing-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

describe("services/billing-service", () => {
  // checkLimit reads the ceiling from getPlanLimits(), never a hard-coded number.
  it("computes remaining and exceeded from the plan's quota", async () => {
    const tenant = await createTenant("billing-remaining", "starter");
    await usageRepo.incrementUsage(tenant.org.id, { seatsUsed: 4 });

    const check = await billingService.checkLimit(tenant.org.id, "seats", 1);

    expect(check.plan).toBe("starter");
    expect(check.limit).toBe(10);
    expect(check.used).toBe(4);
    expect(check.remaining).toBe(6);
    expect(check.exceeded).toBe(false);
  });

  // At exactly the quota the resource is exceeded and remaining is zero.
  it("marks a resource exceeded at, not past, the quota", async () => {
    const tenant = await createTenant("billing-exact", "starter");
    await usageRepo.incrementUsage(tenant.org.id, { seatsUsed: 10 });

    const check = await billingService.checkLimit(tenant.org.id, "seats");

    expect(check.limit).toBe(10);
    expect(check.used).toBe(10);
    expect(check.remaining).toBe(0);
    expect(check.exceeded).toBe(true);
  });

  // An unlimited enterprise quota is never exceeded and reports Infinity remaining.
  it("never marks an unlimited quota exceeded", async () => {
    const tenant = await createTenant("billing-unlimited", "enterprise");
    await usageRepo.incrementUsage(tenant.org.id, { seatsUsed: 1_000_000 });

    const check = await billingService.checkLimit(tenant.org.id, "seats", 500);

    expect(check.limit).toBe(Number.POSITIVE_INFINITY);
    expect(check.exceeded).toBe(false);
    expect(check.remaining).toBe(Number.POSITIVE_INFINITY);
  });

  // A downgrade whose current usage breaches the target plan is refused.
  it("refuses a downgrade that current usage would breach", async () => {
    const tenant = await createTenant("billing-downgrade", "growth");
    await usageRepo.incrementUsage(tenant.org.id, { seatsUsed: 5 });

    await expect(
      billingService.changePlan(tenant.actors.owner, {
        orgId: tenant.org.id,
        plan: "free",
        interval: "monthly",
      }),
    ).rejects.toThrow(/seats exceeds its limit/);
  });

  // billing.plan_changed carries the previous and new plan.
  it("emits billing.plan_changed on a successful plan change", async () => {
    const tenant = await createTenant("billing-plan-changed", "growth");

    let off: Unsubscribe | undefined;
    const received = await new Promise((resolve) => {
      off = subscribe("billing.plan_changed", (payload) => {
        resolve(payload);
      });
      void billingService.changePlan(tenant.actors.owner, {
        orgId: tenant.org.id,
        plan: "enterprise",
        interval: "monthly",
      });
    });
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      from: "growth",
      to: "enterprise",
    });
  });

  // Crossing a ceiling emits billing.limit_exceeded with resource, limit and used.
  it("emits billing.limit_exceeded when a ceiling is crossed", async () => {
    const tenant = await createTenant("billing-limit-exceeded", "starter");
    await usageRepo.incrementUsage(tenant.org.id, { projectsUsed: 10 });

    let off: Unsubscribe | undefined;
    const receivedPromise = new Promise((resolve) => {
      off = subscribe("billing.limit_exceeded", (payload) => {
        resolve(payload);
      });
    });

    await expect(
      billingService.assertWithinLimit(tenant.org.id, "projects", 1),
    ).rejects.toThrow(/allows 10 projects/);

    const received = await receivedPromise;
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      resource: "projects",
      limit: 10,
      used: 10,
    });
  });

  // can(actor, "org:manage_billing", …) — only an owner may change the plan.
  it("refuses a plan change to anyone but an owner", async () => {
    const tenant = await createTenant("billing-owner-only", "growth");

    await expect(
      billingService.changePlan(tenant.actors.admin, {
        orgId: tenant.org.id,
        plan: "enterprise",
        interval: "monthly",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});
