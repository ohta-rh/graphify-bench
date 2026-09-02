"use server";

/**
 * Assigns or unassigns an issue.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assignIssueSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

export async function assignIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  throw new Error("stub: src/actions/issues/assign-issue.ts");
}
