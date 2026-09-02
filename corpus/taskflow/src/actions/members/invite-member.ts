"use server";

/**
 * Invites one member; enforces the seat quota and the invite rate limit.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): inviteMemberSchema, can, getPlanLimits, consumeRateLimit, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Invitation } from "@/types/member";

export async function inviteMemberAction(raw: unknown): Promise<ActionResult<Invitation>> {
  throw new Error("stub: src/actions/members/invite-member.ts");
}
