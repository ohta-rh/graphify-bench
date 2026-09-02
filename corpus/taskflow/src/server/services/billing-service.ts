/**
 * Plan changes and quota arithmetic. The single reader of `PLAN_LIMITS` on the server; every other layer asks this service.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, getPlanLimits, wouldExceedLimit, getLimit
 */
import type { CancelSubscriptionInput, ChangePlanInput, UpdateSeatsInput } from "@/schemas/billing";
import type { BillingSummary, Invoice, LimitCheck, LimitedResource, Subscription } from "@/types/billing";
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";
export async function getBillingSummary(actor: Actor, orgId: OrgId): Promise<BillingSummary> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function checkLimit(orgId: OrgId, resource: LimitedResource, requested?: number): Promise<LimitCheck> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function assertWithinLimit(orgId: OrgId, resource: LimitedResource, requested?: number): Promise<void> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function changePlan(actor: Actor, input: ChangePlanInput): Promise<Subscription> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function updateSeats(actor: Actor, input: UpdateSeatsInput): Promise<Subscription> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function cancelSubscription(actor: Actor, input: CancelSubscriptionInput): Promise<Subscription> {
  throw new Error("stub: src/server/services/billing-service.ts");
}

export async function listInvoices(actor: Actor, orgId: OrgId): Promise<readonly Invoice[]> {
  throw new Error("stub: src/server/services/billing-service.ts");
}
