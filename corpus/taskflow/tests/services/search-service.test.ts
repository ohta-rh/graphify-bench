/**
 * Index maintenance on issue and comment writes.
 *
 * Owner C implements `@/server/services/search-service`.
 */
import { describe, it } from "vitest";

describe("services/search-service", () => {
  // issue.created and comment.created both trigger an index write.
  it.todo("indexes an issue and a comment on creation");

  // issue.updated re-indexes rather than appending a duplicate entry.
  it.todo("re-indexes an updated issue in place");

  // Archiving removes the row from the searchable set.
  it.todo("drops an archived issue from the index");

  // Every query is filtered by orgId — org B's rows never surface for org A.
  it.todo("never returns another tenant's rows");

  // isEnabled("advanced_search", …) gates the field-scoped query syntax.
  it.todo("falls back to plain matching when advanced_search is off");

  // consumeRateLimit(orgId, "search:query") throttles query bursts.
  it.todo("rate-limits search queries per organization");
});
