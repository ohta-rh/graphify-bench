"use server";

/**
 * Soft-deletes a comment.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): deleteCommentSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

export async function deleteCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  throw new Error("stub: src/actions/comments/delete-comment.ts");
}
