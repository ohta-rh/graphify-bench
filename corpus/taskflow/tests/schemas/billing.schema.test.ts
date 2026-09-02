/** Plan/interval enums and seat bounds. */
import { describe, expect, it } from "vitest";
import {
  billingIntervalSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  limitedResourceSchema,
  planIdSchema,
  subscriptionStatusSchema,
  updateSeatsSchema,
} from "@/schemas/billing";
import { PLAN_IDS } from "@/types/billing";
import { ORG_A } from "../helpers/factories";

describe("schemas/billing", () => {
  it("accepts exactly the plan ids the domain declares", () => {
    for (const plan of PLAN_IDS) {
      expect(planIdSchema.safeParse(plan).success, plan).toBe(true);
    }
    expect(planIdSchema.safeParse("platinum").success).toBe(false);
  });

  it("accepts only the two billing intervals", () => {
    expect(billingIntervalSchema.safeParse("monthly").success).toBe(true);
    expect(billingIntervalSchema.safeParse("annual").success).toBe(true);
    expect(billingIntervalSchema.safeParse("weekly").success).toBe(false);
  });

  it("accepts the subscription lifecycle states", () => {
    for (const status of ["trialing", "active", "past_due", "canceled"]) {
      expect(subscriptionStatusSchema.safeParse(status).success, status).toBe(true);
    }
    expect(subscriptionStatusSchema.safeParse("paused").success).toBe(false);
  });

  it("accepts every limited resource dimension", () => {
    for (const resource of [
      "seats",
      "projects",
      "issuesPerProject",
      "storageMb",
      "apiRequestsPerHour",
      "webhooks",
    ]) {
      expect(limitedResourceSchema.safeParse(resource).success, resource).toBe(true);
    }
    expect(limitedResourceSchema.safeParse("bandwidth").success).toBe(false);
  });

  it("defaults a plan change to the monthly interval", () => {
    expect(changePlanSchema.parse({ orgId: ORG_A, plan: "growth" })).toEqual({
      orgId: ORG_A,
      plan: "growth",
      interval: "monthly",
    });
  });

  it("requires a ULID org id on a plan change", () => {
    expect(changePlanSchema.safeParse({ orgId: "acme", plan: "growth" }).success).toBe(
      false,
    );
  });

  it("bounds seats to a whole number between 1 and 10,000", () => {
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: 1 }).success).toBe(true);
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: 10_000 }).success).toBe(
      true,
    );
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: 0 }).success).toBe(false);
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: -1 }).success).toBe(false);
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: 2.5 }).success).toBe(false);
    expect(updateSeatsSchema.safeParse({ orgId: ORG_A, seats: 10_001 }).success).toBe(
      false,
    );
  });

  it("defaults cancellation to end-of-period and keeps the reason optional", () => {
    expect(cancelSubscriptionSchema.parse({ orgId: ORG_A })).toEqual({
      orgId: ORG_A,
      cancelImmediately: false,
    });
    expect(
      cancelSubscriptionSchema.parse({ orgId: ORG_A, reason: "too expensive" }).reason,
    ).toBe("too expensive");
  });

  it("caps the cancellation reason at 500 characters", () => {
    expect(
      cancelSubscriptionSchema.safeParse({ orgId: ORG_A, reason: "x".repeat(501) })
        .success,
    ).toBe(false);
  });
});
