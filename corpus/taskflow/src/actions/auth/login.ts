"use server";

/**
 * Signs a user in and sets the session cookie.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): loginSchema, setSessionCookie, consumeRateLimit
 */

import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

export async function loginAction(raw: unknown): Promise<ActionResult<SessionPrincipal>> {
  throw new Error("stub: src/actions/auth/login.ts");
}
