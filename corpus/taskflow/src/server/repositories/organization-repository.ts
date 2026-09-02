/**
 * Organization rows plus slug uniqueness lookups.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archivePatch, uniqueSlug
 */
import type { CreateOrganizationInput, UpdateOrganizationInput } from "@/schemas/organization";
import type { OrgId, UserId } from "@/types/common";
import type { Organization } from "@/types/organization";
export async function findOrgById(orgId: OrgId): Promise<Organization | null> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function findOrgBySlug(slug: string): Promise<Organization | null> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function listOrgsForUser(userId: UserId): Promise<readonly Organization[]> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function insertOrg(input: CreateOrganizationInput, ownerId: UserId): Promise<Organization> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function updateOrg(orgId: OrgId, patch: UpdateOrganizationInput): Promise<Organization> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function archiveOrg(orgId: OrgId): Promise<Organization> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}

export async function listTakenOrgSlugs(prefix: string): Promise<readonly string[]> {
  throw new Error("stub: src/server/repositories/organization-repository.ts");
}
