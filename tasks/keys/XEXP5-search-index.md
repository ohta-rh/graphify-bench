# Rubric — how something written becomes something findable

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **Indexing is event-driven, not called by the writers.** No service tells
   the search layer anything directly. `registerSearchListeners()` in
   `src/server/services/search-service.ts`, wired once from
   `registerEventHandlers()` in `event-registry.ts`, subscribes to eight
   events: `issue.created`, `issue.updated`, `issue.archived`,
   `comment.created`, `comment.deleted`, `project.created`, `project.archived`
   and `search.reindex_requested`. Award the point for the index being
   maintained by subscribers on the in-process bus.

2. **Handlers re-read the row instead of trusting the payload.** Each
   indexing handler fetches the current row first — `issueRepository.findIssueById`,
   `commentRepository.findCommentById`, `projectRepository.findProjectById` —
   and indexes nothing when the lookup returns null, so a partially-applied or
   already-reverted write can never be indexed as if it had succeeded. The
   file's own comment states this. Award the point for the re-read and its
   reason.

3. **What is stored, and the delete side.** `indexIssue`, `indexComment` and
   `indexProject` all funnel into
   `searchRepository.upsertSearchDocument(orgId, kind, id, content, projectId)`
   with a denormalised `content` blob — title + description for an issue, the
   body for a comment, name + description for a project — keyed by
   `(subjectKind, subjectId)` so a re-index overwrites in place. The archive/
   delete events call `removeFromIndex` → `deleteSearchDocument`. Award the
   point for the upsert-in-place plus removal on archive/delete.

4. **The query path's two gates.** `search(actor, input)` runs
   `assertOrgScope` + `assertCan(actor, "issue:read", …)`, then charges the
   `search:query` token bucket through `consumeRateLimit` and throws when the
   verdict is not allowed, then reads the org and evaluates
   `isEnabled("advanced_search", …)`: a query containing a colon
   (field-scoped syntax such as `status:done`) is **rejected** for plans that
   do not include the feature rather than silently treated as literal text.
   Only then does `searchRepository.searchDocuments(input)` run. Award the
   point for the per-org rate limit and the plan-gated field-scoped syntax.

5. **Turning rows into hits, and tenancy.** Each row becomes a `SearchHit`
   whose `title` is the first line of the stored content, whose `snippet` comes
   from `snippetAround(content, q)` — the match with `SNIPPET_RADIUS` (60)
   characters either side and ellipses when truncated, falling back to the
   leading 120 characters when the query is not literally present — and whose
   `href` comes from `hrefFor(kind, id)`. The `orgId` travels into the
   repository query, so the index is tenant-scoped like every other table.
   Award the point for the snippet/href projection, or for the org scoping of
   results.
