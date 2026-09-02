/** Plan ordering, `wouldExceedLimit` and the enterprise unlimited sentinel. */
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
import { PLAN_IDS, type LimitedResource } from "@/types/billing";

const RESOURCES: readonly LimitedResource[] = [
  "seats",
  "projects",
  "issuesPerProject",
  "storageMb",
  "apiRequestsPerHour",
  "webhooks",
];

describe("config/plan-limits", () => {
  it("declares limits for every plan id", () => {
    for (const plan of PLAN_IDS) {
      expect(getPlanLimits(plan).plan).toBe(plan);
    }
    expect([...PLAN_ORDER].sort()).toEqual([...PLAN_IDS].sort());
  });

  it("never shrinks a quota as the plan gets richer", () => {
    for (const resource of RESOURCES) {
      for (let i = 1; i < PLAN_ORDER.length; i += 1) {
        const previous = PLAN_ORDER[i - 1];
        const current = PLAN_ORDER[i];
        if (!previous || !current) continue;
        expect(
          getLimit(current, resource),
          `${resource}: ${current} vs ${previous}`,
        ).toBeGreaterThanOrEqual(getLimit(previous, resource));
      }
    }
  });

  it("orders plans cheapest to richest", () => {
    expect(planAtLeast("growth", "starter")).toBe(true);
    expect(planAtLeast("starter", "growth")).toBe(false);
    expect(planAtLeast("free", "free")).toBe(true);
    expect(planAtLeast("enterprise", "free")).toBe(true);
  });

  it("uses Infinity as the unlimited sentinel on enterprise", () => {
    expect(PLAN_LIMITS.enterprise.seats).toBe(UNLIMITED);
    expect(Number.isFinite(PLAN_LIMITS.enterprise.projects)).toBe(false);
    expect(Number.isFinite(PLAN_LIMITS.free.projects)).toBe(true);
  });

  it("never exceeds an unlimited quota", () => {
    expect(wouldExceedLimit("enterprise", "seats", 1_000_000)).toBe(false);
    expect(wouldExceedLimit("enterprise", "projects", 10_000, 10_000)).toBe(false);
  });

  it("refuses the request that would cross the boundary, not the one that reaches it", () => {
    // free allows 3 seats
    expect(wouldExceedLimit("free", "seats", 2)).toBe(false);
    expect(wouldExceedLimit("free", "seats", 3)).toBe(true);
    expect(wouldExceedLimit("free", "seats", 0, 3)).toBe(false);
    expect(wouldExceedLimit("free", "seats", 0, 4)).toBe(true);
  });

  it("blocks webhooks entirely on the free plan", () => {
    expect(getLimit("free", "webhooks")).toBe(0);
    expect(wouldExceedLimit("free", "webhooks", 0)).toBe(true);
    expect(wouldExceedLimit("starter", "webhooks", 0)).toBe(false);
  });

  it("reads a single quota without destructuring PlanLimits", () => {
    for (const resource of RESOURCES) {
      expect(getLimit("growth", resource)).toBe(PLAN_LIMITS.growth[resource]);
    }
  });

  it("includes strictly more flags on each richer plan", () => {
    for (let i = 1; i < PLAN_ORDER.length; i += 1) {
      const previous = PLAN_ORDER[i - 1];
      const current = PLAN_ORDER[i];
      if (!previous || !current) continue;
      const richer = new Set(getPlanLimits(current).includedFlags);
      for (const flag of getPlanLimits(previous).includedFlags) {
        expect(richer.has(flag), `${current} should include ${flag}`).toBe(true);
      }
    }
  });

  it("prices seats monotonically, starting free", () => {
    expect(PLAN_LIMITS.free.priceCentsPerSeatMonthly).toBe(0);
    for (let i = 1; i < PLAN_ORDER.length; i += 1) {
      const previous = PLAN_ORDER[i - 1];
      const current = PLAN_ORDER[i];
      if (!previous || !current) continue;
      expect(
        getPlanLimits(current).priceCentsPerSeatMonthly,
      ).toBeGreaterThan(getPlanLimits(previous).priceCentsPerSeatMonthly);
    }
  });
});
