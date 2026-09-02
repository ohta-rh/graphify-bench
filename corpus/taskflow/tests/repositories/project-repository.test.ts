/**
 * Slug uniqueness and archive/restore round-trip.
 *
 * Owner C implements `@/server/repositories/project-repository`.
 */
import { describe, it } from "vitest";

describe("repositories/project-repository", () => {
  // The same slug may exist once per organization, not once globally.
  it.todo("allows the same slug in two different organizations");

  // A duplicate slug inside one org is a conflict.
  it.todo("refuses a duplicate slug inside one organization");

  // findBySlug is org-scoped: org A's lookup never finds org B's project.
  it.todo("scopes findBySlug to the organization");

  // archivePatch() sets archived_at; the row is still present in the table.
  it.todo("archives by stamping archived_at, keeping the row");

  // restorePatch() clears archived_at and the project lists again.
  it.todo("restores an archived project");

  // Live listings exclude archived projects by default.
  it.todo("excludes archived projects from the default listing");
});
