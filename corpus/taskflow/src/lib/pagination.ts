/**
 * Turns a repository `Page` into what the pagination UI needs.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Page } from "@/types/common";
export function pageCount(total: number, perPage: number): number {
  throw new Error("stub: src/lib/pagination.ts");
}

export function emptyPage<T>(): Page<T> {
  throw new Error("stub: src/lib/pagination.ts");
}

export function sliceToPage<T>(items: readonly T[], limit: number, total: number, cursorOf: (item: T) => string): Page<T> {
  throw new Error("stub: src/lib/pagination.ts");
}
