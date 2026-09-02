"use client";

/**
 * Exposes the org's quotas to the UI.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import { useCallback, useMemo } from "react";
import { getPlanLimits, type PlanLimits } from "@/config/plan-limits";
import type { LimitCheck, LimitedResource } from "@/types/billing";
import { useOrgContext } from "./use-org";

export function usePlanLimits(): {
  limits: PlanLimits;
  checks: readonly LimitCheck[];
  isExceeded: (resource: LimitedResource) => boolean;
} {
  const { org, limitChecks } = useOrgContext();
  const limits = useMemo(() => getPlanLimits(org.plan), [org.plan]);

  const isExceeded = useCallback(
    (resource: LimitedResource): boolean => {
      const check = limitChecks.find((c) => c.resource === resource);
      if (check !== undefined) return check.exceeded;
      // No measurement for this dimension yet: a quota of 0 is still a wall.
      return limits[resource] <= 0;
    },
    [limitChecks, limits],
  );

  return { limits, checks: limitChecks, isExceeded };
}
