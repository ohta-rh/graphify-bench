"use server";

/**
 * Switches the session's active organization.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): switchOrgSchema, assertOrgScope
 */

import type { ActionResult } from "@/types/api";

export async function switchOrgAction(raw: unknown): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/organizations/switch-org.ts");
}
