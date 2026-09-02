/**
 * The reducer behind `useOptimisticIssues`.
 *
 * It is deliberately a pure function of `(issues, action)` so that the board
 * and the list produce identical intermediate states, and so the transition
 * rules (a closed issue gets a `completedAt`, reopening clears it) can be
 * tested without React. The server action is still the authority — this only
 * decides what the user sees between the click and the revalidation.
 */
import { toIsoTimestamp } from "@/types/common";
import type { IssueId, IsoTimestamp, UserId } from "@/types/common";
import { CLOSED_ISSUE_STATUSES, type Issue, type IssueStatus } from "@/types/issue";

export type OptimisticIssueAction =
  | { readonly kind: "status"; readonly issueId: IssueId; readonly status: IssueStatus }
  | {
      readonly kind: "assignee";
      readonly issueId: IssueId;
      readonly assigneeId: UserId | null;
    };

export function isClosedStatus(status: IssueStatus): boolean {
  return CLOSED_ISSUE_STATUSES.includes(status);
}

/** Applies one status change, keeping the lifecycle timestamps coherent. */
export function withStatus(
  issue: Issue,
  status: IssueStatus,
  at: IsoTimestamp,
): Issue {
  if (issue.status === status) return issue;
  const closing = isClosedStatus(status);
  return {
    ...issue,
    status,
    updatedAt: at,
    startedAt:
      issue.startedAt === null && status === "in_progress" ? at : issue.startedAt,
    completedAt: closing ? (issue.completedAt ?? at) : null,
  };
}

export function withAssignee(
  issue: Issue,
  assigneeId: UserId | null,
  at: IsoTimestamp,
): Issue {
  if (issue.assigneeId === assigneeId) return issue;
  return { ...issue, assigneeId, updatedAt: at };
}

export function optimisticIssuesReducer(
  issues: readonly Issue[],
  action: OptimisticIssueAction,
): readonly Issue[] {
  const at = toIsoTimestamp(new Date());
  return issues.map((issue) => {
    if (issue.id !== action.issueId) return issue;
    return action.kind === "status"
      ? withStatus(issue, action.status, at)
      : withAssignee(issue, action.assigneeId, at);
  });
}
