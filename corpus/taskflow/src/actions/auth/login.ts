"use server";

/**
 * Signs a user in and sets the session cookie.
 *
 * Owner D. Runs before any tenant is known, so it cannot go through
 * `withAction()` — there is no `Actor` to resolve yet. The rate limit is
 * charged against the anonymous bucket to blunt credential stuffing.
 *
 * Must call (do not reimplement): loginSchema, setSessionCookie,
 * consumeRateLimit
 */

import { ANONYMOUS_ORG_ID } from "@/actions/_lib/permission-resources";
import { RateLimitedError } from "@/actions/_lib/action-errors";
import { toActionResult } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { setSessionCookie } from "@/lib/session";
import { loginSchema } from "@/schemas/auth";
import { login } from "@/server/services/auth-service";
import { resolveSession } from "@/server/services/session-service";
import { UnauthorizedActionError } from "@/actions/_lib/action-errors";
import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

const LOGIN_BUCKET = "auth:login";

export async function loginAction(raw: unknown): Promise<ActionResult<SessionPrincipal>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const verdict = await consumeRateLimit(ANONYMOUS_ORG_ID, LOGIN_BUCKET);
    if (!verdict.allowed) {
      throw new RateLimitedError(LOGIN_BUCKET, verdict.resetAt);
    }

    const { token } = await login(parsed.data);
    const principal = await resolveSession(token);
    if (principal === null) {
      throw new UnauthorizedActionError("That sign-in could not be completed.");
    }

    await setSessionCookie(token, principal.expiresAt);
    return { ok: true, data: principal, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
