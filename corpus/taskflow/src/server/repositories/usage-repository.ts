/**
 * The `organization_usage` counters read by every plan-limit check.
 */
import { and, count, eq, isNull, sql } from "drizzle-orm";
import {
  attachments,
  getDb,
  issues,
  members,
  organizationUsage,
  projects,
} from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { toUsage } from "./_mappers";
import { brandId } from "./_mappers";
import type { OrgId } from "@/types/common";
import type { OrganizationUsage } from "@/types/organization";

const BYTES_PER_MB = 1024 * 1024;

/**
 * Reads the cached counters, materialising a zeroed row the first time an org
 * is asked about. A limit check must never fail because the rollup has not run.
 */
export async function getUsage(orgId: OrgId): Promise<OrganizationUsage> {
  const row = getDb()
    .select()
    .from(organizationUsage)
    .where(eq(organizationUsage.orgId, orgId))
    .get();

  if (row) return toUsage(row);

  const created = getDb()
    .insert(organizationUsage)
    .values({ orgId, measuredAt: toIsoTimestamp(new Date()) })
    .returning()
    .get();

  return toUsage(created);
}

/**
 * Recounts every dimension from the source tables and rewrites the cache.
 * Called by the rollup job and after any bulk change that would drift.
 */
export async function recomputeUsage(
  orgId: OrgId,
): Promise<OrganizationUsage> {
  const db = getDb();

  const seats = db
    .select({ value: count() })
    .from(members)
    .where(
      and(
        eq(members.orgId, orgId),
        eq(members.status, "active"),
        isNull(members.archivedAt),
      ),
    )
    .get();

  const projectCount = db
    .select({ value: count() })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), isNull(projects.archivedAt)))
    .get();

  const issueCount = db
    .select({ value: count() })
    .from(issues)
    .where(and(eq(issues.orgId, orgId), isNull(issues.archivedAt)))
    .get();

  const bytes = db
    .select({ value: sql<number | null>`sum(${attachments.sizeBytes})` })
    .from(attachments)
    .where(eq(attachments.orgId, orgId))
    .get();

  const next = {
    orgId,
    seatsUsed: seats?.value ?? 0,
    projectsUsed: projectCount?.value ?? 0,
    issuesUsed: issueCount?.value ?? 0,
    storageMbUsed: Math.ceil((bytes?.value ?? 0) / BYTES_PER_MB),
    measuredAt: toIsoTimestamp(new Date()),
  };

  const row = db
    .insert(organizationUsage)
    .values(next)
    .onConflictDoUpdate({ target: organizationUsage.orgId, set: next })
    .returning()
    .get();

  return toUsage(row);
}

/**
 * Cheap delta applied on the write path so a quota check right after a create
 * sees the new number without waiting for the rollup.
 */
export async function incrementUsage(
  orgId: OrgId,
  patch: Partial<
    Pick<
      OrganizationUsage,
      "seatsUsed" | "projectsUsed" | "issuesUsed" | "storageMbUsed"
    >
  >,
): Promise<OrganizationUsage> {
  const current = await getUsage(orgId);

  const row = getDb()
    .update(organizationUsage)
    .set({
      seatsUsed: current.seatsUsed + (patch.seatsUsed ?? 0),
      projectsUsed: current.projectsUsed + (patch.projectsUsed ?? 0),
      issuesUsed: current.issuesUsed + (patch.issuesUsed ?? 0),
      storageMbUsed: current.storageMbUsed + (patch.storageMbUsed ?? 0),
      measuredAt: toIsoTimestamp(new Date()),
    })
    .where(eq(organizationUsage.orgId, orgId))
    .returning()
    .get();

  return toUsage(row);
}

/** The rollup job's work list: the oldest measurements first. */
export async function listOrgIdsForRollup(
  limit: number,
): Promise<readonly OrgId[]> {
  const rows = getDb()
    .select({ orgId: organizationUsage.orgId })
    .from(organizationUsage)
    .orderBy(organizationUsage.measuredAt)
    .limit(Math.max(1, limit))
    .all();

  return rows.map((row) => brandId<OrgId>(row.orgId));
}
