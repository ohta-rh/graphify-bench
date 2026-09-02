/**
 * The `organization_usage` counters read by every plan-limit check.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { OrgId } from "@/types/common";
import type { OrganizationUsage } from "@/types/organization";
export async function getUsage(orgId: OrgId): Promise<OrganizationUsage> {
  throw new Error("stub: src/server/repositories/usage-repository.ts");
}

export async function recomputeUsage(orgId: OrgId): Promise<OrganizationUsage> {
  throw new Error("stub: src/server/repositories/usage-repository.ts");
}

export async function incrementUsage(orgId: OrgId, patch: Partial<Pick<OrganizationUsage, 'seatsUsed' | 'projectsUsed' | 'issuesUsed' | 'storageMbUsed'>>): Promise<OrganizationUsage> {
  throw new Error("stub: src/server/repositories/usage-repository.ts");
}

export async function listOrgIdsForRollup(limit: number): Promise<readonly OrgId[]> {
  throw new Error("stub: src/server/repositories/usage-repository.ts");
}
