/**
 * Pure board arithmetic: grouping issues into columns and computing what a
 * drop produces.
 *
 * The board is optimistic — the card has to land under the cursor before the
 * server action resolves — so the "what does the board look like after this
 * move?" question must be answerable synchronously and identically on both
 * sides. Keeping it here (rather than inside the drag handler) is what makes
 * that testable.
 */
import { BOARD_STATUS_ORDER } from "../issue/issue-tone";
import type { IssueId } from "@/types/common";
import type { Issue, IssueBoardColumn, IssueStatus } from "@/types/issue";

/** Sort inside a column: urgent work first, then oldest — the queue people
 *  actually want to see. */
const PRIORITY_WEIGHT: Readonly<Record<Issue["priority"], number>> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export function compareBoardIssues(a: Issue, b: Issue): number {
  const byPriority = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  if (byPriority !== 0) return byPriority;
  return a.createdAt.localeCompare(b.createdAt);
}

/** Groups a flat issue list into one column per status, in workflow order. */
export function buildBoardColumns(
  issues: readonly Issue[],
): readonly IssueBoardColumn[] {
  const byStatus = new Map<IssueStatus, Issue[]>();
  for (const status of BOARD_STATUS_ORDER) byStatus.set(status, []);

  for (const issue of issues) {
    const bucket = byStatus.get(issue.status);
    if (bucket === undefined) continue;
    bucket.push(issue);
  }

  return BOARD_STATUS_ORDER.map((status) => {
    const bucket = (byStatus.get(status) ?? []).sort(compareBoardIssues);
    return { status, issues: bucket, total: bucket.length };
  });
}

/** Re-orders arbitrary columns into the canonical workflow order. */
export function orderColumns(
  columns: readonly IssueBoardColumn[],
): readonly IssueBoardColumn[] {
  return [...columns].sort(
    (a, b) =>
      BOARD_STATUS_ORDER.indexOf(a.status) -
      BOARD_STATUS_ORDER.indexOf(b.status),
  );
}

export function findIssue(
  columns: readonly IssueBoardColumn[],
  issueId: IssueId,
): Issue | null {
  for (const column of columns) {
    const found = column.issues.find((issue) => issue.id === issueId);
    if (found !== undefined) return found;
  }
  return null;
}

/**
 * Moves one issue to `toStatus` at `toIndex`, returning fresh columns.
 *
 * `toIndex` is clamped: dropping past the end of a column is a normal gesture,
 * not an error, and a drop onto the column the card already sits in is a
 * re-order rather than a status change.
 */
export function moveIssueInColumns(
  columns: readonly IssueBoardColumn[],
  issueId: IssueId,
  toStatus: IssueStatus,
  toIndex: number,
): readonly IssueBoardColumn[] {
  const moving = findIssue(columns, issueId);
  if (moving === null) return columns;

  const moved: Issue = { ...moving, status: toStatus };

  return columns.map((column) => {
    if (column.status === toStatus) {
      const without = column.issues.filter((issue) => issue.id !== issueId);
      const index = Math.max(0, Math.min(toIndex, without.length));
      const next = [
        ...without.slice(0, index),
        moved,
        ...without.slice(index),
      ];
      return { status: column.status, issues: next, total: next.length };
    }

    if (column.issues.some((issue) => issue.id === issueId)) {
      const next = column.issues.filter((issue) => issue.id !== issueId);
      return { status: column.status, issues: next, total: next.length };
    }

    return column;
  });
}
