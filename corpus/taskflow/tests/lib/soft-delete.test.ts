/** Archive/restore patches and `applyArchiveScope`. */
import { describe, expect, it } from "vitest";
import {
  AlreadyArchivedError,
  applyArchiveScope,
  archivePatch,
  assertNotArchived,
  isArchived,
  isLive,
  restorePatch,
  shouldFilterArchived,
} from "@/lib/soft-delete";
import type { IsoTimestamp } from "@/types/common";
import { makeIssue } from "../helpers/factories";

const NOW = new Date("2026-03-15T12:00:00.000Z");
const ARCHIVED_AT = "2026-03-01T09:00:00.000Z" as IsoTimestamp;

describe("lib/soft-delete", () => {
  it("reads the live/archived state from `archivedAt`", () => {
    const live = makeIssue();
    const archived = makeIssue({ archivedAt: ARCHIVED_AT });

    expect(isLive(live)).toBe(true);
    expect(isArchived(live)).toBe(false);
    expect(isLive(archived)).toBe(false);
    expect(isArchived(archived)).toBe(true);
  });

  it("filters archived rows out by default", () => {
    const rows = [makeIssue(), makeIssue({ archivedAt: ARCHIVED_AT }), makeIssue()];
    expect(applyArchiveScope(rows)).toHaveLength(2);
    expect(applyArchiveScope(rows, {})).toHaveLength(2);
    expect(applyArchiveScope(rows, { includeArchived: false })).toHaveLength(2);
  });

  it("keeps archived rows when the scope asks for them", () => {
    const rows = [makeIssue(), makeIssue({ archivedAt: ARCHIVED_AT })];
    expect(applyArchiveScope(rows, { includeArchived: true })).toHaveLength(2);
  });

  it("tells a repository when to add the archived_at predicate", () => {
    expect(shouldFilterArchived()).toBe(true);
    expect(shouldFilterArchived({})).toBe(true);
    expect(shouldFilterArchived({ includeArchived: false })).toBe(true);
    expect(shouldFilterArchived({ includeArchived: true })).toBe(false);
  });

  it("stamps archivedAt and updatedAt with the same instant", () => {
    const patch = archivePatch(NOW);
    expect(patch.archivedAt).toBe(NOW.toISOString());
    expect(patch.updatedAt).toBe(patch.archivedAt);
  });

  it("clears archivedAt on restore while still touching updatedAt", () => {
    const patch = restorePatch(NOW);
    expect(patch.archivedAt).toBeNull();
    expect(patch.updatedAt).toBe(NOW.toISOString());
  });

  it("round-trips a row through archive and restore", () => {
    const issue = makeIssue();
    const archived = { ...issue, ...archivePatch(NOW) };
    expect(isArchived(archived)).toBe(true);

    const restored = { ...archived, ...restorePatch(NOW) };
    expect(isLive(restored)).toBe(true);
  });

  it("treats double archiving as a conflict", () => {
    expect(() => assertNotArchived("Issue", "01ISS", makeIssue())).not.toThrow();
    expect(() =>
      assertNotArchived("Issue", "01ISS", makeIssue({ archivedAt: ARCHIVED_AT })),
    ).toThrow(AlreadyArchivedError);

    try {
      assertNotArchived("Issue", "01ISS", makeIssue({ archivedAt: ARCHIVED_AT }));
    } catch (error) {
      expect((error as AlreadyArchivedError).code).toBe("conflict");
      expect((error as AlreadyArchivedError).entity).toBe("Issue");
    }
  });
});
