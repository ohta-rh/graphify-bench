/**
 * Session cookie access. In Next 16 `cookies()` is async — every function here is async for that reason.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): SESSION_COOKIE_NAME
 */
import type { IsoTimestamp } from "@/types/common";
import type { SessionPrincipal } from "@/types/member";
export async function getSessionToken(): Promise<string | null> {
  throw new Error("stub: src/lib/session.ts");
}

export async function getSessionPrincipal(): Promise<SessionPrincipal | null> {
  throw new Error("stub: src/lib/session.ts");
}

export async function setSessionCookie(token: string, expiresAt: IsoTimestamp): Promise<void> {
  throw new Error("stub: src/lib/session.ts");
}

export async function clearSessionCookie(): Promise<void> {
  throw new Error("stub: src/lib/session.ts");
}
