/**
 * Keyboard navigation math shared by the listbox-shaped primitives
 * (`combobox`, `dropdown-menu`, `command-palette`, `date-picker`).
 *
 * Pure functions on purpose: the interaction rules are the part worth
 * unit-testing, and keeping them out of the components means the tests do not
 * need a DOM. Private to `src/components/ui/**`.
 */

/** Keys the roving-focus reducer understands. */
export type NavKey =
  | "ArrowDown"
  | "ArrowUp"
  | "Home"
  | "End"
  | "PageDown"
  | "PageUp";

const PAGE_STEP = 5;

/**
 * Move the active index inside a list of `length` items.
 *
 * Wraps around at both ends so ArrowUp from the first item lands on the last —
 * the behaviour every command palette in this app relies on. Returns `-1` for
 * an empty list so callers can render their empty state without a special case.
 */
export function moveActiveIndex(
  current: number,
  key: NavKey,
  length: number,
): number {
  if (length <= 0) return -1;
  const clamped = current < 0 || current >= length ? -1 : current;

  switch (key) {
    case "ArrowDown":
      return clamped === -1 ? 0 : (clamped + 1) % length;
    case "ArrowUp":
      return clamped === -1 ? length - 1 : (clamped - 1 + length) % length;
    case "Home":
      return 0;
    case "End":
      return length - 1;
    case "PageDown":
      return Math.min(length - 1, (clamped === -1 ? 0 : clamped) + PAGE_STEP);
    case "PageUp":
      return Math.max(0, (clamped === -1 ? 0 : clamped) - PAGE_STEP);
  }
}

/** Type guard so `onKeyDown` handlers can narrow `event.key` without a cast. */
export function isNavKey(key: string): key is NavKey {
  return (
    key === "ArrowDown" ||
    key === "ArrowUp" ||
    key === "Home" ||
    key === "End" ||
    key === "PageDown" ||
    key === "PageUp"
  );
}

/**
 * Case- and diacritic-insensitive substring match used by every filterable
 * primitive. Matching on the concatenation of label + description means typing
 * a word from the hint text still finds the row.
 */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return haystack.toLowerCase().includes(q);
}

/** Filter a list by a text query, projecting each item to its searchable text. */
export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  toText: (item: T) => string,
): T[] {
  const q = query.trim();
  if (q.length === 0) return [...items];
  return items.filter((item) => matchesQuery(toText(item), q));
}
