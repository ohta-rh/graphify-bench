/**
 * Threaded comment list, hiding delete for non-authors.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { CommentThreadNode } from "@/types/comment";
import type { CommentId } from "@/types/common";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
export type CommentThreadProps = { nodes: readonly CommentThreadNode[]; actor: Actor; onDelete: (commentId: CommentId) => void };

export function CommentThread(props: CommentThreadProps): ReactElement | null {
  return null;
}
