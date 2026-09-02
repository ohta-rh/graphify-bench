"use server";

/**
 * Requests and confirms a password reset.
 *
 * Owner D. The request half deliberately reports success even for an unknown
 * address so the form cannot be used to enumerate accounts; the rate limit is
 * what stops it being abused as a mail cannon.
 *
 * Must call (do not reimplement): passwordResetRequestSchema,
 * passwordResetConfirmSchema, consumeRateLimit
 */

import { RateLimitedError } from "@/actions/_lib/action-errors";
import { ANONYMOUS_ORG_ID } from "@/actions/_lib/permission-resources";
import { toActionResult } from "@/lib/errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
} from "@/schemas/auth";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "@/server/services/auth-service";
import type { ActionResult } from "@/types/api";

const RESET_BUCKET = "auth:password-reset";

export async function requestPasswordResetAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  const parsed = passwordResetRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const verdict = await consumeRateLimit(ANONYMOUS_ORG_ID, RESET_BUCKET);
    if (!verdict.allowed) {
      throw new RateLimitedError(RESET_BUCKET, verdict.resetAt);
    }

    await requestPasswordReset(parsed.data);
    return { ok: true, data: null, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}

export async function confirmPasswordResetAction(
  raw: unknown,
): Promise<ActionResult<null>> {
  const parsed = passwordResetConfirmSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const verdict = await consumeRateLimit(ANONYMOUS_ORG_ID, RESET_BUCKET);
    if (!verdict.allowed) {
      throw new RateLimitedError(RESET_BUCKET, verdict.resetAt);
    }

    await confirmPasswordReset(parsed.data);
    return { ok: true, data: null, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
