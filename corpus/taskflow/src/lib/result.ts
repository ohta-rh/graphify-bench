/**
 * Ergonomics around the `Result` envelope: mapping, unwrapping and async
 * lifting. Services return `Result`, actions return `ActionResult`; these
 * helpers let a call site transform one without unwrapping and re-wrapping.
 */
import type { Result } from "@/types/api";
import { err, ok } from "@/types/api";
import { toAppError } from "./errors";

export function mapResult<T, U>(
  result: Result<T>,
  map: (value: T) => U,
): Result<U> {
  return result.ok ? ok(map(result.data)) : err<U>(result.error);
}

export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

/** Lifts a throwing promise into a `Result`, mapping the rejection via `toAppError`. */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    return ok(await promise);
  } catch (error) {
    return err<T>(toAppError(error));
  }
}

/** All-or-nothing: the first failure short-circuits and is returned as-is. */
export function collectResults<T>(
  results: readonly Result<T>[],
): Result<readonly T[]> {
  const values: T[] = [];
  for (const result of results) {
    if (!result.ok) return err<readonly T[]>(result.error);
    values.push(result.data);
  }
  return ok<readonly T[]>(values);
}
