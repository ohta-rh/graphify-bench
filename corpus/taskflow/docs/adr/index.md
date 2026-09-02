---
title: Architecture decision records index
id: ADR-INDEX
status: approved
owners: [platform-team, d.okafor]
last_updated: 2026-06-04
related: [ADR-001, ADR-013, ADR-005, REQ-010]
---

# Architecture decision records index

This directory holds every accepted architecture decision record (ADR) for
Taskflow, from the framework choice made in the project's first week
(ADR-001, November 2025) through the most recent one (ADR-022, June 2026).
Twenty-two decisions are recorded here; all twenty-two carry `status:
accepted` as of this writing, and none has been reversed — two have been
narrowed or partially superseded by a later decision, and both of those
relationships are called out explicitly below and inside the ADRs
themselves.

## The full list

| id | title | status | date | governs |
|---|---|---|---|---|
| ADR-001 | Build on Next.js 16 App Router with Server Actions | accepted | 2025-11-06 | application framework and routing |
| ADR-002 | Use Drizzle ORM over SQLite rather than Prisma | accepted | 2025-11-12 | persistence and schema |
| ADR-003 | One authorization entry point: can() and ROLE_MATRIX | accepted | 2025-11-18 | authorization |
| ADR-004 | Soft delete with archived_at instead of hard delete | accepted | 2025-11-24 | data lifecycle |
| ADR-005 | An in-process typed event bus instead of a queue | accepted | 2025-12-02 | inter-service messaging |
| ADR-006 | Carry org_id on every tenant table | accepted | 2025-12-09 | multi-tenancy |
| ADR-007 | Use src/proxy.ts as the request hook | accepted | 2025-12-15 | request routing and session presence |
| ADR-008 | Keyset pagination over offset pagination | accepted | 2026-01-08 | list APIs |
| ADR-009 | Share Zod schemas between client forms and Server Actions | accepted | 2026-01-14 | input validation |
| ADR-010 | Declare every plan quota in one table | accepted | 2026-01-21 | billing and plan limits |
| ADR-011 | An in-process token-bucket rate limiter | accepted | 2026-01-29 | abuse prevention |
| ADR-012 | Four feature flag strategies and one evaluator | accepted | 2026-02-05 | feature flags |
| ADR-013 | Services own authorization, repositories own tenancy | accepted | 2026-02-12 | service layering |
| ADR-014 | Map domain error classes onto a closed error code union | accepted | 2026-02-19 | error handling |
| ADR-015 | Branded string ids instead of bare strings | accepted | 2026-02-26 | type safety for identifiers |
| ADR-016 | An interval scheduler with per-kind cadence | accepted | 2026-03-05 | scheduled jobs |
| ADR-017 | Maintain the search index synchronously from events | accepted | 2026-03-12 | search |
| ADR-018 | Queue webhook deliveries with capped exponential backoff | accepted | 2026-03-26 | webhooks |
| ADR-019 | Cache tags plus named cacheLife profiles | accepted | 2026-04-09 | caching and revalidation |
| ADR-020 | Opaque hashed session tokens instead of JWTs | accepted | 2026-04-23 | authentication and sessions |
| ADR-021 | Optimistic UI for issue mutations | accepted | 2026-05-14 | issue board interaction |
| ADR-022 | Derive the audit trail from the event bus | accepted | 2026-06-04 | audit and activity |

## How our decisions evolved

**November 2025 — the foundation.** The first six ADRs were all written in
the project's first six weeks, before any domain feature existed, and they
form a tight, mutually reinforcing cluster: ADR-001 committed to Next.js 16's
App Router and Server Actions specifically to keep client and server sharing
one validation contract; ADR-002 chose Drizzle over Prisma partly *because*
of a query-shape need (keyset pagination) that would not be designed until
ADR-008, two months later — an early example of a decision anticipating a
later one correctly. ADR-003 (authorization) and ADR-006 (tenancy) were
written six days apart, in direct response to a real security near-miss
(a delete-project button hidden client-side with no matching server check)
that Mira Lindqvist caught in review; ADR-004's soft-delete convention rode
alongside them, sharing the same `_shared.ts` schema helpers ADR-002 and
ADR-006 both depend on. ADR-005's event bus closed out this founding cluster
by giving the team a way to decouple reactive features from the services
that trigger them, without any external message broker — a constraint
(no external services, offline build) that shows up as a recurring theme in
nearly every decision in this directory.

**December 2025 — hardening the request path.** ADR-007 followed almost
immediately once the team hit the `middleware.ts`-to-`proxy.ts` rename
directly, during the framework upgrade itself — a near-miss where
unauthenticated dashboard access briefly went unprotected, caught in manual
QA rather than by any automated check. This period's decisions share a
pattern: several of them (ADR-006, ADR-007) exist specifically because a
near-miss or an actual bug surfaced a gap the team had not written down
explicitly, and the ADR is as much a record of the incident as it is of the
decision.

**January–February 2026 — the request/response contract.** ADR-008 through
ADR-015 form the second cluster, largely driven by Mira Lindqvist's and Rin
Saito's feature work colliding with missing platform conventions: keyset
pagination (ADR-008) came from a real production-shaped bug (a support
engineer watching issues disappear from a list mid-session due to offset
drift); plan-limit centralization (ADR-010) came from a seat-count number
drifting out of sync across four separate hardcoded locations after a
pricing change. ADR-013's service-layering rule and ADR-015's branded ids
both emerged from the same underlying worry — that without an explicit,
written convention, individually reasonable engineering choices drift apart
over time — and both were written down only after a concrete instance of
that drift was caught (an inline role check inside a repository function;
a swapped issue/project id argument).

**March–April 2026 — background work and the two revisions.** This is where
the two explicit revisions in this directory happen. ADR-016 (interval
scheduler) narrows the cadence policy ADR-005 had only sketched for
scheduled work — digest emails, overdue-issue sweeps, usage rollups — because
a single implicit cadence turned out not to fit three features needing three
genuinely different schedules. ADR-018 (webhook retry policy) goes further
and supersedes ADR-005's original inline-delivery sketch outright: an HTTP
call to a customer endpoint inside an awaited event-bus handler would have
coupled a webhook's slowness or downtime to the latency of the domain
mutation that triggered it, which Kaya Ferreira caught before it shipped.
Both revisions are recorded in two places each — inside the revising ADR's
own Context section, and inside ADR-005's Consequences section, which
acknowledges both narrowings directly rather than leaving ADR-005 to read as
though its original sketch were still the current design. ADR-017 (search)
and ADR-019 (cache tags) round out this period, both driven by concrete bugs
(index staleness from trusting event payloads; inconsistent cache-tag string
formats across two features) rather than anticipated problems.

**April–June 2026 — the user-facing layer.** The most recent three ADRs
shift focus from backend conventions to the parts of the system users
interact with directly: ADR-020 (opaque session tokens over JWTs) settled
the authentication model with an explicit eye toward two hard requirements —
immediate logout and immediate role-change effect — that a stateless token
cannot satisfy cleanly. ADR-021 (optimistic issue updates) is the one purely
UX-motivated decision in the directory, grounded in session-recording data
showing perceived lag on the issue board came from the round-trip-then-
repaint sequence itself, not raw server latency. ADR-022 (audit trail from
the event bus) closes out the period by demonstrating, in the team's own
assessment, the clearest payoff of the November 2025 event-bus decision: an
audit-logging requirement (REQ-228's failure-isolation rule) that would
otherwise have needed bespoke defensive code came essentially free, inherited
from a property the event bus was designed for an entirely different reason.

## The ADR process itself

There is no formal proposal-and-vote process recorded for any of these
twenty-two decisions — each was written by, or under the direction of, the
engineer who owns the area it governs (see each file's `owners:` front
matter), typically after implementing the decision, not before, as a record
of what was decided and why rather than a pre-implementation proposal
document. Every ADR follows the same fixed shape — Status, Context,
Decision, Consequences, Alternatives considered, References — so that a
reader can compare any two ADRs' trade-offs directly without first
translating between different authors' formats. `status: accepted` is the
only status any ADR in this directory currently carries; the front matter
schema supports `draft`, `in_review`, and `superseded` for future use, but no
ADR here has needed those states yet — a decision here has so far only ever
been narrowed or built upon by a later ADR (ADR-016, ADR-018), never fully
reversed. When that changes, the convention the platform team intends to
follow is to mark the outdated ADR `status: superseded`, add an explicit
pointer to its replacement in a new `## Status` line, and leave the rest of
the file intact as a historical record — exactly what ADR-005's own
Consequences section already does informally, in advance of that convention
being needed for a full supersession.
