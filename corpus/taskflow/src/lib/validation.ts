/**
 * Thin wrappers turning a Zod parse into an `AppErrorShape` without throwing.
 *
 * Server Actions parse `FormData` with `safeParse()` so a validation failure
 * comes back as a `Result` the form layer can render; pages parse
 * `searchParams` with `parseSearchParams()`, which never fails because a
 * hand-edited URL must not produce an error boundary.
 */
import type { Result } from "@/types/api";
import { err, ok } from "@/types/api";
import type { ZodType } from "zod";
import { fieldErrorsFromZod } from "./errors";

/** Parses without throwing; failures carry Zod's field errors verbatim. */
export function safeParse<TSchema extends ZodType>(
  schema: TSchema,
  raw: unknown,
): Result<unknown> {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return ok<unknown>(parsed.data);

  return err<unknown>({
    code: "validation_failed",
    message: "Please correct the highlighted fields.",
    fieldErrors: fieldErrorsFromZod(parsed.error),
  });
}

/**
 * Normalises a Next `searchParams` record (values may be repeated, and are
 * always strings) and parses it. Because the pagination and sort schemas use
 * `.catch()` defaults, a malformed query string degrades to the defaults
 * rather than failing the render; a schema without catches will still throw,
 * which is the correct signal that the route needs one.
 */
export function parseSearchParams<TSchema extends ZodType>(
  schema: TSchema,
  raw: Readonly<Record<string, string | string[] | undefined>>,
): unknown {
  const normalized: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    normalized[key] = value;
  }

  return schema.parse(normalized);
}
