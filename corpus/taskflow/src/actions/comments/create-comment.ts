"use server";

/**
 * Posts a comment and fans out mention notifications; rate limited.
 *
 * Owner D. The notification fan-out itself is not triggered here — the service
 * emits `comment.created` and `NotificationService` subscribes to it. This
 * action only validates, authorizes, charges the rate limit and revalidates.
 *
 * Must call (do not reimplement): createCommentSchema, can, consumeRateLimit,
 * getActor, toActionResult
 */

import { ForbiddenActionError, RateLimitedError } from "@/actions/_lib/action-errors";
import { PENDING_COMMENT_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, issueTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createCommentSchema, type CreateCommentInput } from "@/schemas/comment";
import { createComment } from "@/server/services/comment-service";
import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

const COMMENT_BUCKET = "comment:create";

const run = withAction<typeof createCommentSchema, Comment>(
  createCommentSchema,
  async (raw, actor) => {
    const input = raw as CreateCommentInput;

    const allowed = can(actor, "comment:create", {
      kind: "comment",
      orgId: input.orgId,
      commentId: PENDING_COMMENT_ID,
      authorId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("comment:create");
    }

    const verdict = await consumeRateLimit(input.orgId, COMMENT_BUCKET);
    if (!verdict.allowed) {
      throw new RateLimitedError(COMMENT_BUCKET, verdict.resetAt);
    }

    const comment = await createComment(actor, input);
    revalidateTagged([issueTag(input.issueId)], CACHE_PROFILES.seconds);
    return comment;
  },
  { revalidate: ["comments"], cacheProfile: "seconds" },
);

export async function createCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  return run(raw);
}
