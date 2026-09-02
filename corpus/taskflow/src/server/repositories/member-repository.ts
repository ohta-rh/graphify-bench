/**
 * Membership rows. Every read is filtered by `orgId`; removal is a soft delete.
 *
 * Must call (do not reimplement): archivePatch, shouldFilterArchived
 */
import { and, count, desc, eq, isNull, like, or } from "drizzle-orm";
import { newId } from "@/lib/id";
import { archivePatch, shouldFilterArchived } from "@/lib/soft-delete";
import { getDb, members, users } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toMember, toUser } from "./_mappers";
import type { ListMembersInput } from "@/schemas/member";
import type { IsoTimestamp, MemberId, OrgId, Page, UserId } from "@/types/common";
import type { Member, MemberWithUser, Role } from "@/types/member";

/**
 * A removed member is archived, never deleted, and no read ever surfaces one:
 * the scope is fixed here rather than threaded through every call site.
 */
const LIVE_MEMBERS: { readonly includeArchived?: boolean } = {};

function liveMemberPredicate() {
  return shouldFilterArchived(LIVE_MEMBERS) ? isNull(members.archivedAt) : undefined;
}

export async function findMember(
  orgId: OrgId,
  userId: UserId,
): Promise<Member | null> {
  const row = getDb()
    .select()
    .from(members)
    .where(
      and(
        orgPredicate(members.orgId, orgId),
        eq(members.userId, userId),
        liveMemberPredicate(),
      ),
    )
    .get();
  return row ? toMember(row) : null;
}

export async function findMemberById(
  orgId: OrgId,
  memberId: MemberId,
): Promise<Member | null> {
  const row = getDb()
    .select()
    .from(members)
    .where(and(orgPredicate(members.orgId, orgId), eq(members.id, memberId)))
    .get();
  return row ? toMember(row) : null;
}

/** Cursor-paged member list joined with the user record the UI renders. */
export async function listMembers(
  input: ListMembersInput,
): Promise<Page<MemberWithUser>> {
  const db = getDb();
  const sort = { sortColumn: members.createdAt, idColumn: members.id };

  const filters = compact(
    orgPredicate(members.orgId, input.orgId),
    liveMemberPredicate(),
    input.role === undefined ? undefined : eq(members.role, input.role),
    input.status === undefined ? undefined : eq(members.status, input.status),
    input.query === undefined
      ? undefined
      : or(
          like(users.name, `%${input.query}%`),
          like(users.email, `%${input.query}%`),
        ),
  );

  const total = db
    .select({ value: count() })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(...filters))
    .get();

  const rows = db
    .select({ member: members, user: users })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(members.createdAt), desc(members.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(
    rows,
    input.limit,
    total?.value ?? 0,
    (row) => ({ ...toMember(row.member), user: toUser(row.user) }),
    (row) => ({ id: row.member.id, sortValue: row.member.createdAt }),
  );
}

/** The seat count every plan check compares against. */
export async function countActiveMembers(orgId: OrgId): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(members)
    .where(
      and(
        orgPredicate(members.orgId, orgId),
        eq(members.status, "active"),
        liveMemberPredicate(),
      ),
    )
    .get();
  return row?.value ?? 0;
}

export async function insertMember(
  orgId: OrgId,
  userId: UserId,
  role: Role,
  invitedBy: UserId | null,
): Promise<Member> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(members)
    .values({
      id: newId(),
      orgId,
      userId,
      role,
      status: "active",
      invitedBy,
      joinedAt: stamp,
      lastSeenAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toMember(row);
}

export async function updateMemberRole(
  orgId: OrgId,
  memberId: MemberId,
  role: Role,
): Promise<Member> {
  const row = getDb()
    .update(members)
    .set({ role, updatedAt: toIsoTimestamp(new Date()) })
    .where(and(orgPredicate(members.orgId, orgId), eq(members.id, memberId)))
    .returning()
    .get();

  if (!row) throw new Error(`Member ${memberId} not found in org ${orgId}`);
  return toMember(row);
}

/** Removal is a soft delete so the audit log keeps pointing at a real row. */
export async function archiveMember(
  orgId: OrgId,
  memberId: MemberId,
): Promise<Member> {
  const row = getDb()
    .update(members)
    .set({ ...archivePatch(), status: "suspended" })
    .where(and(orgPredicate(members.orgId, orgId), eq(members.id, memberId)))
    .returning()
    .get();

  if (!row) throw new Error(`Member ${memberId} not found in org ${orgId}`);
  return toMember(row);
}

export async function touchLastSeen(
  orgId: OrgId,
  userId: UserId,
  at: IsoTimestamp,
): Promise<void> {
  getDb()
    .update(members)
    .set({ lastSeenAt: at })
    .where(and(orgPredicate(members.orgId, orgId), eq(members.userId, userId)))
    .run();
}
