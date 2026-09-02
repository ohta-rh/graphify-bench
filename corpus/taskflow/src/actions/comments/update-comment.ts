"use server";

/**
 * Edits a comment the actor authored.
 *
 * Owner D. The `can()` call here is an optimistic pre-check made with the
 * caller as the presumed author, so a viewer is rejected before the round trip;
 * `CommentService.updateComment` repeats the check with the persisted
 * `authorId`, which is what actually enforces "only your own comments".
 *
 * Must call (do not reimplement): updateCommentSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { updateCommentSchema, type UpdateCommentInput } from "@/schemas/comment";
import { updateComment } from "@/server/services/comment-service";
import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

const run = withAction<typeof updateCommentSchema, Comment>(
  updateCommentSchema,
  async (raw, actor) => {
    const input = raw as UpdateCommentInput;

    const allowed = can(actor, "comment:update", {
      kind: "comment",
      orgId: input.orgId,
      commentId: input.commentId,
      authorId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("comment:update");
    }

    const comment = await updateComment(actor, input);
    revalidateTagged(["comments"], CACHE_PROFILES.seconds);
    return comment;
  },
  { revalidate: ["comments"], cacheProfile: "seconds" },
);

export async function updateCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  return run(raw);
}
