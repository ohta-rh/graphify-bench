"use server";

/**
 * Archives an issue (soft delete).
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archiveIssueSchema, can, assertNotArchived, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

export async function archiveIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  throw new Error("stub: src/actions/issues/archive-issue.ts");
}
