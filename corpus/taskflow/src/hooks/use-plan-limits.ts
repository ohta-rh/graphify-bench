"use client";

/**
 * Exposes the org's quotas to the UI.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import type { PlanLimits } from "@/config/plan-limits";
import type { LimitCheck, LimitedResource } from "@/types/billing";
export function usePlanLimits(): { limits: PlanLimits; checks: readonly LimitCheck[]; isExceeded: (resource: LimitedResource) => boolean } {
  throw new Error("stub: src/hooks/use-plan-limits.ts");
}
