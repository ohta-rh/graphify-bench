/**
 * Token-bucket limiter applied to invites, comments, search and password
 * resets.
 *
 * Buckets are keyed by `(orgId, bucketKey)` and held in process — Taskflow
 * runs single-writer, and the corpus has no external cache. Capacity scales
 * with the org's plan through `getPlanLimits()`, so a growth org is not held
 * to a free org's ceiling; the per-bucket shape below is the base rate.
 */
import { getPlanLimits } from "@/config/plan-limits";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, OrgId } from "@/types/common";
import { toIsoTimestamp } from "@/types/common";

export type RateLimitVerdict = {
  allowed: boolean;
  remaining: number;
  resetAt: IsoTimestamp;
};

export type RateLimitConfig = { capacity: number; refillPerMinute: number };

export const RATE_LIMIT_BUCKETS: Readonly<Record<string, RateLimitConfig>> = {
  "member:invite": { capacity: 20, refillPerMinute: 2 },
  "comment:create": { capacity: 60, refillPerMinute: 20 },
  "issue:create": { capacity: 60, refillPerMinute: 20 },
  "search:query": { capacity: 120, refillPerMinute: 60 },
  "auth:password-reset": { capacity: 5, refillPerMinute: 1 },
  "webhook:deliver": { capacity: 100, refillPerMinute: 50 },
};

/** Applied to any key not in the table above. */
const DEFAULT_BUCKET: RateLimitConfig = { capacity: 30, refillPerMinute: 10 };

type BucketState = { tokens: number; updatedAt: number };

const buckets = new Map<string, BucketState>();

/** Plan-aware org context; services set this when they know the org's plan. */
const planByOrg = new Map<OrgId, PlanId>();

/** Records an org's plan so subsequent bucket sizes scale with its quota. */
export function setOrgPlan(orgId: OrgId, plan: PlanId): void {
  planByOrg.set(orgId, plan);
}

export function getBucketConfig(bucketKey: string): RateLimitConfig {
  return RATE_LIMIT_BUCKETS[bucketKey] ?? DEFAULT_BUCKET;
}

/**
 * Scales the base bucket by the org's hourly API allowance, so the limiter
 * and the plan catalogue can never drift apart: the plan is the source of
 * the ceiling, this table only sets the relative shape.
 */
function configFor(orgId: OrgId, bucketKey: string): RateLimitConfig {
  const base = getBucketConfig(bucketKey);
  const plan = planByOrg.get(orgId) ?? "free";
  const hourly = getPlanLimits(plan).apiRequestsPerHour;
  const factor = Number.isFinite(hourly) ? Math.max(1, hourly / 100) : 100;

  return {
    capacity: Math.min(base.capacity * factor, base.capacity * 100),
    refillPerMinute: Math.min(
      base.refillPerMinute * factor,
      base.refillPerMinute * 100,
    ),
  };
}

/**
 * Spends `cost` tokens from the bucket, refilling first for the elapsed time.
 * Async because the production limiter is expected to move behind a store —
 * every call site already awaits it.
 */
export async function consumeRateLimit(
  orgId: OrgId,
  bucketKey: string,
  cost = 1,
): Promise<RateLimitVerdict> {
  const config = configFor(orgId, bucketKey);
  const key = `${orgId}:${bucketKey}`;
  const nowMs = Date.now();

  const state = buckets.get(key) ?? { tokens: config.capacity, updatedAt: nowMs };
  const elapsedMinutes = (nowMs - state.updatedAt) / 60_000;
  const tokens = Math.min(
    config.capacity,
    state.tokens + elapsedMinutes * config.refillPerMinute,
  );

  const allowed = tokens >= cost;
  const remaining = allowed ? tokens - cost : tokens;
  buckets.set(key, { tokens: remaining, updatedAt: nowMs });

  const deficit = allowed ? config.capacity - remaining : cost - remaining;
  const minutesToReset =
    config.refillPerMinute > 0 ? Math.max(0, deficit) / config.refillPerMinute : 0;

  return {
    allowed,
    remaining: Math.floor(remaining),
    resetAt: toIsoTimestamp(new Date(nowMs + minutesToReset * 60_000)),
  };
}

/** Test-only: drops every bucket and org plan association. */
export function resetRateLimits(): void {
  buckets.clear();
  planByOrg.clear();
}
