/**
 * Turns a repository `Page` into what the pagination UI needs. Repositories
 * return cursor pages; the UI wants page counts and a "there is more" cursor,
 * and this module is the translation between the two.
 */
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/config/constants";
import type { Page } from "@/types/common";
import { makePage } from "@/types/common";

/** Number of pages a total spans; always at least 1 so the UI can render "1 of 1". */
export function pageCount(total: number, perPage: number): number {
  const size = clampPageSize(perPage);
  if (total <= 0) return 1;
  return Math.ceil(total / size);
}

/** Clamps a caller-supplied page size into the range the schemas allow. */
export function clampPageSize(perPage: number): number {
  if (!Number.isFinite(perPage) || perPage <= 0) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(perPage), MAX_PAGE_SIZE);
}

export function emptyPage<T>(): Page<T> {
  return makePage<T>([], null, 0);
}

/**
 * Trims an over-fetched row set to one page. Repositories query `limit + 1`
 * rows; if the extra row came back there is a next page, and its cursor is
 * the last kept row's cursor.
 */
export function sliceToPage<T>(
  items: readonly T[],
  limit: number,
  total: number,
  cursorOf: (item: T) => string,
): Page<T> {
  const size = clampPageSize(limit);
  const hasMore = items.length > size;
  const kept = hasMore ? items.slice(0, size) : items.slice();
  const last = kept[kept.length - 1];
  return makePage(kept, hasMore && last !== undefined ? cursorOf(last) : null, total);
}
