/**
 * Virtualised issue list; hides row actions the actor may not perform.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { IssueId } from "@/types/common";
import type { IssueWithRelations } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type IssueListProps = { issues: readonly IssueWithRelations[]; actor: Actor; emptyLabel?: string; onArchive?: (issueId: IssueId) => void };

export function IssueList(props: IssueListProps): ReactElement | null {
  return null;
}
