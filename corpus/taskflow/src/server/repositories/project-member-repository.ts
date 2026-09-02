/**
 * Explicit project membership for `private` projects.
 */
import { and, eq } from "drizzle-orm";
import { getDb, projectMembers } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { brandId } from "./_mappers";
import { orgPredicate } from "./base-repository";
import type { OrgId, ProjectId, UserId } from "@/types/common";

export async function listProjectMemberIds(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<readonly UserId[]> {
  const rows = getDb()
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        orgPredicate(projectMembers.orgId, orgId),
        eq(projectMembers.projectId, projectId),
      ),
    )
    .all();
  return rows.map((row) => brandId<UserId>(row.userId));
}

/** Idempotent: re-adding an existing member is a no-op, not a conflict. */
export async function addProjectMember(
  orgId: OrgId,
  projectId: ProjectId,
  userId: UserId,
): Promise<void> {
  if (await isProjectMember(orgId, projectId, userId)) return;

  getDb()
    .insert(projectMembers)
    .values({
      orgId,
      projectId,
      userId,
      addedAt: toIsoTimestamp(new Date()),
    })
    .run();
}

export async function removeProjectMember(
  orgId: OrgId,
  projectId: ProjectId,
  userId: UserId,
): Promise<void> {
  getDb()
    .delete(projectMembers)
    .where(
      and(
        orgPredicate(projectMembers.orgId, orgId),
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .run();
}

export async function isProjectMember(
  orgId: OrgId,
  projectId: ProjectId,
  userId: UserId,
): Promise<boolean> {
  const row = getDb()
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(
      and(
        orgPredicate(projectMembers.orgId, orgId),
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .get();
  return row !== undefined;
}
