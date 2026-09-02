/**
 * Invite issuing and acceptance. Enforces the seat quota and the invite rate limit before a token is minted.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, getPlanLimits, consumeRateLimit
 */
import type { AcceptInvitationTokenInput } from "@/schemas/invitation";
import type { InviteMemberInput, InviteMembersInput } from "@/schemas/member";
import type { InvitationId, UserId } from "@/types/common";
import type { Actor, Invitation, Member } from "@/types/member";
export async function inviteMember(actor: Actor, input: InviteMemberInput): Promise<Invitation> {
  throw new Error("stub: src/server/services/invitation-service.ts");
}

export async function inviteMembers(actor: Actor, input: InviteMembersInput): Promise<readonly Invitation[]> {
  throw new Error("stub: src/server/services/invitation-service.ts");
}

export async function acceptInvitation(userId: UserId, input: AcceptInvitationTokenInput): Promise<Member> {
  throw new Error("stub: src/server/services/invitation-service.ts");
}

export async function revokeInvitation(actor: Actor, invitationId: InvitationId): Promise<Invitation> {
  throw new Error("stub: src/server/services/invitation-service.ts");
}

export async function resendInvitation(actor: Actor, invitationId: InvitationId): Promise<Invitation> {
  throw new Error("stub: src/server/services/invitation-service.ts");
}
