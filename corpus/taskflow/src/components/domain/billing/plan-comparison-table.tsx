/**
 * Side-by-side quota table for all four plans.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getPlanLimits
 */
import type { PlanId } from "@/types/billing";
import type { ReactElement } from "react";
export type PlanComparisonTableProps = { currentPlan: PlanId; onSelect: (plan: PlanId) => void };

export function PlanComparisonTable(props: PlanComparisonTableProps): ReactElement | null {
  return null;
}
