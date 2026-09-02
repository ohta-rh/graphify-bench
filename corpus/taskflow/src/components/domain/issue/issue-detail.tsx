/**
 * Issue header, description and metadata rail.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { IssueWithRelations } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
export type IssueDetailProps = { issue: IssueWithRelations; actor: Actor; author: User; assignee: User | null };

export function IssueDetail(props: IssueDetailProps): ReactElement | null {
  return null;
}
