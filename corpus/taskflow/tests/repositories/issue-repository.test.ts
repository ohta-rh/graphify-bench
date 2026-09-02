/**
 * Every query filters by `orgId` and by `archived_at`.
 *
 * Owner C implements `@/server/repositories/issue-repository`. Seed with
 * `seedTwoTenants()` from `tests/helpers/db.ts` so the negative case is a real
 * row in the other tenant.
 */
import { describe, it } from "vitest";

describe("repositories/issue-repository", () => {
  // A row seeded into org B never appears in a list scoped to org A.
  it.todo("excludes another tenant's issues from every list query");

  // findIssueById with the wrong orgId returns null rather than the row.
  it.todo("returns null for an id that belongs to another tenant");

  // shouldFilterArchived() default adds the archived_at IS NULL predicate.
  it.todo("hides archived issues unless includeArchived is set");

  // includeArchived: true returns both live and archived rows.
  it.todo("returns archived issues when the scope asks for them");

  // Filters compose: status, priority, assignee and label all narrow together.
  it.todo("applies status, priority, assignee and label filters together");

  // sliceToPage over-fetches by one and reports the next cursor.
  it.todo("pages with a cursor and reports the total");

  // Repositories never call can() — authorization belongs to the service layer.
  it.todo("performs no authorization of its own");
});
