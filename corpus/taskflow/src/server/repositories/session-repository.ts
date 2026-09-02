/**
 * Session rows for the cookie-based auth: create, look up by token hash, revoke.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp, OrgId, SessionId, UserId } from "@/types/common";
import type { SessionPrincipal } from "@/types/member";
export async function createSession(userId: UserId, tokenHash: string, expiresAt: IsoTimestamp): Promise<SessionPrincipal> {
  throw new Error("stub: src/server/repositories/session-repository.ts");
}

export async function findSessionByTokenHash(tokenHash: string): Promise<SessionPrincipal | null> {
  throw new Error("stub: src/server/repositories/session-repository.ts");
}

export async function setActiveOrg(sessionId: SessionId, orgId: OrgId): Promise<void> {
  throw new Error("stub: src/server/repositories/session-repository.ts");
}

export async function revokeSession(sessionId: SessionId): Promise<void> {
  throw new Error("stub: src/server/repositories/session-repository.ts");
}

export async function purgeExpiredSessions(now: IsoTimestamp): Promise<number> {
  throw new Error("stub: src/server/repositories/session-repository.ts");
}
