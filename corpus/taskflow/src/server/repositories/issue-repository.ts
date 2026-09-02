/**
 * Issue rows: the widest query surface in the app. Every method takes `orgId` first and honours `IssueFilter.includeArchived`.
 *
 * Must call (do not reimplement): archivePatch, restorePatch, shouldFilterArchived
 */
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { newId } from "@/lib/id";
import {
  archivePatch,
  restorePatch,
  shouldFilterArchived,
} from "@/lib/soft-delete";
import { attachments, comments, getDb, issueLabels, issues } from "@/server/db";
import { ISSUE_STATUSES } from "@/types/issue";
import { toIsoTimestamp } from "@/types/common";
import { livePredicate, orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toIssue } from "./_mappers";
import { listLabelsForIssues } from "./label-repository";
import type {
  CreateIssueInput,
  IssueFilterInput,
  UpdateIssueInput,
} from "@/schemas/issue";
import type {
  ArchiveScope,
  IsoTimestamp,
  IssueId,
  LabelId,
  OrgId,
  Page,
  ProjectId,
  UserId,
} from "@/types/common";
import type {
  Issue,
  IssueBoardColumn,
  IssueStatus,
  IssueWithRelations,
} from "@/types/issue";
import type { SQL } from "drizzle-orm";

/** Statuses whose entry stamps `completed_at`; leaving one clears it again. */
const TERMINAL_STATUSES: readonly IssueStatus[] = ["done", "canceled"];

export async function findIssueById(
  orgId: OrgId,
  issueId: IssueId,
): Promise<Issue | null> {
  const row = getDb()
    .select()
    .from(issues)
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .get();
  if (!row) return null;

  const labels = await listLabelsForIssues(orgId, [row.id as IssueId]);
  return toIssue(row, (labels[row.id] ?? []).map((label) => label.id));
}

export async function findIssueByNumber(
  orgId: OrgId,
  projectId: ProjectId,
  issueNumber: number,
): Promise<Issue | null> {
  const row = getDb()
    .select()
    .from(issues)
    .where(
      and(
        orgPredicate(issues.orgId, orgId),
        eq(issues.projectId, projectId),
        eq(issues.number, issueNumber),
      ),
    )
    .get();
  return row ? toIssue(row) : null;
}

/** Builds the shared predicate list behind `listIssues` and its count. */
function issueFilters(input: IssueFilterInput): readonly SQL[] {
  const scope: ArchiveScope = shouldFilterArchived(input)
    ? {}
    : { includeArchived: true };

  return compact(
    orgPredicate(issues.orgId, input.orgId),
    livePredicate(issues.archivedAt, scope),
    input.projectId === undefined
      ? undefined
      : eq(issues.projectId, input.projectId),
    input.status === undefined || input.status.length === 0
      ? undefined
      : inArray(issues.status, [...input.status]),
    input.priority === undefined || input.priority.length === 0
      ? undefined
      : inArray(issues.priority, [...input.priority]),
    input.assigneeId === undefined
      ? undefined
      : input.assigneeId === null
        ? isNull(issues.assigneeId)
        : eq(issues.assigneeId, input.assigneeId),
    input.authorId === undefined
      ? undefined
      : eq(issues.authorId, input.authorId),
    input.dueBefore === undefined ? undefined : lt(issues.dueAt, input.dueBefore),
    input.query === undefined
      ? undefined
      : or(
          like(issues.title, `%${input.query}%`),
          like(issues.description, `%${input.query}%`),
        ),
    input.labelIds === undefined || input.labelIds.length === 0
      ? undefined
      : inArray(
          issues.id,
          getDb()
            .select({ id: issueLabels.issueId })
            .from(issueLabels)
            .where(
              and(
                orgPredicate(issueLabels.orgId, input.orgId),
                inArray(issueLabels.labelId, [...input.labelIds]),
              ),
            ),
        ),
  );
}

export async function listIssues(
  input: IssueFilterInput,
): Promise<Page<Issue>> {
  const db = getDb();
  const filters = issueFilters(input);
  const sort = { sortColumn: issues.createdAt, idColumn: issues.id };

  const total = db
    .select({ value: count() })
    .from(issues)
    .where(and(...filters))
    .get();

  const rows = db
    .select()
    .from(issues)
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(issues.createdAt), desc(issues.id))
    .limit(probeLimit(input.limit))
    .all();

  const labels = await listLabelsForIssues(
    input.orgId,
    rows.map((row) => row.id as IssueId),
  );

  return toPage(
    rows,
    input.limit,
    total?.value ?? 0,
    (row) => toIssue(row, (labels[row.id] ?? []).map((label) => label.id)),
    (row) => ({ id: row.id, sortValue: row.createdAt }),
  );
}

/**
 * The list view needs comment and attachment counts per row. Two grouped
 * queries beat N+1 round trips, so the counts are folded in afterwards.
 */
export async function listIssuesWithRelations(
  input: IssueFilterInput,
): Promise<Page<IssueWithRelations>> {
  const db = getDb();
  const page = await listIssues(input);
  const ids = page.items.map((issue) => issue.id);
  if (ids.length === 0) {
    return { items: [], nextCursor: page.nextCursor, total: page.total };
  }

  const commentCounts = db
    .select({ issueId: comments.issueId, value: count() })
    .from(comments)
    .where(
      and(
        orgPredicate(comments.orgId, input.orgId),
        inArray(comments.issueId, [...ids]),
        isNull(comments.archivedAt),
      ),
    )
    .groupBy(comments.issueId)
    .all();

  const attachmentCounts = db
    .select({ issueId: attachments.issueId, value: count() })
    .from(attachments)
    .where(
      and(
        orgPredicate(attachments.orgId, input.orgId),
        inArray(attachments.issueId, [...ids]),
      ),
    )
    .groupBy(attachments.issueId)
    .all();

  const labels = await listLabelsForIssues(input.orgId, ids);
  const commentsBy = new Map(commentCounts.map((r) => [r.issueId, r.value]));
  const attachmentsBy = new Map(
    attachmentCounts.map((r) => [r.issueId, r.value]),
  );

  return {
    items: page.items.map((issue) => ({
      issue,
      labels: labels[issue.id] ?? [],
      commentCount: commentsBy.get(issue.id) ?? 0,
      attachmentCount: attachmentsBy.get(issue.id) ?? 0,
    })),
    nextCursor: page.nextCursor,
    total: page.total,
  };
}

/** One column per status, in `ISSUE_STATUSES` order, live rows only. */
export async function listBoardColumns(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<readonly IssueBoardColumn[]> {
  const rows = getDb()
    .select()
    .from(issues)
    .where(
      and(
        ...compact(
          orgPredicate(issues.orgId, orgId),
          eq(issues.projectId, projectId),
          livePredicate(issues.archivedAt, {}),
        ),
      ),
    )
    .orderBy(desc(issues.updatedAt))
    .all();

  const labels = await listLabelsForIssues(
    orgId,
    rows.map((row) => row.id as IssueId),
  );

  return ISSUE_STATUSES.map((status) => {
    const column = rows
      .filter((row) => row.status === status)
      .map((row) => toIssue(row, (labels[row.id] ?? []).map((l) => l.id)));
    return { status, issues: column, total: column.length };
  });
}

export async function countIssues(
  orgId: OrgId,
  projectId: ProjectId,
  scope: ArchiveScope = {},
): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(issues)
    .where(
      and(
        ...compact(
          orgPredicate(issues.orgId, orgId),
          eq(issues.projectId, projectId),
          livePredicate(issues.archivedAt, scope),
        ),
      ),
    )
    .get();
  return row?.value ?? 0;
}

/**
 * Next per-project issue number. Archived issues keep their number, so the
 * max is taken over every row rather than the live ones.
 */
export async function nextIssueNumber(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<number> {
  const row = getDb()
    .select({ value: sql<number | null>`max(${issues.number})` })
    .from(issues)
    .where(
      and(orgPredicate(issues.orgId, orgId), eq(issues.projectId, projectId)),
    )
    .get();
  return (row?.value ?? 0) + 1;
}

export async function insertIssue(
  input: CreateIssueInput,
  authorId: UserId,
  issueNumber: number,
): Promise<Issue> {
  const stamp = toIsoTimestamp(new Date());
  const db = getDb();

  const row = db
    .insert(issues)
    .values({
      id: newId(),
      orgId: input.orgId,
      projectId: input.projectId,
      number: issueNumber,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      authorId,
      assigneeId: input.assigneeId,
      parentId: input.parentId,
      estimate: input.estimate,
      dueAt: input.dueAt,
      startedAt: null,
      completedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  if (input.labelIds.length > 0) {
    db.insert(issueLabels)
      .values(
        input.labelIds.map((labelId) => ({
          orgId: input.orgId,
          issueId: row.id,
          labelId,
        })),
      )
      .run();
  }

  return toIssue(row, input.labelIds);
}

export async function updateIssue(input: UpdateIssueInput): Promise<Issue> {
  const db = getDb();
  const row = db
    .update(issues)
    .set({
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.description === undefined
        ? {}
        : { description: input.description }),
      ...(input.priority === undefined ? {} : { priority: input.priority }),
      ...(input.estimate === undefined ? {} : { estimate: input.estimate }),
      ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(
      and(
        orgPredicate(issues.orgId, input.orgId),
        eq(issues.id, input.issueId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Issue ${input.issueId} not found`);

  if (input.labelIds !== undefined) {
    db.delete(issueLabels)
      .where(
        and(
          orgPredicate(issueLabels.orgId, input.orgId),
          eq(issueLabels.issueId, input.issueId),
        ),
      )
      .run();
    if (input.labelIds.length > 0) {
      db.insert(issueLabels)
        .values(
          input.labelIds.map((labelId: LabelId) => ({
            orgId: input.orgId,
            issueId: input.issueId,
            labelId,
          })),
        )
        .run();
    }
  }

  const labels = await listLabelsForIssues(input.orgId, [input.issueId]);
  return toIssue(row, (labels[input.issueId] ?? []).map((label) => label.id));
}

/** Status transitions maintain `started_at` / `completed_at` bookkeeping. */
export async function setIssueStatus(
  orgId: OrgId,
  issueId: IssueId,
  status: IssueStatus,
): Promise<Issue> {
  const stamp = toIsoTimestamp(new Date());
  const current = getDb()
    .select()
    .from(issues)
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .get();

  if (!current) throw new Error(`Issue ${issueId} not found`);

  const row = getDb()
    .update(issues)
    .set({
      status,
      startedAt:
        status === "in_progress" && current.startedAt === null
          ? stamp
          : current.startedAt,
      completedAt: TERMINAL_STATUSES.includes(status) ? stamp : null,
      updatedAt: stamp,
    })
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .returning()
    .get();

  return toIssue(row);
}

export async function setIssueAssignee(
  orgId: OrgId,
  issueId: IssueId,
  assigneeId: UserId | null,
): Promise<Issue> {
  const row = getDb()
    .update(issues)
    .set({ assigneeId, updatedAt: toIsoTimestamp(new Date()) })
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .returning()
    .get();

  if (!row) throw new Error(`Issue ${issueId} not found`);
  return toIssue(row);
}

export async function archiveIssue(
  orgId: OrgId,
  issueId: IssueId,
): Promise<Issue> {
  const row = getDb()
    .update(issues)
    .set(archivePatch())
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .returning()
    .get();

  if (!row) throw new Error(`Issue ${issueId} not found`);
  return toIssue(row);
}

export async function restoreIssue(
  orgId: OrgId,
  issueId: IssueId,
): Promise<Issue> {
  const row = getDb()
    .update(issues)
    .set(restorePatch())
    .where(and(orgPredicate(issues.orgId, orgId), eq(issues.id, issueId)))
    .returning()
    .get();

  if (!row) throw new Error(`Issue ${issueId} not found`);
  return toIssue(row);
}

/** Cascade behind `ProjectService.archiveProject`; returns the row count. */
export async function archiveIssuesForProject(
  orgId: OrgId,
  projectId: ProjectId,
): Promise<number> {
  const rows = getDb()
    .update(issues)
    .set(archivePatch())
    .where(
      and(
        ...compact(
          orgPredicate(issues.orgId, orgId),
          eq(issues.projectId, projectId),
          livePredicate(issues.archivedAt, {}),
        ),
      ),
    )
    .returning({ id: issues.id })
    .all();

  return rows.length;
}

/** Live, still-open issues whose due date has passed. Drives the overdue job. */
export async function listOverdueIssues(
  orgId: OrgId,
  now: IsoTimestamp,
): Promise<readonly Issue[]> {
  const rows = getDb()
    .select()
    .from(issues)
    .where(
      and(
        ...compact(
          orgPredicate(issues.orgId, orgId),
          livePredicate(issues.archivedAt, {}),
          isNotNull(issues.dueAt),
          lt(issues.dueAt, now),
          inArray(issues.status, ["backlog", "todo", "in_progress", "in_review"]),
        ),
      ),
    )
    .orderBy(issues.dueAt)
    .all();

  return rows.map((row) => toIssue(row));
}
