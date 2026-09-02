/**
 * Compact issue summary tile used by lists and the board.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Issue, IssueLabel } from "@/types/issue";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
export type IssueCardProps = { issue: Issue; assignee?: User | null; labels?: readonly IssueLabel[]; href: string; compact?: boolean };

export function IssueCard(props: IssueCardProps): ReactElement | null {
  return null;
}
