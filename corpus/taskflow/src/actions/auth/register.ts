"use server";

/**
 * Creates a user, their first organization and the owner membership.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): registerSchema, setSessionCookie
 */

import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

export async function registerAction(raw: unknown): Promise<ActionResult<SessionPrincipal>> {
  throw new Error("stub: src/actions/auth/register.ts");
}
