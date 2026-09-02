/**
 * One comment with author, timestamp and inline actions.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { CommentWithAuthor } from "@/types/comment";
import type { CommentId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type CommentItemProps = { comment: CommentWithAuthor; actor: Actor; depth: number; onEdit?: (commentId: CommentId) => void };

export function CommentItem(props: CommentItemProps): ReactElement | null {
  return null;
}
