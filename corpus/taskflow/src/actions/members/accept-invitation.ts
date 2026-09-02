"use server";

/**
 * Accepts an invitation token and creates the membership.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): acceptInvitationTokenSchema, getPlanLimits
 */

import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

export async function acceptInvitationAction(raw: unknown): Promise<ActionResult<Member>> {
  throw new Error("stub: src/actions/members/accept-invitation.ts");
}
