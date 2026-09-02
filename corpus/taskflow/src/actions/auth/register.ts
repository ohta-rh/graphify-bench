"use server";

/**
 * Creates a user, their first organization and the owner membership.
 *
 * Owner D. `AuthService.register` performs all three writes in one transaction;
 * this action only turns the result into a session.
 *
 * Must call (do not reimplement): registerSchema, setSessionCookie
 */

import { toActionResult } from "@/lib/errors";
import { setSessionCookie } from "@/lib/session";
import { registerSchema } from "@/schemas/auth";
import { register } from "@/server/services/auth-service";
import { createSessionToken } from "@/server/services/session-service";
import type { ActionResult } from "@/types/api";
import type { SessionPrincipal } from "@/types/member";

export async function registerAction(raw: unknown): Promise<ActionResult<SessionPrincipal>> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const { user, org } = await register(parsed.data);
    const { token, expiresAt } = await createSessionToken(user.id);
    await setSessionCookie(token, expiresAt);

    const principal: SessionPrincipal = {
      userId: user.id,
      email: user.email,
      activeOrgId: org.id,
      expiresAt,
    };
    return { ok: true, data: principal, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
