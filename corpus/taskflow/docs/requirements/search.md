---
title: Search requirements
id: REQ-SEARCH
status: approved
owners: [product-team, k.ferreira]
last_updated: 2026-05-28
related: [REQ-172, REQ-195, ADR-017, DES-190]
---

## Scope

This document defines the requirements for search: what is indexed, how the index stays in
sync with writes, query-time behavior including field-scoped syntax and rate limiting,
result shape, pagination, and the scheduled rebuild path. It does not define the comment
Markdown pipeline or issue lifecycle rules themselves, only how search reacts to their
events.

## Context

`search-service.ts` has two faces: a query-time `search(actor, input)` and a write-time
indexer (`indexIssue`, `indexComment`, `indexProject`, `removeFromIndex`) driven entirely by
domain events through `registerSearchListeners`. `ADR-017` is the decision to maintain the
index synchronously from the event bus rather than through a separate async pipeline or a
dedicated search engine — the index is a denormalized table
(`src/server/repositories/search-repository.ts`) inside the same SQLite database everything
else lives in, kept current the instant an issue, comment or project is created, updated or
archived, because Taskflow's scale target does not justify the operational cost of a
standalone search service.

Handlers subscribed to `issue.created`, `issue.updated`, `comment.created`, `project.created`
and their archive/delete counterparts do not trust the event payload's content fields for
what gets indexed (`REQ-173`) — they re-read the row from the corresponding repository before
calling `upsertSearchDocument`. This exists because `issue.updated`'s payload only reports
changed fields (`REQ-068`), which is sufficient for activity-feed summaries but is not
sufficient to reconstruct a complete search document; re-reading the row guarantees the
indexed content always reflects the full current state, not a partial diff.

`search.reindex_requested` is the event `search-reindex-job.ts` reacts to on the
`search-reindex` cadence (daily, every 1440 minutes) — the job calls `runSearchReindexJob(orgId)`,
which walks every issue, comment and project in the organization and reindexes them from
scratch, used after a bulk import or when an operator suspects index drift, since the
synchronous per-event maintenance, while normally reliable, has no independent verification
step of its own; a full rebuild is the recovery mechanism when it does drift.

Query results are scoped to what the actor can already see: `search()` requires
`issue:read` (`REQ-181`) as a baseline, and field-scoped query syntax (searching within a
specific field, like `label:bug`, rather than free text) is itself gated behind the
`advanced_search` flag (`enterprise` plan minimum, overridable), consistent with how
Taskflow generally ties richer product surface area to higher plans rather than restricting
the basic capability.

The command palette (`command_palette` flag, always on, not overridable) is one of two
consumers of `searchAction`, the other being the dedicated search page; both share the same
Server Action and therefore the same rate-limit bucket, permission check and pagination
contract described below, so a change to any of `REQ-176` through `REQ-181` affects both
surfaces identically without either needing its own copy of the search query logic.

## Open questions

1. `REQ-171`'s org-scoped index means a search index row's uniqueness key includes `orgId`,
   but there is no requirement here describing whether the index itself should be purged
   when an organization is soft-deleted (`REQ-007`) ahead of the retention window, or left
   to the same cleanup job that handles activity retention (`REQ-231`).
2. `REQ-177`'s snippet generation has no requirement specifying snippet length or how it
   handles a match inside a code fence versus prose — the underlying renderer distinction
   `REQ-093` makes for mentions has no analogous statement for search snippets.
3. Whether `REQ-180`'s scheduled rebuild should run automatically on a fixed cadence for
   every organization, or only on demand as described above, is ambiguous — the job accepts
   a single `orgId` argument, suggesting on-demand invocation, but there is no requirement
   stating who or what triggers it in the absence of an admin-initiated rebuild button.
4. `REQ-170`'s three subject kinds cover the content most teams search for day to day, but
   members, labels and webhook endpoints are all deliberately out of scope — a member is
   found through the roster, not search, and this document does not weigh whether that
   omission should change as the product grows a larger member base per organization.

### REQ-170 — Search covers issues, comments and projects

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-171, REQ-060, REQ-090
- **Implemented by:** `src/server/repositories/search-repository.ts` — `SearchSubjectKind`, `searchDocuments`
- **Verified by:** `tests/services/search-service.test.ts`

`SearchSubjectKind` is `'issue' | 'comment' | 'project'` (`search-repository.ts`); these are
the only three subject kinds the index holds. There is no member or organization-level
search — finding a person is a member-list lookup, not a search query, reflecting that the
product's search is scoped to "the work," not the roster.

**Acceptance criteria**

1. Every issue, comment and project a query returns identifies its `SearchSubjectKind` so
   the client can render the correct result icon and link shape.
2. No other entity type (members, notifications, webhooks) is indexed.
3. `searchDocuments`'s query interface accepts an optional subject-kind filter to narrow a
   query to just one kind.

### REQ-171 — The search index is scoped by organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-010, REQ-181
- **Implemented by:** `src/server/repositories/search-repository.ts` — `upsertSearchDocument`, `searchDocuments`, `countIndexed`
- **Verified by:** `tests/services/search-service.test.ts`

`upsertSearchDocument(orgId, ...)` and `searchDocuments(input)` both require `orgId`; the
index table's uniqueness key includes it, so two organizations' issues with identical titles
never collide in the index and a query in one org can never surface a document indexed for
another.

**Acceptance criteria**

1. `search()` always resolves `orgId` from the actor, never from client input.
2. `countIndexed(orgId)` reflects only that organization's indexed document count.
3. No query path can be constructed that returns cross-organization results, even with a
   crafted request.

### REQ-172 — The index is maintained from domain events

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-017, REQ-065, REQ-053

`registerSearchListeners` is the only place `indexIssue`/`indexComment`/`indexProject` are
called from an event-triggered path; there is no code elsewhere in the services layer that
writes to the search index directly, which keeps the indexing concern entirely decoupled
from `issue-service.ts`, `comment-service.ts` and `project-service.ts`.

**Acceptance criteria**

1. Creating an issue results in it becoming searchable without `issue-service.ts` calling
   any search-specific function itself.
2. A subscriber failure in the search listener does not roll back or block the domain
   write that triggered it, per the event bus's isolation guarantee.
3. `registerSearchListeners` is idempotent to call multiple times without producing
   duplicate subscriptions (relevant to `event-registry.ts`'s process-start registration).

**Implemented by:** `src/server/services/search-service.ts`
**Verified by:** `tests/services/search-service.test.ts`

### REQ-173 — Handlers re-read the row rather than trusting the payload

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-068, REQ-172
- **Implemented by:** `src/server/services/search-service.ts` — `indexIssue`
- **Verified by:** `tests/services/search-service.test.ts`

Because `issue.updated` only carries the changed fields, the search listener re-fetches the
full issue via the repository before indexing it, so a title change alone still produces a
search document with the current description, status and labels, not a document missing
everything the event payload happened not to mention.

**Acceptance criteria**

1. `indexIssue` is called with a freshly read `Issue`, not with fields assembled purely from
   the triggering event's payload.
2. A partial `issue.updated` payload (one changed field) still results in a fully correct
   indexed document.
3. This re-read pattern applies uniformly to comments and projects, not only issues.

### REQ-174 — Archiving removes a subject from the index

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-071, REQ-099, DES-200
- **Implemented by:** `src/server/services/search-service.ts` — `removeFromIndex`
- **Verified by:** `tests/services/search-service.test.ts`

`removeFromIndex(orgId, subjectKind, subjectId)` is called by listeners on
`issue.archived` and `comment.deleted`, and by the project-archive path, so an archived
issue or a deleted comment no longer surfaces in search results even though its row still
exists in the underlying table per the soft-delete convention (`ADR-004`).

**Acceptance criteria**

1. Archiving an issue removes its search document within the same request that performs the
   archive, since the search listener runs synchronously off the event bus.
2. Restoring a project does not automatically reindex its issues; each restored issue needs
   its own subsequent index-affecting event or a manual reindex.
3. A soft-deleted comment's body is not returned in any search snippet after deletion.

### REQ-175 — Field-scoped syntax requires advanced search

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-188, ADR-012
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/schemas/search.ts` — `searchQuerySchema`
- **Verified by:** `tests/lib/feature-flags.test.ts`

Free-text queries work on every plan; field-scoped syntax (searching a specific field rather
than the whole document) is gated by the `advanced_search` flag (`enterprise` minimum,
overridable). A `growth`-plan query containing field-scoped syntax is not rejected outright —
it is treated as plain text, so the literal characters are searched rather than being parsed
as a field filter, avoiding a confusing hard error for a query that would otherwise degrade
gracefully.

**Acceptance criteria**

1. `isEnabled('advanced_search', ...)` gates whether `searchQuerySchema` parses field-scoped
   syntax as structured query terms.
2. A plan without the flag searching for `label:bug` treats the whole string as free text,
   not as a parse error.
3. An `enterprise` org, or any org with an override, gets field-scoped parsing without
   further configuration.

### REQ-176 — Queries are rate limited per organization

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-011, REQ-096
- **Implemented by:** `src/lib/rate-limit.ts` — `consumeRateLimit`, `getBucketConfig`
- **Verified by:** `tests/lib/rate-limit.test.ts`

The `search:query` rate-limit bucket (capacity 120, refill 60/minute) protects the index
from being hammered by a scripted client or an aggressive command-palette usage pattern,
scaling with the org's `apiRequestsPerHour` plan field like every other bucket.

**Acceptance criteria**

1. `consumeRateLimit(orgId, 'search:query', 1)` runs before `searchDocuments` executes.
2. Exceeding the bucket returns `rate_limited`/429 rather than a slow or degraded query
   response.
3. The bucket is per organization, so one member's heavy search usage can throttle other
   members in the same org, which is an accepted trade-off of scoping the bucket at the org
   level rather than per user.

### REQ-177 — Results carry a snippet around the match

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-091, DES-200
- **Implemented by:** `src/server/services/search-service.ts` — `search`, `src/lib/markdown.ts` — `stripMarkdown`, `excerpt`
- **Verified by:** `tests/services/search-service.test.ts`

A `SearchHit` includes a `snippet` field, built from the indexed content around the matched
term, using the same plain-text projection (`stripMarkdown`/`excerpt`-style truncation) that
notification previews use, so a search result never shows a reader raw Markdown syntax
around the match.

**Acceptance criteria**

1. `SearchHit.snippet` contains the matched term or a close paraphrase of the surrounding
   context, not the full document body.
2. Snippet generation does not include unrendered Markdown control characters.
3. A match at the very start or end of a document produces a snippet without an out-of-range
   read.

### REQ-178 — Results link back to the subject

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-170, DES-100
- **Implemented by:** `src/lib/url.ts` — `issuePath`, `projectPath`, `src/server/services/search-service.ts` — `search`
- **Verified by:** `tests/lib/url.test.ts`

Every `SearchHit` includes an `href`, built through `src/lib/url.ts`'s path helpers
(`issuePath`, `projectPath`) so a click on a search result navigates directly to the issue,
comment's parent issue, or project it represents — search never returns a dead-end result
with no route to the underlying content.

**Acceptance criteria**

1. `SearchHit.href` for a comment result resolves to the parent issue's page, since comments
   have no standalone page of their own.
2. `SearchHit.href` is always a relative, in-app path built through `src/lib/url.ts`, never
   a hand-assembled string.
3. Following an `href` for an archived subject's result (before its removal from the index
   has propagated) does not crash the destination page.

### REQ-179 — Search results are paginated by cursor

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-052, REQ-078, ADR-008
- **Implemented by:** `src/server/services/search-service.ts` — `search`, `src/server/repositories/base-repository.ts` — `encodeCursor`, `decodeCursor`
- **Verified by:** `tests/services/search-service.test.ts`

Search results are a `Page<SearchHit>`, using the same keyset-cursor pattern as project and
issue listings, for the same reason: search result sets can be large, and cursor-based
paging keeps subsequent pages stable even as the index continues to be updated by concurrent
writes.

**Acceptance criteria**

1. `search()`'s returned page includes a cursor usable to fetch the next page of results for
   the same query.
2. Repeating the same query with the same cursor after new content has been indexed still
   returns a coherent, non-duplicated next page.
3. `MAX_PAGE_SIZE` bounds the requested page size for search the same as for any other
   paginated listing.

### REQ-180 — A scheduled job can rebuild the index

- **Priority:** could
- **Status:** implemented
- **Related:** ADR-017, REQ-172
- **Implemented by:** `src/server/jobs/search-reindex-job.ts` — `runSearchReindexJob`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`runSearchReindexJob(orgId)` performs a full rebuild for one organization by calling
`indexIssue`/`indexComment`/`indexProject` for every current row, used to correct drift
after a bulk import or a suspected inconsistency, rather than relying solely on the
synchronous per-event maintenance path to have caught everything correctly over time.

**Acceptance criteria**

1. Running the reindex job for an organization produces the same index state as if every
   document had been freshly created and indexed through the normal event path.
2. The job does not duplicate existing index entries; `upsertSearchDocument` is an upsert,
   not an insert, keyed on `(orgId, subjectKind, subjectId)`.
3. The job's `JobResult` reports the number of documents processed for observability.

### REQ-181 — Search requires read permission on issues

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-022, REQ-024
- **Implemented by:** `src/actions/search/search.ts` — `searchAction`, `src/lib/permissions.ts` — `can`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`searchAction` checks `can(actor, 'issue:read')` before calling `search()`, using the
lowest-common-denominator permission across the three indexed subject kinds — issues,
comments and projects are all at least as visible as issues are, so gating on `issue:read`
(available to every role including `viewer`) is sufficient without a separate check per
subject kind.

**Acceptance criteria**

1. A `viewer`, who has `issue:read`, can search successfully.
2. A user resolved to an `Actor` without any role in the organization (should not occur
   given how actors are resolved, but defensively checked) cannot search.
3. `searchAction`'s permission check happens before the rate-limit consumption, so a denied
   caller does not consume quota from the `search:query` bucket.
