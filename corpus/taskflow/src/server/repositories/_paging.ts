/**
 * Private paging helpers shared by the repositories in this directory.
 *
 * Not part of the public data-access surface — repositories re-export nothing
 * from here. Keyset (cursor) pagination is expressed as a row-value comparison
 * so a page boundary is stable even when two rows share a `created_at`.
 */
import { sql } from "drizzle-orm";
import { decodeCursor, encodeCursor } from "./base-repository";
import { makePage } from "@/types/common";
import type { Page } from "@/types/common";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

export interface KeysetSort {
  readonly sortColumn: SQLiteColumn;
  readonly idColumn: SQLiteColumn;
}

/**
 * Predicate that resumes a descending listing after `cursor`. Returns
 * `undefined` for a first page or an unparseable cursor — a bad cursor
 * degrades to "start from the top", never to an error page.
 */
export function keysetPredicate(
  sort: KeysetSort,
  cursor: string | null | undefined,
): SQL | undefined {
  if (!cursor) return undefined;
  const decoded = decodeCursor(cursor);
  if (!decoded) return undefined;

  return sql`(${sort.sortColumn}, ${sort.idColumn}) < (${decoded.sortValue}, ${decoded.id})`;
}

/** SQLite tolerates a `LIMIT` of `n + 1`; that extra row is the has-more probe. */
export function probeLimit(limit: number): number {
  return Math.max(1, Math.min(limit, 100)) + 1;
}

/**
 * Turns an over-fetched row array into a `Page`, dropping the probe row and
 * deriving the next cursor from the last row that survived.
 */
export function toPage<TRow, TOut>(
  rows: readonly TRow[],
  limit: number,
  total: number,
  map: (row: TRow) => TOut,
  cursorOf: (row: TRow) => { id: string; sortValue: string },
): Page<TOut> {
  const capped = Math.max(1, Math.min(limit, 100));
  const hasMore = rows.length > capped;
  const visible = hasMore ? rows.slice(0, capped) : rows;
  const last = visible.at(-1);

  const nextCursor =
    hasMore && last
      ? encodeCursor(cursorOf(last).id, cursorOf(last).sortValue)
      : null;

  return makePage(visible.map(map), nextCursor, total);
}

/** Drops the `undefined` slots so `and(...)` never sees a hole. */
export function compact(
  ...predicates: readonly (SQL | undefined)[]
): readonly SQL[] {
  return predicates.filter((value): value is SQL => value !== undefined);
}
