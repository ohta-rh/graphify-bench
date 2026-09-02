/**
 * Ergonomics around the `Result` envelope: mapping, unwrapping and async lifting.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Result } from "@/types/api";
export function mapResult<T, U>(result: Result<T>, map: (value: T) => U): Result<U> {
  throw new Error("stub: src/lib/result.ts");
}

export function unwrapOr<T>(result: Result<T>, fallback: T): T {
  throw new Error("stub: src/lib/result.ts");
}

export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T>> {
  throw new Error("stub: src/lib/result.ts");
}

export function collectResults<T>(results: readonly Result<T>[]): Result<readonly T[]> {
  throw new Error("stub: src/lib/result.ts");
}
