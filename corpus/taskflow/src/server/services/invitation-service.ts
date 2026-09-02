/**
 * Invite issuing and acceptance. Enforces the seat quota and the invite rate limit before a token is minted.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, wouldExceedLimit, getPlanLimits, consumeRateLimit
 */
import { getPlanLimits, wouldExceedLimit } from "@/config/plan-limits";
import { emit } from "@/lib/event-bus";
import { hashToken, randomToken } from "@/lib/hash";
import { assertCan } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertOrgScope } from "@/lib/tenant";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import { toIsoTimestamp } from "@/types/common";
import { envelope, orgResource, requireFound } from "./_support";
import type { AcceptInvitationTokenInput } from "@/schemas/invitation";
import type { InviteMemberInput, InviteMembersInput } from "@/schemas/member";
import type { InvitationId, UserId } from "@/types/common";
import type { Actor, Invitation, Member } from "@/types/member";

/** Token bucket protecting the invite mailer from being used as a spam relay. */
const INVITE_BUCKET = "member:invite";

/** Default validity of a freshly minted invitation, in days. */
const DEFAULT_EXPIRY_DAYS = 14;

export async function inviteMember(
  actor: Actor,
  input: InviteMemberInput,
): Promise<Invitation> {
  const [invitation] = await inviteMembers(actor, {
    orgId: input.orgId,
    invites: [{ email: input.email, role: input.role }],
  });

  if (!invitation) throw new Error("Invitation was not created");
  return invitation;
}

/**
 * Bulk invite. The seat quota is checked once for the whole batch — inviting
 * five people into a plan with three free seats must fail as a batch rather
 * than half-succeeding — and the rate limit is charged per invite.
 */
export async function inviteMembers(
  actor: Actor,
  input: InviteMembersInput,
): Promise<readonly Invitation[]> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "member:invite", orgResource(input.orgId));

  const verdict = await consumeRateLimit(
    input.orgId,
    INVITE_BUCKET,
    input.invites.length,
  );
  if (!verdict.allowed) {
    throw new Error(
      `Invite rate limit reached; try again after ${verdict.resetAt}`,
    );
  }

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  const seatsUsed =
    (await memberRepo.countActiveMembers(input.orgId)) +
    (await invitationRepo.countPendingInvitations(input.orgId));

  if (
    wouldExceedLimit(org.plan, "seats", seatsUsed, input.invites.length)
  ) {
    const limits = getPlanLimits(org.plan);
    throw new Error(
      `Plan ${org.plan} includes ${limits.seats} seats and ${seatsUsed} are taken`,
    );
  }

  const invitations: Invitation[] = [];

  for (const invite of input.invites) {
    const token = randomToken(32);
    const invitation = await invitationRepo.insertInvitation(
      input.orgId,
      {
        orgId: input.orgId,
        email: invite.email,
        role: invite.role,
        expiresInDays: DEFAULT_EXPIRY_DAYS,
      },
      actor.userId,
      hashToken(token),
    );

    invitations.push(invitation);

    await emit("member.invited", {
      orgId: input.orgId,
      actorId: actor.userId,
      occurredAt: invitation.createdAt,
      email: invite.email,
      role: invite.role,
    });
  }

  return invitations;
}

/**
 * Accepting runs unauthenticated: the token is the credential, so there is no
 * `Actor` to scope against and every check has to come off the stored row.
 */
export async function acceptInvitation(
  userId: UserId,
  input: AcceptInvitationTokenInput,
): Promise<Member> {
  const invitation = requireFound(
    await invitationRepo.findInvitationByTokenHash(hashToken(input.token)),
    "Invitation",
    "token",
  );

  if (invitation.revokedAt !== null) {
    throw new Error("That invitation has been revoked");
  }
  if (invitation.acceptedAt !== null) {
    throw new Error("That invitation has already been accepted");
  }
  if (invitation.expiresAt <= toIsoTimestamp(new Date())) {
    throw new Error("That invitation has expired");
  }

  const existing = await memberRepo.findMember(invitation.orgId, userId);
  if (existing) return existing;

  const member = await memberRepo.insertMember(
    invitation.orgId,
    userId,
    invitation.role,
    invitation.invitedBy,
  );

  await invitationRepo.markInvitationAccepted(
    invitation.orgId,
    invitation.id,
    toIsoTimestamp(new Date()),
  );

  await emit("member.joined", {
    ...envelope(invitation.orgId, userId),
    memberId: member.id,
    userId,
    role: member.role,
  });

  return member;
}

export async function revokeInvitation(
  actor: Actor,
  invitationId: InvitationId,
): Promise<Invitation> {
  assertCan(actor, "member:invite", orgResource(actor.orgId));
  return invitationRepo.revokeInvitation(actor.orgId, invitationId);
}

/**
 * Re-issuing does not mint a new row: the original is revoked and replaced so
 * the audit trail keeps both, and the old link stops working immediately.
 */
export async function resendInvitation(
  actor: Actor,
  invitationId: InvitationId,
): Promise<Invitation> {
  assertOrgScope(actor, actor.orgId);
  assertCan(actor, "member:invite", orgResource(actor.orgId));

  const previous = requireFound(
    await invitationRepo
      .listPendingInvitations(actor.orgId)
      .then((rows) => rows.find((row) => row.id === invitationId) ?? null),
    "Invitation",
    invitationId,
  );

  await invitationRepo.revokeInvitation(actor.orgId, invitationId);

  return inviteMember(actor, {
    orgId: actor.orgId,
    email: previous.email,
    role: previous.role === "owner" ? "admin" : previous.role,
  });
}
