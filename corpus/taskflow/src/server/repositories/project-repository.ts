/**
 * Project rows: cursor listing, slug/key uniqueness, soft delete and restore.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archivePatch, restorePatch, shouldFilterArchived, uniqueSlug
 */
import type { CreateProjectInput, ListProjectsInput, UpdateProjectInput } from "@/schemas/project";
import type { ArchiveScope, OrgId, Page, ProjectId } from "@/types/common";
import type { Project, ProjectStats } from "@/types/project";
export async function findProjectById(orgId: OrgId, projectId: ProjectId): Promise<Project | null> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function findProjectBySlug(orgId: OrgId, slug: string): Promise<Project | null> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function listProjects(input: ListProjectsInput): Promise<Page<Project>> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function countProjects(orgId: OrgId, scope?: ArchiveScope): Promise<number> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function insertProject(input: CreateProjectInput): Promise<Project> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function updateProject(input: UpdateProjectInput): Promise<Project> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function archiveProject(orgId: OrgId, projectId: ProjectId): Promise<Project> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function restoreProject(orgId: OrgId, projectId: ProjectId): Promise<Project> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function listTakenProjectSlugs(orgId: OrgId): Promise<readonly string[]> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}

export async function getProjectStats(orgId: OrgId, projectId: ProjectId): Promise<ProjectStats> {
  throw new Error("stub: src/server/repositories/project-repository.ts");
}
