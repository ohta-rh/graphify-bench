"use client";

/**
 * `useOptimistic` wrapper reconciled by the issue Server Actions.
 *
 * The caller renders `issues` and fires `applyStatus` / `applyAssignee` inside
 * the same transition that invokes the action; React discards the optimistic
 * state once the action resolves and the route revalidates.
 */
import { useCallback, useOptimistic } from "react";
import type { IssueId, UserId } from "@/types/common";
import type { Issue, IssueStatus } from "@/types/issue";
import { optimisticIssuesReducer } from "./optimistic-issues-reducer";

export function useOptimisticIssues(issues: readonly Issue[]): {
  issues: readonly Issue[];
  applyStatus: (issueId: IssueId, status: IssueStatus) => void;
  applyAssignee: (issueId: IssueId, assigneeId: UserId | null) => void;
} {
  const [optimistic, apply] = useOptimistic(issues, optimisticIssuesReducer);

  const applyStatus = useCallback(
    (issueId: IssueId, status: IssueStatus) => {
      apply({ kind: "status", issueId, status });
    },
    [apply],
  );

  const applyAssignee = useCallback(
    (issueId: IssueId, assigneeId: UserId | null) => {
      apply({ kind: "assignee", issueId, assigneeId });
    },
    [apply],
  );

  return { issues: optimistic, applyStatus, applyAssignee };
}
