/**
 * Pending invitations, keyed by token hash for the unauthenticated accept flow.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { CreateInvitationInput } from "@/schemas/invitation";
import type { InvitationId, IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { Invitation } from "@/types/member";
export async function insertInvitation(orgId: OrgId, input: CreateInvitationInput, invitedBy: UserId, tokenHash: string): Promise<Invitation> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}

export async function findInvitationByTokenHash(tokenHash: string): Promise<Invitation | null> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}

export async function listPendingInvitations(orgId: OrgId): Promise<readonly Invitation[]> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}

export async function markInvitationAccepted(orgId: OrgId, invitationId: InvitationId, at: IsoTimestamp): Promise<Invitation> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}

export async function revokeInvitation(orgId: OrgId, invitationId: InvitationId): Promise<Invitation> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}

export async function countPendingInvitations(orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/repositories/invitation-repository.ts");
}
