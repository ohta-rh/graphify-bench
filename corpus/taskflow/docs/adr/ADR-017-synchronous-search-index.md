---
title: Maintain the search index synchronously from events
id: ADR-017
status: accepted
owners: [k.ferreira]
last_updated: 2026-03-12
related: [REQ-170, REQ-172, REQ-173, REQ-174, ADR-005, ADR-004]
---

# ADR-017 — Maintain the search index synchronously from events

## Status

Accepted, and running in production since March 2026 with no incidents
traced to index staleness — the one failure mode this decision was designed
to prevent.

## Context

REQ-170 requires search to cover issues, comments, and projects; REQ-172
requires the index be maintained from domain events rather than computed on
demand at query time. Kaya Ferreira, who owns search and webhooks, designed
this against the same event bus ADR-005 established, subscribing the search
indexer to the events that change searchable content: `issue.created`,
`issue.updated`, `issue.status_changed`, `issue.archived`, `comment.created`,
`comment.deleted`, and `project.created`, `project.archived`,
`project.restored`.

The design question that mattered most was what a handler does with the
event payload it receives. The event bus's payloads are intentionally lean —
`issue.updated`'s payload carries `changedFields`, not the full row, and
`comment.created`'s payload carries `mentionedUserIds`, not the comment
body — because REQ-068 requires only changed fields be reported on
`issue.updated`, and stuffing the whole row into every event payload would
both violate that and bloat every event for every subscriber, including ones
that do not need it. That left search with a choice: trust the event payload
for whatever fields it does carry and reconstruct the rest from memory of a
prior state, or go back to the database and re-read the row fresh each time
a relevant event fires.

Kaya's team hit a concrete bug in February 2026 testing that settled this:
an early prototype partially trusted event payloads, and a scenario where
two updates to the same issue fired in quick succession (a status change
immediately followed by a title edit) caused the second handler invocation
to build its index entry from a payload that only had the title change, and
the handler's own stale in-memory cache of "what this issue currently looks
like" hadn't caught up with the status change from moments earlier — the
index briefly showed the old status alongside the new title. This surfaced
REQ-173 as an explicit requirement: handlers must re-read the row rather than
trusting the payload.

## Decision

`src/server/services/search-service.ts` registers its event handlers via
`registerWebhookListeners()`-style wiring in `event-registry.ts` (mirroring
the pattern ADR-022's activity listeners use), but every handler's actual
work is the same two steps regardless of which event fired: re-read the
current row from the appropriate repository (`issueRepo`, `commentRepo`, or
`projectRepo`), then upsert or remove the corresponding row in
`src/server/repositories/search-repository.ts`'s denormalized index, keyed
by `(orgId, subjectKind, subjectId)`. The event is treated purely as a
*signal that something changed and where to look*, never as the source of
truth for what the index entry should now contain — this is the direct
answer to the February bug, and it is why `search.reindex_requested` exists
as its own event key in `TaskflowEventMap`: it is the generic "go re-read
this subject and reindex it" signal, decoupled from any specific domain
event's payload shape, that both the write-time handlers and REQ-180's
scheduled full-rebuild job use identically.

Because the index is scoped by organization (REQ-171 — every index row
carries `orgId`, following ADR-006's convention like every other tenant
table), and because `search()` in `search-service.ts` calls
`assertOrgScope()` and `assertCan(actor, "issue:read", ...)` before querying
(REQ-181 — search requires read permission on issues, satisfied by reusing
the same permission action issue listings already require, rather than
inventing a separate `search:read` action), a query can never surface
another organization's data even if the index itself somehow held it.

Archiving a subject removes it from the index (REQ-174) rather than merely
flagging it: the `issue.archived`, `project.archived`, and
`comment.deleted` handlers all delete the corresponding search-index row
outright, following the same "live rows only, by default" philosophy
ADR-004's soft-delete convention establishes for the rest of the product —
search results are meant to reflect what a user can currently act on, not a
historical record, which is what the activity feed (ADR-022) is for
instead. `SNIPPET_RADIUS` (60 characters either side of a match) governs how
much surrounding context a result's snippet carries (REQ-177), and results
link back to their subject via a computed `href` (REQ-178).

## Consequences

**What this buys the team.** The February staleness bug cannot recur by
construction: because every handler re-reads before writing, the index entry
after any handler runs always reflects the row's actual current state at the
moment the handler executed, not a reconstruction from a payload that might
be missing fields or arriving out of order relative to a closely-following
second event. `search.reindex_requested` being a first-class, generic event
(rather than each domain event needing its own bespoke reindex logic) meant
REQ-180's scheduled full-index-rebuild job (`search-reindex-job.ts`, one of
the seven kinds ADR-16's scheduler drains, on the 1,440-minute daily
cadence) could reuse the exact same "re-read and upsert" code path the
write-time handlers use, just iterating over every subject instead of one —
no separate reindexing algorithm to keep in sync with the incremental one.

**What it costs.** Re-reading the row on every relevant event means each
search-affecting write triggers at least one extra database read beyond the
write itself — cheap individually, given `better-sqlite3`'s synchronous,
in-process nature, but a real multiplier on write volume: a project archival
that cascades to archiving many open issues (REQ-045) triggers a
re-read-and-deindex for every one of those issues, sequentially, inside the
same `emit()` call the event bus awaits before returning (ADR-005) — a bulk
archive of a very large project is, today, the slowest single operation in
the product specifically because of this re-read discipline, measured
directly during Kaya's load testing in March 2026 against a synthetic
thousand-issue project. The team accepted this because REQ-173's
correctness requirement was judged non-negotiable, and because a bulk
archive is a rare, already-slow-feeling operation to a user (they are
archiving a whole project, not clicking through a fast interactive flow),
unlike, say, comment creation, where the same re-read cost is negligible
against typical comment volume per event.

## Alternatives considered

**Trust the event payload entirely, index directly from it.** This is what
the pre-ADR prototype did, and it produced the February staleness bug
directly — rejected once reproduced and understood.

**Compute search results at query time**, joining live tables directly
rather than maintaining a separate denormalized index at all. Rejected as
both slower per query (a `LIKE`-based scan across issues, comments, and
projects on every keystroke of a search box would be materially heavier
than a single indexed lookup) and unable to satisfy REQ-172's explicit
requirement that the index be maintained from events in the first place —
this alternative would have made REQ-172 moot rather than satisfying it.

**Debounce or batch reindex requests**, coalescing rapid-fire events for the
same subject into a single re-read after a short delay, to avoid the
multiple-sequential-re-reads cost described above. Considered as a
performance optimization for the bulk-archive case specifically, and
deferred rather than adopted: it would reintroduce exactly the kind of
"index reflects a slightly stale, buffered state" risk REQ-173 exists to
close off, for a performance win the team judged not yet necessary given
current usage patterns.

## References

- REQ-170 (search covers issues, comments, projects), REQ-171 (index scoped
  by organization), REQ-172 (index maintained from domain events), REQ-173
  (handlers re-read the row rather than trusting the payload), REQ-174
  (archiving removes a subject from the index), REQ-177 (results carry a
  snippet), REQ-178 (results link back to the subject), REQ-180 (scheduled
  job can rebuild the index), REQ-181 (search requires issue read
  permission)
- ADR-004 (soft delete / live-rows-only philosophy this index's archival
  behavior mirrors), ADR-005 (the event bus this indexer subscribes to),
  ADR-016 (the scheduler that drains the daily full-rebuild job)
- Code: `src/server/services/search-service.ts` (`search`, `SNIPPET_RADIUS`,
  `SEARCH_QUERY_BUCKET`), `src/server/repositories/search-repository.ts`,
  `src/server/jobs/search-reindex-job.ts`, `src/types/event.ts`
  (`search.reindex_requested`)
