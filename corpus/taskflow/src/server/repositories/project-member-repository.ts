/**
 * Explicit project membership for `private` projects.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { OrgId, ProjectId, UserId } from "@/types/common";
export async function listProjectMemberIds(orgId: OrgId, projectId: ProjectId): Promise<readonly UserId[]> {
  throw new Error("stub: src/server/repositories/project-member-repository.ts");
}

export async function addProjectMember(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<void> {
  throw new Error("stub: src/server/repositories/project-member-repository.ts");
}

export async function removeProjectMember(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<void> {
  throw new Error("stub: src/server/repositories/project-member-repository.ts");
}

export async function isProjectMember(orgId: OrgId, projectId: ProjectId, userId: UserId): Promise<boolean> {
  throw new Error("stub: src/server/repositories/project-member-repository.ts");
}
