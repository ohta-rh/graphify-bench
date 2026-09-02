"use server";

/**
 * Destroys the session and clears the cookie.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): clearSessionCookie
 */

import type { ActionResult } from "@/types/api";

export async function logoutAction(): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/auth/logout.ts");
}
