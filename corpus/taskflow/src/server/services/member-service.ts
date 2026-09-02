/**
 * Membership and role changes, including the invariant that an organization always keeps one owner.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, hasRoleAtLeast
 */
import { emit } from "@/lib/event-bus";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as memberRepo from "@/server/repositories/member-repository";
import { hasRoleAtLeast } from "@/types/member";
import { actorEnvelope, memberResource, requireFound } from "./_support";
import type {
  ListMembersInput,
  RemoveMemberInput,
  UpdateMemberRoleInput,
} from "@/schemas/member";
import type { MemberId, OrgId, Page, UserId } from "@/types/common";
import type { Actor, Member, MemberWithUser, Role } from "@/types/member";

/** How many members are scanned when counting the remaining owners. */
const OWNER_SCAN_LIMIT = 100;

export async function listMembers(
  actor: Actor,
  input: ListMembersInput,
): Promise<Page<MemberWithUser>> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "member:read", {
    kind: "organization",
    orgId: input.orgId,
  });
  return memberRepo.listMembers(input);
}

/**
 * Role changes carry two rules the permission matrix cannot express:
 * nobody may grant a role above their own, and the last owner may not be
 * demoted. Both are checked after `can()` has had its say.
 */
export async function updateMemberRole(
  actor: Actor,
  input: UpdateMemberRoleInput,
): Promise<Member> {
  assertOrgScope(actor, input.orgId);

  const member = requireFound(
    await memberRepo.findMemberById(input.orgId, input.memberId),
    "Member",
    input.memberId,
  );
  assertCan(actor, "member:update_role", memberResource(member));

  if (!hasRoleAtLeast(actor.role, input.role)) {
    throw new Error(
      `A ${actor.role} cannot grant the ${input.role} role`,
    );
  }

  await assertLastOwnerRetained(input.orgId, input.memberId, input.role);

  const updated = await memberRepo.updateMemberRole(
    input.orgId,
    input.memberId,
    input.role,
  );

  await emit("member.role_changed", {
    ...actorEnvelope(actor),
    memberId: updated.id,
    from: member.role,
    to: updated.role,
  });

  return updated;
}

/**
 * Removal is a soft delete, and it is subject to the same last-owner rule as a
 * demotion — a removed owner is a demotion to "no role at all".
 */
export async function removeMember(
  actor: Actor,
  input: RemoveMemberInput,
): Promise<Member> {
  assertOrgScope(actor, input.orgId);

  const member = requireFound(
    await memberRepo.findMemberById(input.orgId, input.memberId),
    "Member",
    input.memberId,
  );
  assertCan(actor, "member:remove", memberResource(member));

  await assertLastOwnerRetained(input.orgId, input.memberId, "member");

  const removed = await memberRepo.archiveMember(input.orgId, input.memberId);

  await emit("member.removed", {
    ...actorEnvelope(actor),
    memberId: removed.id,
    userId: removed.userId,
  });

  return removed;
}

/**
 * Turns a (user, org) pair into the `Actor` every service method takes. The
 * only place an `Actor` is minted from stored state — jobs and the session
 * layer both come through here.
 */
export async function resolveActor(
  userId: UserId,
  orgId: OrgId,
): Promise<Actor | null> {
  const member = await memberRepo.findMember(orgId, userId);
  if (!member || member.status !== "active") return null;

  return { userId, orgId, role: member.role };
}

/**
 * Throws when applying `nextRole` to `memberId` would leave the organization
 * without an owner. Exported because both the demote and the remove path need
 * it, and the invariant must not be stated twice.
 */
export async function assertLastOwnerRetained(
  orgId: OrgId,
  memberId: MemberId,
  nextRole: Role,
): Promise<void> {
  if (nextRole === "owner") return;

  const member = await memberRepo.findMemberById(orgId, memberId);
  if (!member || member.role !== "owner") return;

  const page = await memberRepo.listMembers({
    orgId,
    role: "owner",
    limit: OWNER_SCAN_LIMIT,
    cursor: null,
  });

  const remaining = page.items.filter((row) => row.id !== memberId);
  if (remaining.length === 0) {
    throw new Error(
      "An organization must keep at least one owner; transfer ownership first",
    );
  }
}
