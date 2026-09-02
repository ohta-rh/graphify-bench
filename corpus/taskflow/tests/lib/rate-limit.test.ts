/** Token-bucket refill and exhaustion. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPlanLimits } from "@/config/plan-limits";
import {
  RATE_LIMIT_BUCKETS,
  consumeRateLimit,
  getBucketConfig,
  resetRateLimits,
  setOrgPlan,
} from "@/lib/rate-limit";
import { ORG_A, ORG_B } from "../helpers/factories";

beforeEach(() => {
  resetRateLimits();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("lib/rate-limit", () => {
  it("returns the declared config for a known bucket", () => {
    expect(getBucketConfig("member:invite")).toEqual(
      RATE_LIMIT_BUCKETS["member:invite"],
    );
  });

  it("falls back to a default config for an unknown bucket", () => {
    const config = getBucketConfig("something:new");
    expect(config.capacity).toBeGreaterThan(0);
    expect(config.refillPerMinute).toBeGreaterThan(0);
  });

  it("allows a first request and reports the remaining tokens", async () => {
    const verdict = await consumeRateLimit(ORG_A, "member:invite");
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBe(19);
  });

  it("exhausts the bucket and then refuses", async () => {
    const capacity = getBucketConfig("auth:password-reset").capacity;
    for (let i = 0; i < capacity; i += 1) {
      expect((await consumeRateLimit(ORG_A, "auth:password-reset")).allowed).toBe(true);
    }

    const denied = await consumeRateLimit(ORG_A, "auth:password-reset");
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
  });

  it("refills over time at the declared rate", async () => {
    const { capacity, refillPerMinute } = getBucketConfig("auth:password-reset");
    for (let i = 0; i < capacity; i += 1) {
      await consumeRateLimit(ORG_A, "auth:password-reset");
    }
    expect((await consumeRateLimit(ORG_A, "auth:password-reset")).allowed).toBe(false);

    vi.advanceTimersByTime(2 * 60_000);
    const after = await consumeRateLimit(ORG_A, "auth:password-reset");
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(2 * refillPerMinute - 1);
  });

  it("never refills past capacity", async () => {
    await consumeRateLimit(ORG_A, "member:invite");
    vi.advanceTimersByTime(24 * 60 * 60_000);

    const verdict = await consumeRateLimit(ORG_A, "member:invite");
    expect(verdict.remaining).toBe(getBucketConfig("member:invite").capacity - 1);
  });

  it("charges the supplied cost", async () => {
    const verdict = await consumeRateLimit(ORG_A, "member:invite", 5);
    expect(verdict.allowed).toBe(true);
    expect(verdict.remaining).toBe(15);
  });

  it("refuses a cost larger than the bucket without spending tokens", async () => {
    const denied = await consumeRateLimit(ORG_A, "auth:password-reset", 999);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(getBucketConfig("auth:password-reset").capacity);
  });

  it("keeps buckets separate per org and per key", async () => {
    const capacity = getBucketConfig("auth:password-reset").capacity;
    for (let i = 0; i < capacity; i += 1) {
      await consumeRateLimit(ORG_A, "auth:password-reset");
    }

    expect((await consumeRateLimit(ORG_A, "auth:password-reset")).allowed).toBe(false);
    expect((await consumeRateLimit(ORG_B, "auth:password-reset")).allowed).toBe(true);
    expect((await consumeRateLimit(ORG_A, "member:invite")).allowed).toBe(true);
  });

  it("scales capacity with the org's plan quota rather than hard-coding it", async () => {
    setOrgPlan(ORG_B, "growth");
    const growth = await consumeRateLimit(ORG_B, "member:invite");
    const free = await consumeRateLimit(ORG_A, "member:invite");

    expect(getPlanLimits("growth").apiRequestsPerHour).toBeGreaterThan(
      getPlanLimits("free").apiRequestsPerHour,
    );
    expect(growth.remaining).toBeGreaterThan(free.remaining);
  });

  it("reports a resetAt in the future when the bucket is empty", async () => {
    const capacity = getBucketConfig("auth:password-reset").capacity;
    for (let i = 0; i < capacity; i += 1) {
      await consumeRateLimit(ORG_A, "auth:password-reset");
    }

    const denied = await consumeRateLimit(ORG_A, "auth:password-reset");
    expect(new Date(denied.resetAt).getTime()).toBeGreaterThan(Date.now());
  });
});
