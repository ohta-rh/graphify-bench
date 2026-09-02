/**
 * Organization creation, settings updates and deletion; seeds the owner membership and the free subscription.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, uniqueSlug, assertValidSlug
 */
import { emit } from "@/lib/event-bus";
import { assertCan } from "@/lib/permissions";
import { assertValidSlug, uniqueSlug } from "@/lib/slug";
import { assertOrgScope } from "@/lib/tenant";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { record } from "./activity-service";
import { envelope, orgResource, requireFound } from "./_support";
import type {
  CreateOrganizationInput,
  DeleteOrganizationInput,
  UpdateOrganizationInput,
} from "@/schemas/organization";
import type { OrgId, UserId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { Organization, OrganizationSummary } from "@/types/organization";

/**
 * Creates an organization and everything it cannot exist without: the owner's
 * membership row and a subscription. Sign-up and "create another workspace"
 * both land here, which is why it takes a bare `ownerId` rather than an
 * `Actor` — there is no membership to build one from yet.
 */
export async function createOrganization(
  ownerId: UserId,
  input: CreateOrganizationInput,
): Promise<Organization> {
  assertValidSlug(input.slug);

  const taken = await orgRepo.listTakenOrgSlugs(input.slug);
  const slug = uniqueSlug(input.slug, taken);

  const org = await orgRepo.insertOrg({ ...input, slug }, ownerId);

  const owner = await memberRepo.insertMember(org.id, ownerId, "owner", null);
  await subscriptionRepo.insertSubscription(org.id, input.plan, "monthly");
  await usageRepo.recomputeUsage(org.id);

  await emit("member.joined", {
    ...envelope(org.id, ownerId),
    memberId: owner.id,
    userId: ownerId,
    role: owner.role,
  });

  return org;
}

export async function updateOrganization(
  actor: Actor,
  input: UpdateOrganizationInput,
): Promise<Organization> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "org:update", orgResource(input.orgId));

  const updated = await orgRepo.updateOrg(input.orgId, input);

  // Settings changes are audited directly: the event bus has no
  // `organization.updated` key, and inventing one would widen the contract.
  await record(input.orgId, "organization.updated", {
    actorId: actor.userId,
    subjectKind: "organization",
    subjectId: updated.id,
    projectId: null,
    summary: `${updated.name} settings updated`,
  });

  return updated;
}

/**
 * Deletion is a soft delete guarded by a typed confirmation, the same shape
 * GitHub uses: the caller has to retype the slug.
 */
export async function deleteOrganization(
  actor: Actor,
  input: DeleteOrganizationInput,
): Promise<Organization> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "org:delete", orgResource(input.orgId));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  if (org.slug !== input.confirmSlug) {
    throw new Error("The confirmation does not match this organization's slug");
  }

  return orgRepo.archiveOrg(input.orgId);
}

/** The header/shell payload: the org plus the counters the sidebar shows. */
export async function getOrganizationSummary(
  actor: Actor,
  orgId: OrgId,
): Promise<OrganizationSummary> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "org:read", orgResource(orgId));

  const organization = requireFound(
    await orgRepo.findOrgById(orgId),
    "Organization",
    orgId,
  );

  return {
    organization,
    usage: await usageRepo.getUsage(orgId),
    memberCount: await memberRepo.countActiveMembers(orgId),
    projectCount: await projectRepo.countProjects(orgId),
  };
}

/** The org switcher's list; no `Actor` exists until one is chosen. */
export async function listOrganizationsForUser(
  userId: UserId,
): Promise<readonly Organization[]> {
  return orgRepo.listOrgsForUser(userId);
}

export async function resolveOrgBySlug(
  slug: string,
): Promise<Organization | null> {
  return orgRepo.findOrgBySlug(slug);
}
