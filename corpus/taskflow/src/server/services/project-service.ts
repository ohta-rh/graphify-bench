/**
 * Project lifecycle including the project-count quota and the cascade that archives a project's issues.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, uniqueSlug, projectKeyFromName
 */
import { wouldExceedLimit } from "@/config/plan-limits";
import { emit } from "@/lib/event-bus";
import { assertCan } from "@/lib/permissions";
import { projectKeyFromName, uniqueSlug } from "@/lib/slug";
import { assertNotArchived } from "@/lib/soft-delete";
import { assertOrgScope } from "@/lib/tenant";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import {
  actorEnvelope,
  orgResource,
  projectResource,
  requireFound,
} from "./_support";
import type {
  ArchiveProjectInput,
  CreateProjectInput,
  ListProjectsInput,
  UpdateProjectInput,
} from "@/schemas/project";
import type { OrgId, Page, ProjectId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { Project, ProjectWithStats } from "@/types/project";

/**
 * Creates a project once the plan still has room for one. The key is derived
 * from the name when the caller left it blank, so the issue numbering scheme
 * (`TF-12`) is never invented at the call site.
 */
export async function createProject(
  actor: Actor,
  input: CreateProjectInput,
): Promise<Project> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "project:create", orgResource(input.orgId));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  const used = await projectRepo.countProjects(input.orgId);
  if (wouldExceedLimit(org.plan, "projects", used)) {
    throw new Error(
      `Plan ${org.plan} allows ${used} projects; upgrade to add another`,
    );
  }

  const slug = await suggestProjectSlug(input.orgId, input.name);

  const project = await projectRepo.insertProject({
    ...input,
    slug,
    key: input.key || projectKeyFromName(input.name),
  });

  await emit("project.created", {
    ...actorEnvelope(actor),
    projectId: project.id,
    name: project.name,
    slug: project.slug,
  });

  return project;
}

export async function updateProject(
  actor: Actor,
  input: UpdateProjectInput,
): Promise<Project> {
  assertOrgScope(actor, input.orgId);

  const project = requireFound(
    await projectRepo.findProjectById(input.orgId, input.projectId),
    "Project",
    input.projectId,
  );
  assertCan(actor, "project:update", projectResource(project));
  assertNotArchived("Project", project.id, project);

  return projectRepo.updateProject(input);
}

/**
 * Archiving a project cascades to its issues by default — leaving live issues
 * behind an archived project is the drift this flag exists to prevent.
 */
export async function archiveProject(
  actor: Actor,
  input: ArchiveProjectInput,
): Promise<Project> {
  assertOrgScope(actor, input.orgId);

  const project = requireFound(
    await projectRepo.findProjectById(input.orgId, input.projectId),
    "Project",
    input.projectId,
  );
  assertCan(actor, "project:archive", projectResource(project));
  assertNotArchived("Project", project.id, project);

  const issuesArchived = input.archiveIssues
    ? await issueRepo.archiveIssuesForProject(input.orgId, input.projectId)
    : 0;

  const archived = await projectRepo.archiveProject(
    input.orgId,
    input.projectId,
  );

  await emit("project.archived", {
    ...actorEnvelope(actor),
    projectId: archived.id,
    issuesArchived,
  });

  return archived;
}

/** Restore does not un-archive the issues: they are restored individually. */
export async function restoreProject(
  actor: Actor,
  orgId: OrgId,
  projectId: ProjectId,
): Promise<Project> {
  assertOrgScope(actor, orgId);

  const project = requireFound(
    await projectRepo.findProjectById(orgId, projectId),
    "Project",
    projectId,
  );
  assertCan(actor, "project:archive", projectResource(project));

  const restored = await projectRepo.restoreProject(orgId, projectId);

  await emit("project.restored", {
    ...actorEnvelope(actor),
    projectId: restored.id,
  });

  return restored;
}

export async function getProject(
  actor: Actor,
  orgId: OrgId,
  slug: string,
): Promise<ProjectWithStats> {
  assertOrgScope(actor, orgId);

  const project = requireFound(
    await projectRepo.findProjectBySlug(orgId, slug),
    "Project",
    slug,
  );
  assertCan(actor, "project:read", projectResource(project));

  return {
    project,
    stats: await projectRepo.getProjectStats(orgId, project.id),
  };
}

export async function listProjects(
  actor: Actor,
  input: ListProjectsInput,
): Promise<Page<ProjectWithStats>> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "project:read", orgResource(input.orgId));

  const page = await projectRepo.listProjects(input);

  const items = await Promise.all(
    page.items.map(async (project) => ({
      project,
      stats: await projectRepo.getProjectStats(input.orgId, project.id),
    })),
  );

  return { items, nextCursor: page.nextCursor, total: page.total };
}

/**
 * Slug preview used by both the create form and `createProject`, so what the
 * user sees while typing is what the row ends up with.
 */
export async function suggestProjectSlug(
  orgId: OrgId,
  name: string,
): Promise<string> {
  const taken = await projectRepo.listTakenProjectSlugs(orgId);
  return uniqueSlug(name, taken);
}
