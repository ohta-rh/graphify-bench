"use server";

/**
 * Updates issue fields.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateIssueSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Issue } from "@/types/issue";

export async function updateIssueAction(raw: unknown): Promise<ActionResult<Issue>> {
  throw new Error("stub: src/actions/issues/update-issue.ts");
}
