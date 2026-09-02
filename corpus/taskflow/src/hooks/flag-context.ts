"use client";

/**
 * Client-side plumbing for feature flags.
 *
 * The server evaluates every flag once per request with `snapshotFlags()` and
 * serialises the result into `FeatureFlagProvider`. The client therefore reads
 * the snapshot rather than re-deriving anything — but when a key is missing
 * (a snapshot serialised before a newly shipped flag existed) we fall back to
 * `isEnabled()` so there is still exactly one evaluator in the codebase.
 */
import { createContext } from "react";
import { isEnabled } from "@/lib/feature-flags";
import type {
  FeatureFlagKey,
  FeatureFlagSnapshot,
  FlagContext,
} from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

/** Context for a signed-out / pre-hydration reader: free plan, no role. */
export const ANONYMOUS_FLAG_CONTEXT: FlagContext = {
  orgId: null,
  userId: null,
  plan: "free",
  role: null,
};

/** The full evaluation context for a member browsing one organization. */
export function orgFlagContext(org: Organization, actor: Actor): FlagContext {
  return {
    orgId: org.id,
    userId: actor.userId,
    plan: org.plan,
    role: actor.role,
    overrides: org.settings.enabledFlagOverrides,
  };
}

/**
 * Reads one flag out of a server-evaluated snapshot, falling back to a live
 * `isEnabled()` evaluation when the snapshot predates the flag.
 */
export function readFlag(
  snapshot: FeatureFlagSnapshot | null,
  flag: FeatureFlagKey,
  context: FlagContext = ANONYMOUS_FLAG_CONTEXT,
): boolean {
  const evaluated = snapshot?.[flag];
  return typeof evaluated === "boolean"
    ? evaluated
    : isEnabled(flag, context);
}

export const FlagSnapshotContext = createContext<FeatureFlagSnapshot | null>(
  null,
);
