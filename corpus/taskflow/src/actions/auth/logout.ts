"use server";

/**
 * Destroys the session and clears the cookie.
 *
 * Owner D. Idempotent: signing out twice, or without a session at all, is a
 * success — the postcondition ("no session cookie") holds either way.
 *
 * Must call (do not reimplement): clearSessionCookie
 */

import { toActionResult } from "@/lib/errors";
import { clearSessionCookie, getSessionToken } from "@/lib/session";
import { destroySession } from "@/server/services/session-service";
import type { ActionResult } from "@/types/api";

export async function logoutAction(): Promise<ActionResult<null>> {
  try {
    const token = await getSessionToken();
    if (token !== null) {
      await destroySession(token);
    }
    await clearSessionCookie();
    return { ok: true, data: null, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
