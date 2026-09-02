/**
 * The URL is the single source of truth for the issue list filter: a filtered
 * view has to be shareable and survive a reload, and the server component that
 * renders the page parses the very same query string. These two functions are
 * that codec, kept pure so both sides can use them.
 *
 * `assignee=none` is the sanctioned spelling of "unassigned" — `undefined`
 * means "don't filter on assignee at all", which is a different query.
 */
import type { LabelId, ProjectId, IsoTimestamp, UserId } from "@/types/common";
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type IssueFilter,
  type IssuePriority,
  type IssueStatus,
} from "@/types/issue";

export const UNASSIGNED_TOKEN = "none";

export interface ReadableParams {
  get(name: string): string | null;
}

function splitList(raw: string | null): readonly string[] {
  if (raw === null || raw.length === 0) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function parseIssueFilterParams(params: ReadableParams): IssueFilter {
  const statuses = splitList(params.get("status")).filter(
    (value): value is IssueStatus =>
      ISSUE_STATUSES.includes(value as IssueStatus),
  );
  const priorities = splitList(params.get("priority")).filter(
    (value): value is IssuePriority =>
      ISSUE_PRIORITIES.includes(value as IssuePriority),
  );
  const labelIds = splitList(params.get("label")) as readonly LabelId[];
  const project = params.get("project");
  const assignee = params.get("assignee");
  const author = params.get("author");
  const query = params.get("q");
  const dueBefore = params.get("due_before");

  const filter: IssueFilter = {
    ...(project !== null ? { projectId: project as ProjectId } : {}),
    ...(statuses.length > 0 ? { status: statuses } : {}),
    ...(priorities.length > 0 ? { priority: priorities } : {}),
    ...(assignee !== null
      ? {
          assigneeId:
            assignee === UNASSIGNED_TOKEN ? null : (assignee as UserId),
        }
      : {}),
    ...(author !== null ? { authorId: author as UserId } : {}),
    ...(labelIds.length > 0 ? { labelIds } : {}),
    ...(query !== null && query.length > 0 ? { query } : {}),
    ...(dueBefore !== null ? { dueBefore: dueBefore as IsoTimestamp } : {}),
    ...(params.get("archived") === "1" ? { includeArchived: true } : {}),
  };

  return filter;
}

/** Inverse of `parseIssueFilterParams`; omits every empty dimension so the
 *  canonical URL for "no filter" is the bare path. */
export function issueFilterToParams(
  filter: IssueFilter,
): Readonly<Record<string, string>> {
  const params: Record<string, string> = {};
  if (filter.projectId !== undefined) params.project = filter.projectId;
  if (filter.status !== undefined && filter.status.length > 0) {
    params.status = filter.status.join(",");
  }
  if (filter.priority !== undefined && filter.priority.length > 0) {
    params.priority = filter.priority.join(",");
  }
  if (filter.assigneeId !== undefined) {
    params.assignee = filter.assigneeId ?? UNASSIGNED_TOKEN;
  }
  if (filter.authorId !== undefined) params.author = filter.authorId;
  if (filter.labelIds !== undefined && filter.labelIds.length > 0) {
    params.label = filter.labelIds.join(",");
  }
  if (filter.query !== undefined && filter.query.length > 0) {
    params.q = filter.query;
  }
  if (filter.dueBefore !== undefined) params.due_before = filter.dueBefore;
  if (filter.includeArchived === true) params.archived = "1";
  return params;
}

/** How many dimensions the user has narrowed on, for the "clear" affordance. */
export function activeFilterCount(filter: IssueFilter): number {
  return Object.keys(issueFilterToParams(filter)).length;
}

export function issueFilterQueryString(filter: IssueFilter): string {
  const search = new URLSearchParams(issueFilterToParams(filter));
  const serialised = search.toString();
  return serialised.length > 0 ? `?${serialised}` : "";
}
