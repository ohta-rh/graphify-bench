"use server";

/**
 * Creates a label.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createLabelSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { IssueLabel } from "@/types/issue";

export async function createLabelAction(raw: unknown): Promise<ActionResult<IssueLabel>> {
  throw new Error("stub: src/actions/labels/create-label.ts");
}
