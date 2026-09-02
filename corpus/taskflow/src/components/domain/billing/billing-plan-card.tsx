/**
 * One plan tile rendering quotas straight from `PlanLimits`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getPlanLimits, can
 */
import type { PlanLimits } from "@/config/plan-limits";
import type { PlanId } from "@/types/billing";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type BillingPlanCardProps = { plan: PlanId; limits: PlanLimits; current: boolean; actor: Actor; onSelect: (plan: PlanId) => void };

export function BillingPlanCard(props: BillingPlanCardProps): ReactElement | null {
  return null;
}
