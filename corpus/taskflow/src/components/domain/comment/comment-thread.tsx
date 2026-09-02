/**
 * Threaded comment list, hiding delete for non-authors.
 *
 * Must call (do not reimplement): can
 */
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { isLive } from "@/lib/soft-delete";
import type { CommentId } from "@/types/common";
import type { CommentThreadNode } from "@/types/comment";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { CommentItem } from "./comment-item";

export type CommentThreadProps = {
  nodes: readonly CommentThreadNode[];
  actor: Actor;
  onDelete: (commentId: CommentId) => void;
  onEdit?: (commentId: CommentId) => void;
};

/** Oldest first: a discussion reads top to bottom, unlike a feed. */
export function orderThread(
  nodes: readonly CommentThreadNode[],
): readonly CommentThreadNode[] {
  return [...nodes].sort((a, b) =>
    a.comment.createdAt.localeCompare(b.comment.createdAt),
  );
}

export function CommentThread(props: CommentThreadProps): ReactElement | null {
  const { nodes, actor, onDelete, onEdit } = props;

  if (!can(actor, "comment:read", organizationResource(actor.orgId))) {
    return null;
  }

  const visible = orderThread(nodes).filter((node) => isLive(node.comment));

  if (visible.length === 0) {
    return <EmptyState title="No comments yet" description="Start the thread." />;
  }

  return (
    <ol className="comment-thread divide-y">
      {visible.map((node) => (
        <li key={node.comment.id}>
          <ol>
            <CommentItem
              comment={node.comment}
              actor={actor}
              depth={0}
              onDelete={onDelete}
              {...(onEdit !== undefined ? { onEdit } : {})}
            />
            {node.replies
              .filter(isLive)
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  actor={actor}
                  depth={1}
                  onDelete={onDelete}
                  {...(onEdit !== undefined ? { onEdit } : {})}
                />
              ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
