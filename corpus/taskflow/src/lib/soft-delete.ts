import type { ArchiveScope, IsoTimestamp, SoftDeletable } from "@/types/common";
import { toIsoTimestamp } from "@/types/common";

/**
 * Soft-delete conventions.
 *
 * Issues, projects and comments are never physically removed — they get an
 * `archived_at` timestamp. Repositories must express "live rows only" through
 * these helpers so the predicate stays in one place; a raw
 * `isNull(table.archivedAt)` sprinkled through the data layer is exactly the
 * drift this module prevents.
 */

export function isArchived(row: SoftDeletable): boolean {
  return row.archivedAt !== null;
}

export function isLive(row: SoftDeletable): boolean {
  return row.archivedAt === null;
}

/** Filters an in-memory collection according to an `ArchiveScope`. */
export function applyArchiveScope<T extends SoftDeletable>(
  rows: readonly T[],
  scope: ArchiveScope = {},
): readonly T[] {
  return scope.includeArchived === true ? rows : rows.filter(isLive);
}

/** True when the repository should add the `archived_at IS NULL` predicate. */
export function shouldFilterArchived(scope: ArchiveScope = {}): boolean {
  return scope.includeArchived !== true;
}

/** The column patch that archives a row. */
export function archivePatch(now: Date = new Date()): {
  archivedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
} {
  const stamp = toIsoTimestamp(now);
  return { archivedAt: stamp, updatedAt: stamp };
}

/** The column patch that restores an archived row. */
export function restorePatch(now: Date = new Date()): {
  archivedAt: null;
  updatedAt: IsoTimestamp;
} {
  return { archivedAt: null, updatedAt: toIsoTimestamp(now) };
}

export class AlreadyArchivedError extends Error {
  readonly code = "conflict" as const;

  constructor(readonly entity: string, readonly id: string) {
    super(`${entity} ${id} is already archived.`);
    this.name = "AlreadyArchivedError";
  }
}

/** Guard for archive actions, so double-archiving is a domain-level conflict. */
export function assertNotArchived(
  entity: string,
  id: string,
  row: SoftDeletable,
): void {
  if (isArchived(row)) {
    throw new AlreadyArchivedError(entity, id);
  }
}
