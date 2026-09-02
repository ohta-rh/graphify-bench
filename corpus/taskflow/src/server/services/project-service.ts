/**
 * Project lifecycle including the project-count quota and the cascade that archives a project's issues.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, uniqueSlug, projectKeyFromName
 */
import type { ArchiveProjectInput, CreateProjectInput, ListProjectsInput, UpdateProjectInput } from "@/schemas/project";
import type { OrgId, Page, ProjectId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { Project, ProjectWithStats } from "@/types/project";
export async function createProject(actor: Actor, input: CreateProjectInput): Promise<Project> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function updateProject(actor: Actor, input: UpdateProjectInput): Promise<Project> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function archiveProject(actor: Actor, input: ArchiveProjectInput): Promise<Project> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function restoreProject(actor: Actor, orgId: OrgId, projectId: ProjectId): Promise<Project> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function getProject(actor: Actor, orgId: OrgId, slug: string): Promise<ProjectWithStats> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function listProjects(actor: Actor, input: ListProjectsInput): Promise<Page<ProjectWithStats>> {
  throw new Error("stub: src/server/services/project-service.ts");
}

export async function suggestProjectSlug(orgId: OrgId, name: string): Promise<string> {
  throw new Error("stub: src/server/services/project-service.ts");
}
