/**
 * Project rows: cursor listing, slug/key uniqueness, soft delete and restore.
 *
 * Must call (do not reimplement): archivePatch, restorePatch, shouldFilterArchived, uniqueSlug
 */
import { and, count, desc, eq, inArray, isNotNull, like, lt, sql } from "drizzle-orm";
import { newId } from "@/lib/id";
import { uniqueSlug } from "@/lib/slug";
import {
  archivePatch,
  restorePatch,
  shouldFilterArchived,
} from "@/lib/soft-delete";
import { getDb, issues, projects } from "@/server/db";
import { CLOSED_ISSUE_STATUSES } from "@/types/issue";
import { toIsoTimestamp } from "@/types/common";
import { livePredicate, orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toProject } from "./_mappers";
import type {
  CreateProjectInput,
  ListProjectsInput,
  UpdateProjectInput,
} from "@/schemas/project";
import type { ArchiveScope, OrgId, Page, ProjectId } from "@/types/common";
import type { Project, ProjectStats } from "@/types/project";

export async function findProjectById(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<Project | null> {
  const row = getDb()
    .select()
    .from(projects)
    .where(and(orgPredicate(projects.orgId, orgId), eq(projects.id, projectId)))
    .get();
  return row ? toProject(row) : null;
}

export async function findProjectBySlug(
  orgId: OrgId,
  slug: string,
): Promise<Project | null> {
  const row = getDb()
    .select()
    .from(projects)
    .where(and(orgPredicate(projects.orgId, orgId), eq(projects.slug, slug)))
    .get();
  return row ? toProject(row) : null;
}

export async function listProjects(
  input: ListProjectsInput,
): Promise<Page<Project>> {
  const db = getDb();
  const sort = { sortColumn: projects.createdAt, idColumn: projects.id };

  // The rows and the total must agree on the archive scope, so normalise the
  // filter's loose `includeArchived` into one `ArchiveScope` up front.
  const scope: ArchiveScope = shouldFilterArchived(input)
    ? {}
    : { includeArchived: true };

  const filters = compact(
    orgPredicate(projects.orgId, input.orgId),
    livePredicate(projects.archivedAt, scope),
    input.status === undefined ? undefined : eq(projects.status, input.status),
    input.query === undefined
      ? undefined
      : like(projects.name, `%${input.query}%`),
  );

  const total = db
    .select({ value: count() })
    .from(projects)
    .where(and(...filters))
    .get();

  const rows = db
    .select()
    .from(projects)
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(projects.createdAt), desc(projects.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(rows, input.limit, total?.value ?? 0, toProject, (row) => ({
    id: row.id,
    sortValue: row.createdAt,
  }));
}

/** Counts live projects by default; the `projects` quota reads this. */
export async function countProjects(
  orgId: OrgId,
  scope: ArchiveScope = {},
): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(projects)
    .where(
      and(
        ...compact(
          orgPredicate(projects.orgId, orgId),
          livePredicate(projects.archivedAt, scope),
        ),
      ),
    )
    .get();
  return row?.value ?? 0;
}

export async function insertProject(
  input: CreateProjectInput,
): Promise<Project> {
  const taken = await listTakenProjectSlugs(input.orgId);
  const slug = uniqueSlug(input.slug, taken);
  const stamp = toIsoTimestamp(new Date());

  const row = getDb()
    .insert(projects)
    .values({
      id: newId(),
      orgId: input.orgId,
      name: input.name,
      slug,
      key: input.key,
      description: input.description,
      visibility: input.visibility,
      status: "active",
      leadId: input.leadId,
      color: input.color,
      startsAt: null,
      targetDate: input.targetDate,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toProject(row);
}

export async function updateProject(
  input: UpdateProjectInput,
): Promise<Project> {
  const row = getDb()
    .update(projects)
    .set({
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      ...(input.visibility === undefined
        ? {}
        : { visibility: input.visibility }),
      ...(input.status === undefined ? {} : { status: input.status }),
      ...(input.leadId === undefined ? {} : { leadId: input.leadId }),
      ...(input.color === undefined ? {} : { color: input.color }),
      ...(input.targetDate === undefined
        ? {}
        : { targetDate: input.targetDate }),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(
      and(
        orgPredicate(projects.orgId, input.orgId),
        eq(projects.id, input.projectId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Project ${input.projectId} not found`);
  return toProject(row);
}

export async function archiveProject(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<Project> {
  const row = getDb()
    .update(projects)
    .set(archivePatch())
    .where(and(orgPredicate(projects.orgId, orgId), eq(projects.id, projectId)))
    .returning()
    .get();

  if (!row) throw new Error(`Project ${projectId} not found`);
  return toProject(row);
}

export async function restoreProject(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<Project> {
  const row = getDb()
    .update(projects)
    .set(restorePatch())
    .where(and(orgPredicate(projects.orgId, orgId), eq(projects.id, projectId)))
    .returning()
    .get();

  if (!row) throw new Error(`Project ${projectId} not found`);
  return toProject(row);
}

/** Includes archived slugs — a restored project must not collide. */
export async function listTakenProjectSlugs(
  orgId: OrgId,
): Promise<readonly string[]> {
  const rows = getDb()
    .select({ slug: projects.slug })
    .from(projects)
    .where(orgPredicate(projects.orgId, orgId))
    .all();
  return rows.map((row) => row.slug);
}

/** Open/closed/overdue counters plus the last write, for the project card. */
export async function getProjectStats(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<ProjectStats> {
  const db = getDb();
  const scope = and(
    orgPredicate(issues.orgId, orgId),
    eq(issues.projectId, projectId),
    ...compact(livePredicate(issues.archivedAt, {})),
  );

  const closed = db
    .select({ value: count() })
    .from(issues)
    .where(and(scope, inArray(issues.status, [...CLOSED_ISSUE_STATUSES])))
    .get();

  const all = db.select({ value: count() }).from(issues).where(scope).get();

  const overdue = db
    .select({ value: count() })
    .from(issues)
    .where(
      and(
        scope,
        isNotNull(issues.dueAt),
        lt(issues.dueAt, toIsoTimestamp(new Date())),
      ),
    )
    .get();

  const lastActivity = db
    .select({ value: sql<string | null>`max(${issues.updatedAt})` })
    .from(issues)
    .where(scope)
    .get();

  const closedCount = closed?.value ?? 0;

  return {
    projectId,
    openIssues: (all?.value ?? 0) - closedCount,
    closedIssues: closedCount,
    overdueIssues: overdue?.value ?? 0,
    lastActivityAt:
      lastActivity?.value == null ? null : toIsoTimestamp(lastActivity.value),
  };
}
