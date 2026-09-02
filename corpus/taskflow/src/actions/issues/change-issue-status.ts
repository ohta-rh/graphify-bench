"use server";

/**
 * Moves an issue between statuses and emits `issue.status_changed`.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): changeIssueStatusSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

export async function changeIssueStatusAction(raw: unknown): Promise<ActionResult<Issue>> {
  throw new Error("stub: src/actions/issues/change-issue-status.ts");
}
