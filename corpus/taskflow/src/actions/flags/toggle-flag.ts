"use server";

/**
 * Toggles an org-level feature flag override.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): toggleFeatureFlagSchema, can, isEnabled, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

export async function toggleFeatureFlagAction(raw: unknown): Promise<ActionResult<Organization>> {
  throw new Error("stub: src/actions/flags/toggle-flag.ts");
}
