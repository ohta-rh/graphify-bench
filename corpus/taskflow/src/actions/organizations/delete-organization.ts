"use server";

/**
 * Soft-deletes an organization after slug confirmation.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): deleteOrganizationSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

export async function deleteOrganizationAction(raw: unknown): Promise<ActionResult<Organization>> {
  throw new Error("stub: src/actions/organizations/delete-organization.ts");
}
