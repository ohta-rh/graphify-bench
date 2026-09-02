/**
 * Subscription rows; one active row per organization.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { BillingInterval, PlanId, Subscription } from "@/types/billing";
import type { IsoTimestamp, OrgId } from "@/types/common";
export async function findSubscription(orgId: OrgId): Promise<Subscription | null> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}

export async function insertSubscription(orgId: OrgId, plan: PlanId, interval: BillingInterval): Promise<Subscription> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}

export async function updateSubscriptionPlan(orgId: OrgId, plan: PlanId, interval: BillingInterval): Promise<Subscription> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}

export async function updateSeatCount(orgId: OrgId, seats: number): Promise<Subscription> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}

export async function cancelSubscription(orgId: OrgId, cancelAt: IsoTimestamp | null): Promise<Subscription> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}

export async function listTrialsEndingBefore(before: IsoTimestamp): Promise<readonly Subscription[]> {
  throw new Error("stub: src/server/repositories/subscription-repository.ts");
}
