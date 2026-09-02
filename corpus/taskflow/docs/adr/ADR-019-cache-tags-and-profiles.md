---
title: Cache tags plus named cacheLife profiles
id: ADR-019
status: accepted
owners: [platform-team]
last_updated: 2026-04-09
related: [REQ-054, ADR-001, ADR-013]
---

# ADR-019 — Cache tags plus named cacheLife profiles

## Status

Accepted, and applied consistently across every Server Action that mutates
cached data since April 2026 — no Server Action in the current codebase
imports `next/cache` directly.

## Context

Next.js 16 changed `revalidateTag`'s signature to require a second argument,
a cache-life profile name, alongside the tag — a breaking change from
earlier versions where a bare tag string was enough. This is exactly the
kind of API surface the platform team had already learned, from the
`middleware.ts`-to-`proxy.ts` rename covered in ADR-007, tends to rot
quietly when spelled out inline at every call site: by the time a project
has forty places calling `revalidateTag("issue:abc123")`, a signature change
in the underlying framework becomes a forty-site find-and-replace, and any
site missed compiles fine (the call still typechecks with a plausible but
wrong profile) while behaving subtly wrong at runtime — over-caching or
under-caching depending on which way the mistake goes.

The team also wanted the *vocabulary* of cache tags itself to be consistent
across features. Before this ADR, in the earliest project-detail and issue-
detail pages, two different Server Actions had each invented their own tag
string format for what was conceptually the same "this project's data
changed" invalidation — one used `"project-" + projectId`, the other
`"proj:" + projectId` — meaning a revalidation call in one code path did not
actually invalidate the reads happening in the other. That inconsistency
was caught in a March 2026 review of the project-archive flow (REQ-046,
REQ-054's per-project settings) when Mira Lindqvist noticed a settings
change was not reliably showing up on the project overview page.

## Decision

`src/lib/cache.ts` is the single module Server Actions import for cache
invalidation; nothing outside it imports `revalidateTag` from `next/cache`
directly. Three tag-building functions establish the fixed vocabulary:
`orgTag(orgId)` returns `` `org:${orgId}` ``, `projectTag(projectId)`
returns `` `project:${projectId}` ``, `issueTag(issueId)` returns
`` `issue:${issueId}` `` — one canonical format per entity kind, taking the
branded id types from ADR-015 directly, so a tag can only be built from an
id of the right kind.

`CACHE_PROFILES` declares the cache-life profile names this application
actually uses — `seconds`, `minutes`, `hours` — mapped to themselves as
strings (a deliberate placeholder-shaped mapping the module keeps as a named
export specifically so a profile name is never typed as a bare string
literal at a call site; every caller writes `CACHE_PROFILES.minutes`, never
`"minutes"`). `revalidateTagged(tags, profile = CACHE_PROFILES.minutes)` is
the one exported invalidation function: it de-duplicates the supplied tag
list via a `Set` (so a caller can freely splice together tag arrays built
from several sources — say, both `projectTag()` and `orgTag()` for an
action that affects both scopes — without worrying about `revalidateTag`
being called twice for the same tag), skips any empty-string tag defensively,
and calls the underlying `revalidateTag(tag, profile)` for each. Server
Actions that mutate an issue call `revalidateTagged([issueTag(issue.id),
projectTag(issue.projectId)])`; actions that mutate project-level settings
(REQ-054) call `revalidateTagged([projectTag(projectId), orgTag(orgId)])` so
both the specific project view and any org-level rollup (a usage meter, a
project list) pick up the change.

## Consequences

**What this buys the team.** The tag-format inconsistency that prompted
this ADR cannot recur: every call site building a project tag calls the
same `projectTag()` function, so there is exactly one string format for "a
project changed," period. When the `revalidateTag` signature changed
between Next.js versions, the fix was a single-function edit inside
`revalidateTagged()` — every one of the (by April 2026) several dozen call
sites across src/actions/ picked up the corrected signature automatically,
with zero changes needed at the call sites themselves, which is precisely
the "spelled out at forty call sites" failure mode the module's own
documentation names as the reason it exists. The de-duplication in
`revalidateTagged()` also removed a small but real inefficiency: several
multi-effect actions (archiving a project, which touches the project itself,
its issues, and the org-level project count) had previously called
`revalidateTag` multiple times for tags that turned out to be identical
once several helper calls were composed together; the `Set`-based
de-duplication made that a non-issue without requiring each call site to
reason about it.

**What it costs.** The three cache-life profile names — `seconds`,
`minutes`, `hours` — are a fixed, small vocabulary, and choosing the wrong
one for a given piece of data is a caller decision this module does not
validate for correctness, only for having *a* valid, named profile rather
than an arbitrary string. A Server Action author still has to reason about
whether their mutation's effects should be visible within seconds or can
tolerate an hour of staleness, and getting that choice wrong produces either
unnecessary cache churn (choosing `seconds` for slow-changing data) or a
stale UI (choosing `hours` for something that should refresh fast) that this
module cannot catch — it is a judgment call embedded in each Server Action,
documented only by convention (the platform team's internal guidance:
`seconds` for anything a user is actively watching change in the same
session, like an optimistic issue update reconciling; `minutes` for
ordinary CRUD; `hours` for aggregate rollups like usage meters that
naturally lag). The tag vocabulary is also coarse-grained by design — there
is no per-field tag, only per-entity — which means updating a single field
on an issue invalidates the same `issueTag()` cache entry a full rewrite of
the issue would, a deliberate simplicity trade-off the team has not needed
to revisit given how cheap SQLite reads are to recompute from.

## Alternatives considered

**Call `revalidateTag` directly at each Server Action**, accepting the
duplication and the future-breaking-change exposure. This is what the two
inconsistent tag formats in Context actually were, in practice, before this
ADR — rejected once the inconsistency was found and understood as a direct
consequence of not having a single source of truth for tag shape.

**Automatic, granular cache invalidation** (invalidate exactly and only the
specific fields or specific cached reads a mutation touched, computed
dynamically rather than via a small number of coarse per-entity tags).
Rejected as unnecessary complexity for this application's read patterns:
Taskflow's dashboard pages read whole entities (an issue detail, a project
overview), not individual fields in isolation, so entity-level tags already
match the actual granularity at which the UI re-fetches data.

**No caching at all — always read fresh from SQLite.** Given
`better-sqlite3`'s synchronous, in-process, fast reads, this was genuinely
considered as simpler than any caching layer. Rejected because Next.js's
App Router caches route segments by default regardless, so "no caching"
is not actually an option available to opt out of cleanly without fighting
the framework's own defaults — the team's real choice was between
disciplined, named cache invalidation and undisciplined, ad hoc
`revalidateTag` calls, not between caching and no caching.

## References

- REQ-054 (project settings expose per-project defaults — the feature whose
  review surfaced the original tag-format inconsistency)
- ADR-001 (Next.js 16's App Router and its cache-life profile requirement on
  `revalidateTag`, the framework change this ADR responds to), ADR-013
  (Server Actions as the layer that calls `revalidateTagged`, never a
  repository or service directly)
- Code: `src/lib/cache.ts` (`orgTag`, `projectTag`, `issueTag`,
  `revalidateTagged`, `CACHE_PROFILES`)
