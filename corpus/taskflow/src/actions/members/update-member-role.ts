"use server";

/**
 * Changes a member's role, keeping at least one owner.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateMemberRoleSchema, can, hasRoleAtLeast, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

export async function updateMemberRoleAction(raw: unknown): Promise<ActionResult<Member>> {
  throw new Error("stub: src/actions/members/update-member-role.ts");
}
