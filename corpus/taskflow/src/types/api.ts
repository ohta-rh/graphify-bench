/**
 * The result envelope every Server Action and Route Handler returns. Actions
 * never throw for expected failures — they return `ActionResult` so the client
 * form layer can render field errors without an error boundary.
 */

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "rate_limited"
  | "plan_limit_exceeded"
  | "tenant_scope_violation"
  | "internal_error";

export interface AppErrorShape {
  readonly code: ErrorCode;
  readonly message: string;
  /** Zod-style field path → messages, for react-hook-form to consume. */
  readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
  readonly meta?: Readonly<Record<string, string | number | boolean>>;
}

export type Result<T, E = AppErrorShape> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: E };

/** What a Server Action returns to a `useActionState` reducer. */
export type ActionResult<T> = Result<T> & {
  /** Monotonic token so the client can distinguish two identical results. */
  readonly submittedAt?: string;
};

export interface ApiErrorBody {
  readonly error: AppErrorShape;
}

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err<T = never>(error: AppErrorShape): Result<T> {
  return { ok: false, error };
}

export function isOk<T, E>(
  result: Result<T, E>,
): result is { ok: true; data: T } {
  return result.ok;
}
