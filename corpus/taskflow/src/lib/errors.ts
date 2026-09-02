/**
 * Maps thrown domain errors (`PermissionDeniedError`, `TenantScopeError`, `FeatureDisabledError`, `AlreadyArchivedError`, `InvalidSlugError`, `ZodError`) onto `AppErrorShape`. Every Server Action funnels failures through here.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): PermissionDeniedError, TenantScopeError, AlreadyArchivedError, InvalidSlugError
 */
import type { ActionResult, AppErrorShape, ErrorCode } from "@/types/api";
import type { ZodError } from "zod";
export function toAppError(error: unknown): AppErrorShape {
  throw new Error("stub: src/lib/errors.ts");
}

export function toActionResult(error: unknown): ActionResult<never> {
  throw new Error("stub: src/lib/errors.ts");
}

export function isDomainError(error: unknown): boolean {
  throw new Error("stub: src/lib/errors.ts");
}

export function fieldErrorsFromZod(error: ZodError): Readonly<Record<string, readonly string[]>> {
  throw new Error("stub: src/lib/errors.ts");
}

export const HTTP_STATUS_BY_CODE: Readonly<Record<ErrorCode, number>> = undefined as unknown as Readonly<Record<ErrorCode, number>>;
