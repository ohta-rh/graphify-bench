/**
 * Recomputes the usage counters that every `LimitCheck` compares against.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertOrgScope, subscribe, getPlanLimits
 */
import type { OrgId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Actor } from "@/types/member";
import type { OrganizationUsage } from "@/types/organization";
export async function getUsage(actor: Actor, orgId: OrgId): Promise<OrganizationUsage> {
  throw new Error("stub: src/server/services/usage-service.ts");
}

export async function recomputeUsage(orgId: OrgId): Promise<OrganizationUsage> {
  throw new Error("stub: src/server/services/usage-service.ts");
}

export function registerUsageListeners(): Unsubscribe {
  throw new Error("stub: src/server/services/usage-service.ts");
}
