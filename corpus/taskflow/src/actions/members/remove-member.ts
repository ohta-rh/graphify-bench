"use server";

/**
 * Removes a member (soft delete) and frees the seat.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): removeMemberSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

export async function removeMemberAction(raw: unknown): Promise<ActionResult<Member>> {
  throw new Error("stub: src/actions/members/remove-member.ts");
}
