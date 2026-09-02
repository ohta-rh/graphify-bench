/**
 * Pending invitations, keyed by token hash for the unauthenticated accept flow.
 */
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, invitations } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { toInvitation } from "./_mappers";
import type { CreateInvitationInput } from "@/schemas/invitation";
import type { InvitationId, IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { Invitation } from "@/types/member";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function insertInvitation(
  orgId: OrgId,
  input: CreateInvitationInput,
  invitedBy: UserId,
  tokenHash: string,
): Promise<Invitation> {
  const stamp = toIsoTimestamp(new Date());
  const expiresAt = toIsoTimestamp(
    new Date(Date.now() + input.expiresInDays * MS_PER_DAY),
  );

  const row = getDb()
    .insert(invitations)
    .values({
      id: newId(),
      orgId,
      email: input.email,
      role: input.role,
      invitedBy,
      tokenHash,
      expiresAt,
      acceptedAt: null,
      revokedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toInvitation(row);
}

/**
 * The accept flow runs before a session exists, so this is the one read in the
 * repository layer that is not scoped by `orgId` — the token hash is the
 * credential and carries the tenant with it.
 */
export async function findInvitationByTokenHash(
  tokenHash: string,
): Promise<Invitation | null> {
  const row = getDb()
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .get();
  return row ? toInvitation(row) : null;
}

export async function listPendingInvitations(
  orgId: OrgId,
): Promise<readonly Invitation[]> {
  const rows = getDb()
    .select()
    .from(invitations)
    .where(
      and(
        orgPredicate(invitations.orgId, orgId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    )
    .orderBy(desc(invitations.createdAt))
    .all();

  return rows.map(toInvitation);
}

export async function markInvitationAccepted(
  orgId: OrgId,
  invitationId: InvitationId,
  at: IsoTimestamp,
): Promise<Invitation> {
  const row = getDb()
    .update(invitations)
    .set({ acceptedAt: at, updatedAt: at })
    .where(
      and(
        orgPredicate(invitations.orgId, orgId),
        eq(invitations.id, invitationId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Invitation ${invitationId} not found`);
  return toInvitation(row);
}

export async function revokeInvitation(
  orgId: OrgId,
  invitationId: InvitationId,
): Promise<Invitation> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .update(invitations)
    .set({ revokedAt: stamp, updatedAt: stamp })
    .where(
      and(
        orgPredicate(invitations.orgId, orgId),
        eq(invitations.id, invitationId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Invitation ${invitationId} not found`);
  return toInvitation(row);
}

/** Pending invites hold a seat, so the seat quota counts them. */
export async function countPendingInvitations(orgId: OrgId): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(invitations)
    .where(
      and(
        orgPredicate(invitations.orgId, orgId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    )
    .get();
  return row?.value ?? 0;
}
