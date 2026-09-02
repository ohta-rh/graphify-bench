import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  PLAN_ORDER,
  UNLIMITED,
  getLimit,
  getPlanLimits,
  planAtLeast,
  wouldExceedLimit,
} from "@/config/plan-limits";
import { PLAN_IDS } from "@/types/billing";
import type { LimitedResource, PlanId } from "@/types/billing";

const NUMERIC_RESOURCES: LimitedResource[] = [
  "seats",
  "projects",
  "issuesPerProject",
  "storageMb",
  "apiRequestsPerHour",
  "webhooks",
];

describe("plan limits", () => {
  it("declares limits for every plan id, with no gaps", () => {
    for (const plan of PLAN_IDS) {
      expect(getPlanLimits(plan).plan).toBe(plan);
    }
    expect(PLAN_ORDER).toEqual([...PLAN_IDS]);
  });

  it("never lowers a quota as the plan gets richer", () => {
    for (const resource of NUMERIC_RESOURCES) {
      let previous = -1;
      for (const plan of PLAN_ORDER) {
        const limit = getLimit(plan, resource);
        expect(limit).toBeGreaterThanOrEqual(previous);
        previous = limit;
      }
    }
  });

  it("treats enterprise seats as unlimited", () => {
    expect(PLAN_LIMITS.enterprise.seats).toBe(UNLIMITED);
    expect(wouldExceedLimit("enterprise", "seats", 1_000_000, 1)).toBe(false);
  });

  it("wouldExceedLimit compares used + requested against the quota", () => {
    expect(wouldExceedLimit("free", "seats", 2, 1)).toBe(false);
    expect(wouldExceedLimit("free", "seats", 3, 1)).toBe(true);
    expect(wouldExceedLimit("free", "projects", 1)).toBe(false);
    expect(wouldExceedLimit("free", "projects", 2)).toBe(true);
  });

  it("planAtLeast orders plans cheapest to richest", () => {
    expect(planAtLeast("growth", "starter")).toBe(true);
    expect(planAtLeast("starter", "growth")).toBe(false);
    expect(planAtLeast("free", "free")).toBe(true);
  });

  it("grows the included flag set monotonically with the plan", () => {
    let previous = 0;
    for (const plan of PLAN_ORDER as PlanId[]) {
      const count = getPlanLimits(plan).includedFlags.length;
      expect(count).toBeGreaterThanOrEqual(previous);
      previous = count;
    }
  });

  it("gives the free plan no webhooks", () => {
    expect(getLimit("free", "webhooks")).toBe(0);
    expect(wouldExceedLimit("free", "webhooks", 0, 1)).toBe(true);
  });
});
