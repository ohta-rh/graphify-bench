/**
 * Thin wrappers turning a Zod parse into an `AppErrorShape` without throwing.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): fieldErrorsFromZod
 */
import type { Result } from "@/types/api";
import type { ZodType } from "zod";
export function safeParse<TSchema extends ZodType>(schema: TSchema, raw: unknown): Result<unknown> {
  throw new Error("stub: src/lib/validation.ts");
}

export function parseSearchParams<TSchema extends ZodType>(schema: TSchema, raw: Readonly<Record<string, string | string[] | undefined>>): unknown {
  throw new Error("stub: src/lib/validation.ts");
}
