/**
 * Membership and role changes, including the invariant that an organization always keeps one owner.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, hasRoleAtLeast
 */
import type { ListMembersInput, RemoveMemberInput, UpdateMemberRoleInput } from "@/schemas/member";
import type { MemberId, OrgId, Page, UserId } from "@/types/common";
import type { Actor, Member, MemberWithUser, Role } from "@/types/member";
export async function listMembers(actor: Actor, input: ListMembersInput): Promise<Page<MemberWithUser>> {
  throw new Error("stub: src/server/services/member-service.ts");
}

export async function updateMemberRole(actor: Actor, input: UpdateMemberRoleInput): Promise<Member> {
  throw new Error("stub: src/server/services/member-service.ts");
}

export async function removeMember(actor: Actor, input: RemoveMemberInput): Promise<Member> {
  throw new Error("stub: src/server/services/member-service.ts");
}

export async function resolveActor(userId: UserId, orgId: OrgId): Promise<Actor | null> {
  throw new Error("stub: src/server/services/member-service.ts");
}

export async function assertLastOwnerRetained(orgId: OrgId, memberId: MemberId, nextRole: Role): Promise<void> {
  throw new Error("stub: src/server/services/member-service.ts");
}
