---
title: Keyset pagination over offset pagination
id: ADR-008
status: accepted
owners: [m.lindqvist, platform-team]
last_updated: 2026-01-08
related: [REQ-052, REQ-078, REQ-179, ADR-002, ADR-015]
---

# ADR-008 — Keyset pagination over offset pagination

## Status

Accepted. Applied uniformly to every `list*` repository function that returns
more than one page of results — issues, projects, comments, activity, and
search results all paginate the same way, by the same mechanism.

## Context

The first cut of issue listing, built in December 2025, used ordinary
`LIMIT`/`OFFSET` pagination, and it broke in a way the team should have
anticipated: a support engineer working an issue queue watched two issues
disappear from page 2 of a filtered list mid-session, because someone else on
their team archived three issues on page 1 while they were reading — every
row after the archived ones shifted up by three positions, and `OFFSET 25`
now pointed at different rows than it had a moment earlier. Mira Lindqvist,
who owns issues and projects, filed this as a correctness bug, not a
cosmetic one: REQ-077's filtered issue listings (by status, assignee, label)
are exactly the kind of view a triage workflow keeps open and scrolls through
over several minutes, which is the scenario where offset drift is most
visible and most disruptive.

Two other constraints pushed toward keyset pagination specifically, beyond
just fixing the drift bug:

- **`OFFSET` gets linearly slower with page depth** in SQLite, since the
  engine still has to scan and discard every skipped row; an organization on
  the enterprise plan with ten thousand issues per project (the
  `issuesPerProject` quota, `PLAN_LIMITS.enterprise`) browsing toward the end
  of an unfiltered list would pay for that scan on every page.
  `better-sqlite3` (ADR-002) is synchronous and in-process, which makes a
  slow query directly block the request thread, not merely add network
  latency.
- **The team wanted one pagination shape everywhere**, not "offset for lists
  a user browses casually, cursor for ones that need to be exact." A single
  convention is easier to teach and easier to review; REQ-052, REQ-078, and
  REQ-179 (project, issue, and search listings respectively) all specify
  keyset/cursor pagination explicitly for exactly this reason.

## Decision

Every paginated repository function takes a `PageRequest` (`limit`, optional
`cursor`) and returns a `Page<T>` (see `src/types/common.ts`,
`makePage`), never a bare array plus a separate count-and-offset. Repositories
query `limit + 1` rows ordered by a stable sort key plus a tie-breaking id —
`issue-repository.ts`'s `keysetPredicate(sort, cursor)` builds the
`WHERE (sort_col, id) > (?, ?)` (or `<` for descending) comparison Drizzle's
query builder expresses directly (the query-shape reason ADR-002 gives for
choosing Drizzle over Prisma) — and `sliceToPage()` in `src/lib/pagination.ts`
trims that over-fetched result: if the extra row came back, there is a next
page, and its cursor is derived from the last *kept* row via a caller-supplied
`cursorOf()` function, not from a numeric offset.

`src/lib/pagination.ts` is intentionally split from the repository layer: it
is the translation between what a repository returns (a cursor `Page`) and
what pagination UI components need (`pageCount(total, perPage)`, always at
least 1 so the UI can render "1 of 1" even for an empty list). `clampPageSize()`
enforces `DEFAULT_PAGE_SIZE` and `MAX_PAGE_SIZE` from `src/config/constants.ts`
against any caller-supplied page size, so a crafted request cannot ask for an
unbounded page. `emptyPage()` gives callers a canonical empty `Page<T>` rather
than each call site constructing `{ items: [], cursor: null, total: 0 }` by
hand.

Cursors are opaque strings from the caller's point of view — the UI passes
one back verbatim on "load more," never decodes or constructs one — which
matters because a cursor's actual shape (a composite of the sort field's
value and the row's branded id, per ADR-015) is an implementation detail of
the specific list being paginated, and different lists sort by different
fields.

## Consequences

**What this buys the team.** The support-engineer bug that started this
decision cannot recur: because the predicate is "give me rows after this
specific row," archiving or creating rows elsewhere in the list never
shifts what the next page returns — a row a viewer has already seen stays
seen, and a row does not skip past unnoticed. Query cost stays roughly
constant per page regardless of how deep into the list a viewer scrolls,
because the `WHERE` predicate uses the same index the `ORDER BY` already
needs, rather than requiring SQLite to walk and discard every earlier row.
One `Page<T>` shape and one `sliceToPage()` helper mean every list feature —
issues (REQ-078), projects (REQ-052), search results (REQ-179), and the
activity feed (REQ-229, paginated by occurrence time) — shares the exact
same pagination code path, so a fix or an optimization made once in
`src/lib/pagination.ts` benefits all of them simultaneously.

**What it costs.** Keyset pagination cannot jump to an arbitrary page number
— "go to page 7" is not an operation this model supports cheaply, only
"next" and (with a second cursor direction) "previous." Taskflow's UI never
offered numbered page jumps for this reason; `pageCount()` exists only to
answer "how many pages are there," for display, not to support jumping into
the middle of the list. Every sortable column also needs a stable,
indexed tie-breaker to keep the cursor well-defined — sorting by a field with
duplicate values (say, priority) requires the id as a secondary sort key, and
every new sortable field added to issue or project listings has to be
reviewed for whether its `keysetPredicate` composition actually produces a
total order; getting this wrong produces a subtle bug (a row appearing twice
across two pages, or never) rather than an obvious one, which is why
`tests/lib/pagination.test.ts` and the issue-repository test suite carry
explicit duplicate-value fixtures. The opaque-cursor discipline also means a
cursor from one list's endpoint cannot be reused against a differently
sorted version of the same list — a filter or sort change resets pagination
to the first page, which is standard behavior for keyset pagination generally
but is a small UX constraint the team accepted rather than tried to hide.

## Alternatives considered

**Keep offset pagination and accept the drift.** Rejected outright once the
support-engineer bug was filed and reproduced; "known to silently skip or
duplicate rows during ordinary concurrent use" was judged unacceptable for a
product whose core workflow is triaging exactly the kind of list this bug
affects.

**Offset pagination with a snapshot/versioned view** (freeze the row order at
the moment of the first page load, using a version or timestamp filter to
serve subsequent pages from that snapshot). Rejected as meaningfully more
complex to implement correctly against SQLite without a dedicated
snapshotting feature, and it does not solve the deep-page performance problem
that motivated part of this decision, only the correctness problem.

**A hybrid — offset pagination for small, rarely-changing lists (organization
member lists, webhook endpoints) and keyset for everything else.** Rejected
in favor of one convention everywhere; the team judged that maintaining two
pagination mental models, and two sets of pagination UI components, was a
worse long-term cost than applying the slightly heavier keyset machinery to a
handful of lists that did not strictly need it.

## References

- REQ-052 (project listings paginated by keyset cursor), REQ-078 (issue
  listings paginated by keyset cursor), REQ-179 (search results paginated by
  cursor), REQ-229 (activity paginated by occurrence time)
- ADR-002 (Drizzle's query builder is what makes the keyset predicate
  expressible directly, the reason this ADR's implementation is
  straightforward), ADR-015 (branded ids composed into cursor values)
- Code: `src/lib/pagination.ts` (`pageCount`, `clampPageSize`, `emptyPage`,
  `sliceToPage`), `src/types/common.ts` (`Page`, `makePage`, `PageRequest`),
  `src/server/repositories/issue-repository.ts` (`keysetPredicate`),
  `src/config/constants.ts` (`DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`),
  `src/hooks/use-pagination.ts`, `src/components/ui/pagination.tsx`
