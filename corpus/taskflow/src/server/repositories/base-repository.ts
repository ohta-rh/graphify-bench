/**
 * Shared query helpers: cursor encoding, `orgId` predicate construction and the archived-row predicate every other repository composes.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): shouldFilterArchived
 */
import type { ArchiveScope, OrgId } from "@/types/common";
import type { SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
export function encodeCursor(id: string, sortValue: string): string {
  throw new Error("stub: src/server/repositories/base-repository.ts");
}

export function decodeCursor(cursor: string): { id: string; sortValue: string } | null {
  throw new Error("stub: src/server/repositories/base-repository.ts");
}

export function orgPredicate(column: SQLiteColumn, orgId: OrgId): SQL {
  throw new Error("stub: src/server/repositories/base-repository.ts");
}

export function livePredicate(column: SQLiteColumn, scope: ArchiveScope): SQL | undefined {
  throw new Error("stub: src/server/repositories/base-repository.ts");
}
