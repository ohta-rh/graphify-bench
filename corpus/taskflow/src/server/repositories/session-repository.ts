/**
 * Session rows for the cookie-based auth: create, look up by token hash, revoke.
 */
import { eq, lt } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, sessions, users } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { brandId, brandStamp } from "./_mappers";
import type {
  IsoTimestamp,
  OrgId,
  SessionId,
  UserId,
} from "@/types/common";
import type { SessionPrincipal } from "@/types/member";

/**
 * Sessions are global rather than tenant-scoped: one cookie can move between
 * organizations via `activeOrgId`, and `SessionService` resolves the `Actor`
 * for whichever org the request addresses.
 */
export async function createSession(
  userId: UserId,
  tokenHash: string,
  expiresAt: IsoTimestamp,
): Promise<SessionPrincipal> {
  const stamp = toIsoTimestamp(new Date());
  const user = getDb().select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error(`User ${userId} not found`);

  getDb()
    .insert(sessions)
    .values({
      id: newId(),
      userId,
      activeOrgId: null,
      tokenHash,
      expiresAt,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .run();

  return {
    userId,
    email: user.email,
    activeOrgId: null,
    expiresAt,
  };
}

/** Expired rows resolve to `null` rather than being returned and re-checked. */
export async function findSessionByTokenHash(
  tokenHash: string,
): Promise<SessionPrincipal | null> {
  const row = getDb()
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash))
    .get();

  if (!row) return null;
  if (row.session.expiresAt <= new Date().toISOString()) return null;

  return {
    userId: brandId<UserId>(row.session.userId),
    email: row.user.email,
    activeOrgId:
      row.session.activeOrgId === null
        ? null
        : brandId<OrgId>(row.session.activeOrgId),
    expiresAt: brandStamp(row.session.expiresAt),
  };
}

export async function setActiveOrg(
  sessionId: SessionId,
  orgId: OrgId,
): Promise<void> {
  getDb()
    .update(sessions)
    .set({ activeOrgId: orgId, updatedAt: toIsoTimestamp(new Date()) })
    .where(eq(sessions.id, sessionId))
    .run();
}

export async function revokeSession(sessionId: SessionId): Promise<void> {
  getDb().delete(sessions).where(eq(sessions.id, sessionId)).run();
}

/** Housekeeping sweep; returns how many rows the scheduler removed. */
export async function purgeExpiredSessions(
  now: IsoTimestamp,
): Promise<number> {
  const rows = getDb()
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id })
    .all();
  return rows.length;
}
