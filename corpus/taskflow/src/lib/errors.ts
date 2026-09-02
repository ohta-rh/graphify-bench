/**
 * Maps thrown domain errors onto `AppErrorShape`.
 *
 * The service layer throws (`PermissionDeniedError`, `TenantScopeError`,
 * `FeatureDisabledError`, `AlreadyArchivedError`, `InvalidSlugError`,
 * `ZodError`); Server Actions and Route Handlers never propagate those to the
 * client. Everything funnels through `toAppError()` so one thrown class maps
 * to exactly one `ErrorCode` and one HTTP status, app-wide.
 */
import { FeatureDisabledError } from "@/lib/feature-flags";
import { PermissionDeniedError } from "@/lib/permissions";
import { InvalidSlugError } from "@/lib/slug";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import type { ActionResult, AppErrorShape, ErrorCode } from "@/types/api";
import { ZodError, type ZodIssue } from "zod";

export const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  rate_limited: 429,
  plan_limit_exceeded: 402,
  tenant_scope_violation: 403,
  internal_error: 500,
};

/** True for the error classes this module knows how to translate faithfully. */
export function isDomainError(error: unknown): boolean {
  return (
    error instanceof PermissionDeniedError ||
    error instanceof TenantScopeError ||
    error instanceof FeatureDisabledError ||
    error instanceof AlreadyArchivedError ||
    error instanceof InvalidSlugError ||
    error instanceof ZodError
  );
}

/** Collapses a `ZodError` into the `field → messages` map forms consume. */
export function fieldErrorsFromZod(
  error: ZodError,
): Readonly<Record<string, readonly string[]>> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues as readonly ZodIssue[]) {
    const key = issue.path.length === 0 ? "_root" : issue.path.join(".");
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export function toAppError(error: unknown): AppErrorShape {
  if (error instanceof ZodError) {
    return {
      code: "validation_failed",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZod(error),
    };
  }

  if (error instanceof PermissionDeniedError) {
    return {
      code: "forbidden",
      message: error.message,
      meta: {
        action: error.action,
        resourceKind: error.decision.resourceKind,
        reason: error.decision.reason,
      },
    };
  }

  if (error instanceof TenantScopeError) {
    return {
      code: "tenant_scope_violation",
      message: "That resource belongs to a different organization.",
      meta: { expectedOrgId: error.expectedOrgId, actualOrgId: error.actualOrgId },
    };
  }

  if (error instanceof FeatureDisabledError) {
    return {
      code: "forbidden",
      message: error.message,
      meta: { flag: error.flag },
    };
  }

  if (error instanceof AlreadyArchivedError) {
    return {
      code: "conflict",
      message: error.message,
      meta: { entity: error.entity, id: error.id },
    };
  }

  if (error instanceof InvalidSlugError) {
    return {
      code: "validation_failed",
      message: error.message,
      fieldErrors: { slug: [error.message] },
      meta: { value: error.value },
    };
  }

  return {
    code: "internal_error",
    message:
      error instanceof Error ? error.message : "Something went wrong. Try again.",
  };
}

/** The failure envelope a Server Action returns instead of throwing. */
export function toActionResult(error: unknown): ActionResult<never> {
  return {
    ok: false,
    error: toAppError(error),
    submittedAt: new Date().toISOString(),
  };
}
