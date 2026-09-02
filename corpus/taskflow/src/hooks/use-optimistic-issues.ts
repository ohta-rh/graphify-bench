"use client";

/**
 * `useOptimistic` wrapper reconciled by the issue Server Actions.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssueId, UserId } from "@/types/common";
import type { Issue, IssueStatus } from "@/types/issue";
export function useOptimisticIssues(issues: readonly Issue[]): { issues: readonly Issue[]; applyStatus: (issueId: IssueId, status: IssueStatus) => void; applyAssignee: (issueId: IssueId, assigneeId: UserId | null) => void } {
  throw new Error("stub: src/hooks/use-optimistic-issues.ts");
}
