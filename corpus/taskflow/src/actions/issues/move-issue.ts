"use server";

/**
 * Board drag-and-drop target; reconciles the optimistic update.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): moveIssueSchema, can, isEnabled, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

export async function moveIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  throw new Error("stub: src/actions/issues/move-issue.ts");
}
