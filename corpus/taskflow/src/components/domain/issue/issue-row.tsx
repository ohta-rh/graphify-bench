/**
 * One row of `IssueList`; renders the archive control only when permitted.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { IssueId } from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
export type IssueRowProps = { issue: Issue; actor: Actor; assignee: User | null; onSelect?: (issueId: IssueId) => void };

export function IssueRow(props: IssueRowProps): ReactElement | null {
  return null;
}
