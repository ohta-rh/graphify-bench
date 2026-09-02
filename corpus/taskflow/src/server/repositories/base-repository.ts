/**
 * Shared query helpers: cursor encoding, `orgId` predicate construction and the archived-row predicate every other repository composes.
 *
 * Must call (do not reimplement): shouldFilterArchived
 */
import { eq, isNull } from "drizzle-orm";
import { shouldFilterArchived } from "@/lib/soft-delete";
import type { ArchiveScope, OrgId } from "@/types/common";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

const CURSOR_SEPARATOR = "|";

/**
 * Cursors are opaque to callers: base64url of `<sortValue>|<id>`. Encoding the
 * sort value alongside the id is what lets `listX` resume from a stable point
 * even when two rows share a timestamp.
 */
export function encodeCursor(id: string, sortValue: string): string {
  return Buffer.from(`${sortValue}${CURSOR_SEPARATOR}${id}`, "utf8").toString(
    "base64url",
  );
}

export function decodeCursor(
  cursor: string,
): { id: string; sortValue: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const separatorAt = decoded.lastIndexOf(CURSOR_SEPARATOR);
  if (separatorAt <= 0 || separatorAt === decoded.length - 1) return null;

  return {
    sortValue: decoded.slice(0, separatorAt),
    id: decoded.slice(separatorAt + 1),
  };
}

/**
 * The tenant predicate. Every repository read and write composes this — a
 * query that does not mention `org_id` is a cross-tenant leak waiting to
 * happen, so this is the only sanctioned way to express it.
 */
export function orgPredicate(column: SQLiteColumn, orgId: OrgId): SQL {
  return eq(column, orgId);
}

/**
 * The soft-delete predicate, or `undefined` when the caller explicitly asked
 * for archived rows. The `includeArchived` decision itself lives in
 * `shouldFilterArchived()` so it cannot drift per repository.
 */
export function livePredicate(
  column: SQLiteColumn,
  scope: ArchiveScope,
): SQL | undefined {
  return shouldFilterArchived(scope) ? isNull(column) : undefined;
}
