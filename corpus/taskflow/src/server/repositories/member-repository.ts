/**
 * Membership rows. Every read is filtered by `orgId`; removal is a soft delete.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archivePatch, shouldFilterArchived
 */
import type { ListMembersInput } from "@/schemas/member";
import type { IsoTimestamp, MemberId, OrgId, Page, UserId } from "@/types/common";
import type { Member, MemberWithUser, Role } from "@/types/member";
export async function findMember(orgId: OrgId, userId: UserId): Promise<Member | null> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function findMemberById(orgId: OrgId, memberId: MemberId): Promise<Member | null> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function listMembers(input: ListMembersInput): Promise<Page<MemberWithUser>> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function countActiveMembers(orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function insertMember(orgId: OrgId, userId: UserId, role: Role, invitedBy: UserId | null): Promise<Member> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function updateMemberRole(orgId: OrgId, memberId: MemberId, role: Role): Promise<Member> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function archiveMember(orgId: OrgId, memberId: MemberId): Promise<Member> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}

export async function touchLastSeen(orgId: OrgId, userId: UserId, at: IsoTimestamp): Promise<void> {
  throw new Error("stub: src/server/repositories/member-repository.ts");
}
