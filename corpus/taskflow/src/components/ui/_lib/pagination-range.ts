/**
 * Page-number windowing for `<Pagination />`.
 *
 * Private to `src/components/ui/**`. Pure so the arithmetic can be tested
 * without rendering (see `tests/ui/pagination-range.test.ts`).
 */

/** `"gap"` marks an elided run of pages, rendered as an ellipsis. */
export type PageToken = number | "gap";

export const DEFAULT_SIBLINGS = 1;

/** Total number of pages for `total` rows at `perPage` rows per page. */
export function pageCount(total: number, perPage: number): number {
  if (perPage <= 0) return 0;
  return Math.max(1, Math.ceil(Math.max(0, total) / perPage));
}

/** 1-based index of the first row shown on `page`, or 0 when there are none. */
export function rangeStart(page: number, perPage: number, total: number): number {
  if (total <= 0 || perPage <= 0) return 0;
  return (Math.max(1, page) - 1) * perPage + 1;
}

/** 1-based index of the last row shown on `page`. */
export function rangeEnd(page: number, perPage: number, total: number): number {
  if (total <= 0 || perPage <= 0) return 0;
  return Math.min(total, Math.max(1, page) * perPage);
}

/**
 * Build the visible page tokens: always the first and last page, plus
 * `siblings` pages either side of the current one, with `"gap"` standing in for
 * everything elided. Short ranges are returned in full — a gap that hides a
 * single page would be wider than the page button it replaces.
 */
export function buildPageRange(
  current: number,
  total: number,
  siblings: number = DEFAULT_SIBLINGS,
): PageToken[] {
  if (total <= 0) return [];
  const page = Math.min(Math.max(1, current), total);
  const window = siblings * 2 + 5;
  if (total <= window) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(page - siblings, 1);
  const right = Math.min(page + siblings, total);
  const showLeftGap = left > 3;
  const showRightGap = right < total - 2;

  const tokens: PageToken[] = [1];
  if (showLeftGap) {
    tokens.push("gap");
  } else {
    for (let p = 2; p < left; p += 1) tokens.push(p);
  }
  for (let p = left; p <= right; p += 1) {
    if (p !== 1 && p !== total) tokens.push(p);
  }
  if (showRightGap) {
    tokens.push("gap");
  } else {
    for (let p = right + 1; p < total; p += 1) tokens.push(p);
  }
  tokens.push(total);
  return tokens;
}
