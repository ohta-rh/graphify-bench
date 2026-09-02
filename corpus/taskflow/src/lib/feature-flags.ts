import {
  FEATURE_FLAG_DEFINITIONS,
  FEATURE_FLAG_KEYS,
} from "@/config/feature-flags";
import { planAtLeast } from "@/config/plan-limits";
import { ROLE_RANK } from "@/types/member";
import type {
  FeatureFlagKey,
  FeatureFlagSnapshot,
  FlagContext,
} from "@/types/feature-flag";

/**
 * Feature-flag evaluation, shared verbatim by server and client.
 *
 * Server code builds a `FlagContext` from the session and calls `isEnabled()`
 * directly; the dashboard layout serialises `snapshotFlags()` into the client
 * provider so `useFeatureFlag()` answers the same way without a round trip.
 * Both sides must agree — never re-implement a strategy at a call site.
 */
export function isEnabled(flag: FeatureFlagKey, ctx: FlagContext): boolean {
  const definition = FEATURE_FLAG_DEFINITIONS[flag];
  if (!definition) return false;

  if (definition.overridable && ctx.overrides?.includes(flag)) {
    return true;
  }

  const strategy = definition.strategy;
  switch (strategy.kind) {
    case "off":
      return false;
    case "on":
      return true;
    case "plan":
      return planAtLeast(ctx.plan, strategy.minPlan);
    case "role":
      return ctx.role !== null && ROLE_RANK[ctx.role] >= ROLE_RANK[strategy.minRole];
    case "percentage":
      return bucketOf(flag, ctx) < strategy.percent;
    default:
      return false;
  }
}

/** Evaluates every flag at once, for handoff to the client provider. */
export function snapshotFlags(ctx: FlagContext): FeatureFlagSnapshot {
  const snapshot = {} as Record<FeatureFlagKey, boolean>;
  for (const key of FEATURE_FLAG_KEYS) {
    snapshot[key] = isEnabled(key, ctx);
  }
  return snapshot;
}

/** Throwing guard for server actions gated behind a flag. */
export class FeatureDisabledError extends Error {
  readonly code = "forbidden" as const;

  constructor(readonly flag: FeatureFlagKey) {
    super(`Feature "${flag}" is not enabled for this organization.`);
    this.name = "FeatureDisabledError";
  }
}

export function assertEnabled(flag: FeatureFlagKey, ctx: FlagContext): void {
  if (!isEnabled(flag, ctx)) {
    throw new FeatureDisabledError(flag);
  }
}

/**
 * Deterministic 0–99 bucket for percentage rollouts. Stable per
 * (flag, org, user) so a viewer never sees the feature flicker.
 */
function bucketOf(flag: FeatureFlagKey, ctx: FlagContext): number {
  const seed = `${flag}:${ctx.orgId ?? "-"}:${ctx.userId ?? "-"}`;
  let hash = 2_166_136_261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash) % 100;
}
