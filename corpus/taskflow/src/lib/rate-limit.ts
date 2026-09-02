/**
 * Token-bucket limiter applied to invites, comments, search and password resets.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import type { IsoTimestamp, OrgId } from "@/types/common";
export async function consumeRateLimit(orgId: OrgId, bucketKey: string, cost?: number): Promise<RateLimitVerdict> {
  throw new Error("stub: src/lib/rate-limit.ts");
}

export function getBucketConfig(bucketKey: string): RateLimitConfig {
  throw new Error("stub: src/lib/rate-limit.ts");
}

export type RateLimitVerdict = { allowed: boolean; remaining: number; resetAt: IsoTimestamp };

export type RateLimitConfig = { capacity: number; refillPerMinute: number };

export const RATE_LIMIT_BUCKETS: Readonly<Record<string, RateLimitConfig>> = undefined as unknown as Readonly<Record<string, RateLimitConfig>>;
