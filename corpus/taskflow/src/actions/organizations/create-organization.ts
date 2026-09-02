"use server";

/**
 * Creates an organization with the caller as owner.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createOrganizationSchema, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

export async function createOrganizationAction(raw: unknown): Promise<ActionResult<Organization>> {
  throw new Error("stub: src/actions/organizations/create-organization.ts");
}
