/**
 * Organization creation, settings updates and deletion; seeds the owner membership and the free subscription.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, uniqueSlug, assertValidSlug
 */
import type { CreateOrganizationInput, DeleteOrganizationInput, UpdateOrganizationInput } from "@/schemas/organization";
import type { OrgId, UserId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { Organization, OrganizationSummary } from "@/types/organization";
export async function createOrganization(ownerId: UserId, input: CreateOrganizationInput): Promise<Organization> {
  throw new Error("stub: src/server/services/organization-service.ts");
}

export async function updateOrganization(actor: Actor, input: UpdateOrganizationInput): Promise<Organization> {
  throw new Error("stub: src/server/services/organization-service.ts");
}

export async function deleteOrganization(actor: Actor, input: DeleteOrganizationInput): Promise<Organization> {
  throw new Error("stub: src/server/services/organization-service.ts");
}

export async function getOrganizationSummary(actor: Actor, orgId: OrgId): Promise<OrganizationSummary> {
  throw new Error("stub: src/server/services/organization-service.ts");
}

export async function listOrganizationsForUser(userId: UserId): Promise<readonly Organization[]> {
  throw new Error("stub: src/server/services/organization-service.ts");
}

export async function resolveOrgBySlug(slug: string): Promise<Organization | null> {
  throw new Error("stub: src/server/services/organization-service.ts");
}
