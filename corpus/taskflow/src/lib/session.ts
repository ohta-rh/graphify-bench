/**
 * Session cookie access. In Next 16 `cookies()` is async — every function
 * here is async for that reason, and nothing outside this module touches the
 * cookie jar, so the cookie's name, flags and lifetime are stated once.
 */
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/schemas/session";
import { resolveSession } from "@/server/services/session-service";
import type { IsoTimestamp } from "@/types/common";
import type { SessionPrincipal } from "@/types/member";
import { parseIso } from "./date";

export async function getSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(SESSION_COOKIE_NAME)?.value ?? null;
}

/**
 * The signed-in principal, or `null` when there is no cookie, the token is
 * unknown, or the session has expired. Callers that need a hard failure use
 * `getActor()` in `@/lib/actor` instead.
 */
export async function getSessionPrincipal(): Promise<SessionPrincipal | null> {
  const token = await getSessionToken();
  if (token === null) return null;

  const principal = await resolveSession(token);
  if (principal === null) return null;

  return parseIso(principal.expiresAt).getTime() > Date.now() ? principal : null;
}

export async function setSessionCookie(
  token: string,
  expiresAt: IsoTimestamp,
): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: parseIso(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}
