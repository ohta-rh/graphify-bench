/**
 * Shared JSON helpers for the route handlers.
 *
 * Owner D. Every handler under `src/app/api` returns the same envelope as the
 * Server Actions — `{ error: AppErrorShape }` on failure — so a client can use
 * one parser for both. The status code comes from `HTTP_STATUS_BY_CODE`, which
 * is the single mapping from domain error code to HTTP.
 */

import { HTTP_STATUS_BY_CODE, toAppError } from "@/lib/errors";
import type { AppErrorShape, ApiErrorBody } from "@/types/api";

/** Turns any thrown value into the JSON error envelope with the right status. */
export function errorResponse(error: unknown): Response {
  const shape: AppErrorShape = toAppError(error);
  const body: ApiErrorBody = { error: shape };
  return Response.json(body, { status: HTTP_STATUS_BY_CODE[shape.code] });
}

/** Builds the envelope for a failure the handler detected itself. */
export function failure(
  code: AppErrorShape["code"],
  message: string,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status: HTTP_STATUS_BY_CODE[code] });
}

/**
 * Cron endpoints are protected by a shared secret rather than a session — they
 * are called by the platform scheduler, which has no cookie jar.
 */
export function assertCronSecret(request: Request): void {
  const expected = process.env.TASKFLOW_CRON_SECRET;
  if (expected === undefined || expected.length === 0) {
    // No secret configured means cron is disabled rather than wide open.
    throw new CronAuthError("Cron trigger is not configured.");
  }
  if (request.headers.get("x-taskflow-cron") !== expected) {
    throw new CronAuthError("Bad cron secret.");
  }
}

export class CronAuthError extends Error {
  readonly code = "unauthorized" as const;

  constructor(message: string) {
    super(message);
    this.name = "CronAuthError";
  }
}
