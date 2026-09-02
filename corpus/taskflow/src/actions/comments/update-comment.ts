"use server";

/**
 * Edits a comment the actor authored.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateCommentSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";

export async function updateCommentAction(raw: unknown): Promise<ActionResult<Comment>> {
  throw new Error("stub: src/actions/comments/update-comment.ts");
}
