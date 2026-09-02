"use server";

/**
 * Posts a comment and fans out mention notifications; rate limited.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createCommentSchema, can, consumeRateLimit, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

export async function createCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  throw new Error("stub: src/actions/comments/create-comment.ts");
}
