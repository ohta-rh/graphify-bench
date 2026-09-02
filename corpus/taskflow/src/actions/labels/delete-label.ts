"use server";

/**
 * Deletes a label and detaches it from every issue.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): deleteLabelSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";

export async function deleteLabelAction(raw: unknown): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/labels/delete-label.ts");
}
