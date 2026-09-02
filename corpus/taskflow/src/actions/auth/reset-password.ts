"use server";

/**
 * Requests and confirms a password reset.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): passwordResetRequestSchema, passwordResetConfirmSchema, consumeRateLimit
 */

import type { ActionResult } from "@/types/api";

export async function requestPasswordResetAction(raw: unknown): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/auth/reset-password.ts");
}

export async function confirmPasswordResetAction(raw: unknown): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/auth/reset-password.ts");
}
