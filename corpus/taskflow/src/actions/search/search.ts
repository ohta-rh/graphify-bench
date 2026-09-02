"use server";

/**
 * Search Server Action used by the command palette and the search page.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): searchQuerySchema, can, isEnabled, getActor, toActionResult
 */

import type { SearchHit } from "@/server/services/search-service";
import type { ActionResult } from "@/types/api";

export async function searchAction(raw: unknown): Promise<ActionResult<SearchHit[]>> {
  throw new Error("stub: src/actions/search/search.ts");
}
