"use server";

/**
 * Updates org profile and settings.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateOrganizationSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

export async function updateOrganizationAction(raw: unknown): Promise<ActionResult<Organization>> {
  throw new Error("stub: src/actions/organizations/update-organization.ts");
}
