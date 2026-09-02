/**
 * One comment with author, timestamp and inline actions.
 *
 * Must call (do not reimplement): can
 */
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/date";
import { highlightMentions } from "@/lib/mentions";
import { can } from "@/lib/permissions";
import { isArchived } from "@/lib/soft-delete";
import type { CommentId } from "@/types/common";
import type { CommentWithAuthor } from "@/types/comment";
import type { Actor } from "@/types/member";
import type { ReactElement } from "react";
import { commentResource } from "../permission/resources";

export type CommentItemProps = {
  comment: CommentWithAuthor;
  actor: Actor;
  depth: number;
  onEdit?: (commentId: CommentId) => void;
  onDelete?: (commentId: CommentId) => void;
};

/** Replies are indented once; deeper nesting is flattened by the thread. */
const INDENT_REM = 2;

export function CommentItem(props: CommentItemProps): ReactElement | null {
  const { comment, actor, depth, onEdit, onDelete } = props;
  const resource = commentResource(comment);

  // Authors may edit and delete their own comments below the matrix rank —
  // that escalation lives in `can()`, not here.
  const mayEdit = can(actor, "comment:update", resource);
  const mayDelete = can(actor, "comment:delete", resource);

  if (isArchived(comment)) {
    return (
      <li className="text-sm italic text-neutral-500">
        This comment was deleted.
      </li>
    );
  }

  return (
    <li
      className={cn("comment-item flex gap-2 py-2")}
      style={{ marginLeft: `${Math.min(depth, 1) * INDENT_REM}rem` }}
    >
      <Avatar
        name={comment.author.name}
        src={comment.author.avatarUrl}
        size="sm"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <strong>{comment.author.name}</strong>
          <span className="ml-2 text-neutral-500">
            {formatRelative(comment.createdAt)}
          </span>
          {comment.editedAt !== null ? (
            <span className="ml-2 text-xs text-neutral-400">(edited)</span>
          ) : null}
        </p>

        <div
          className="mt-1 text-sm"
          dangerouslySetInnerHTML={{ __html: highlightMentions(comment.body) }}
        />

        {mayEdit || mayDelete ? (
          <div className="mt-1 flex gap-1">
            {mayEdit && onEdit !== undefined ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(comment.id)}
              >
                Edit
              </Button>
            ) : null}
            {mayDelete && onDelete !== undefined ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(comment.id)}
              >
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}
