"use server";

/**
 * Soft-deletes a comment.
 *
 * Owner D. Deletion is a soft delete: `CommentService` stamps `archived_at`
 * through `archivePatch()` and the thread query filters it out, so replies
 * hanging off the comment keep their parent id.
 *
 * Must call (do not reimplement): deleteCommentSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { deleteCommentSchema, type DeleteCommentInput } from "@/schemas/comment";
import { deleteComment } from "@/server/services/comment-service";
import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

const run = withAction<typeof deleteCommentSchema, Comment>(
  deleteCommentSchema,
  async (raw, actor) => {
    const input = raw as DeleteCommentInput;

    const allowed = can(actor, "comment:delete", {
      kind: "comment",
      orgId: input.orgId,
      commentId: input.commentId,
      authorId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("comment:delete");
    }

    const comment = await deleteComment(actor, input);
    revalidateTagged([issueTag(comment.issueId)], CACHE_PROFILES.seconds);
    return comment;
  },
  { revalidate: ["comments"], cacheProfile: "seconds" },
);

export async function deleteCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  return run(raw);
}
