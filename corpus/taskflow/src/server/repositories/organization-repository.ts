/**
 * Organization rows plus slug uniqueness lookups.
 *
 * Must call (do not reimplement): archivePatch, uniqueSlug
 */
import { and, eq, isNull, like } from "drizzle-orm";
import { newId } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import { archivePatch } from "@/lib/soft-delete";
import { getDb, members, organizations } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { toOrganization } from "./_mappers";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/schemas/organization";
import type { OrgId, UserId } from "@/types/common";
import type { Organization } from "@/types/organization";

export async function findOrgById(orgId: OrgId): Promise<Organization | null> {
  const row = getDb()
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .get();
  return row ? toOrganization(row) : null;
}

export async function findOrgBySlug(slug: string): Promise<Organization | null> {
  const row = getDb()
    .select()
    .from(organizations)
    .where(and(eq(organizations.slug, slug), isNull(organizations.archivedAt)))
    .get();
  return row ? toOrganization(row) : null;
}

/** Every org the user still holds a live membership in. */
export async function listOrgsForUser(
  userId: UserId,
): Promise<readonly Organization[]> {
  const rows = getDb()
    .select({ org: organizations })
    .from(members)
    .innerJoin(organizations, eq(organizations.id, members.orgId))
    .where(
      and(
        eq(members.userId, userId),
        isNull(members.archivedAt),
        isNull(organizations.archivedAt),
      ),
    )
    .all();

  return rows.map((row) => toOrganization(row.org));
}

/**
 * Creates the org row. The slug is de-duplicated here rather than in the
 * service so a race on the unique index still resolves to a usable slug.
 */
export async function insertOrg(
  input: CreateOrganizationInput,
  ownerId: UserId,
): Promise<Organization> {
  const taken = await listTakenOrgSlugs(input.slug);
  const slug = uniqueSlug(input.slug, taken);
  const stamp = toIsoTimestamp(new Date());

  const row = getDb()
    .insert(organizations)
    .values({
      id: newId(),
      name: input.name,
      slug,
      ownerId,
      plan: input.plan,
      logoUrl: null,
      trialEndsAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toOrganization(row);
}

export async function updateOrg(
  orgId: OrgId,
  patch: UpdateOrganizationInput,
): Promise<Organization> {
  const current = await findOrgById(orgId);
  if (!current) throw new Error(`Organization ${orgId} not found`);

  const settings = { ...current.settings, ...(patch.settings ?? {}) };

  const row = getDb()
    .update(organizations)
    .set({
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.logoUrl === undefined ? {} : { logoUrl: patch.logoUrl }),
      defaultIssueStatus: settings.defaultIssueStatus,
      allowPublicProjects: settings.allowPublicProjects,
      requireTwoFactor: settings.requireTwoFactor,
      digestHourUtc: settings.digestHourUtc,
      enabledFlagOverrides: JSON.stringify(settings.enabledFlagOverrides),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(eq(organizations.id, orgId))
    .returning()
    .get();

  return toOrganization(row);
}

export async function archiveOrg(orgId: OrgId): Promise<Organization> {
  const row = getDb()
    .update(organizations)
    .set(archivePatch())
    .where(eq(organizations.id, orgId))
    .returning()
    .get();

  if (!row) throw new Error(`Organization ${orgId} not found`);
  return toOrganization(row);
}

/** Feeds `uniqueSlug()`; matching on the prefix keeps the scan small. */
export async function listTakenOrgSlugs(
  prefix: string,
): Promise<readonly string[]> {
  const rows = getDb()
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(like(organizations.slug, `${prefix}%`))
    .all();
  return rows.map((row) => row.slug);
}
