---
title: Requirements index
id: REQ-INDEX
status: approved
owners: [product-team]
last_updated: 2026-06-20
related: [REQ-001, DES-001, ADR-001]
---

## Scope

This document is the navigational entry point to Taskflow's requirements corpus: 168
requirements (`REQ-001` through `REQ-231`, with gaps reserved between domains for future
growth) spread across twelve domain files. It maps each domain's id range to the source
modules it governs, summarizes the priority distribution across the whole set, and explains
how a requirement relates to the design documents (`DES-###`) and architecture decision
records (`ADR-###`) that live alongside it in this corpus.

## Domains

| Domain | File | Id range | Count |
|---|---|---|---|
| Organizations | `organizations.md` | REQ-001 – REQ-014 | 14 |
| Membership and roles | `membership-and-roles.md` | REQ-020 – REQ-034 | 15 |
| Projects | `projects.md` | REQ-040 – REQ-054 | 15 |
| Issues | `issues.md` | REQ-060 – REQ-079 | 20 |
| Comments and mentions | `comments-and-mentions.md` | REQ-090 – REQ-102 | 13 |
| Notifications and digests | `notifications-and-digests.md` | REQ-110 – REQ-124 | 15 |
| Billing and plan limits | `billing-and-plan-limits.md` | REQ-130 – REQ-144 | 15 |
| Webhooks | `webhooks.md` | REQ-150 – REQ-161 | 12 |
| Search | `search.md` | REQ-170 – REQ-181 | 12 |
| Feature flags | `feature-flags.md` | REQ-185 – REQ-195 | 11 |
| Auth and sessions | `auth-and-sessions.md` | REQ-200 – REQ-213 | 14 |
| Audit and activity | `audit-and-activity.md` | REQ-220 – REQ-231 | 12 |

The gaps in the numbering — REQ-015 through REQ-019, REQ-035 through REQ-039, and similar
bands between every domain — are reserved headroom, not missing requirements; a working
convention across this corpus is that every domain gets at least a few unused ids at the top
of its range so a future addition to, say, organizations does not have to be squeezed in as
`REQ-014a` or spill into membership's range and force a renumbering of ids other documents
already reference.

### Organizations (`organizations.md`)

The top-level tenant boundary: slugs, the owner invariant, settings and flag overrides,
cross-tenant isolation, and onboarding seeding. Everything else in the product traces back to
an organization, which is why this is the first domain in the corpus and the one every other
domain's `related:` list most often points back to. Primary source: `organization-service.ts`,
`organization-repository.ts`, `src/lib/tenant.ts`.

### Membership and roles (`membership-and-roles.md`)

The four-role rank order, `ROLE_MATRIX`, ownership escalation, platform-staff bypass, and the
full invitation lifecycle. This domain defines `can()`/`assertCan()`/`explain()`'s contract,
which every other domain's permission-gated requirements cite rather than restate. Primary
source: `member-service.ts`, `invitation-service.ts`, `src/lib/permissions.ts`.

### Projects (`projects.md`)

Project lifecycle: slugs and immutable keys, the project quota, archive/restore and its
cascade onto issues, visibility, and project-level defaults. Primary source:
`project-service.ts`, `project-repository.ts`.

### Issues (`issues.md`)

The largest domain by requirement count: numbering, status and priority vocabularies, the
issue quota, the event set every mutation emits, due dates and overdue detection, archiving,
cross-project moves, filtering and pagination, attachments, and CSV export. Primary source:
`issue-service.ts`, `issue-repository.ts`.

### Comments and mentions (`comments-and-mentions.md`)

Comment authoring, the restricted Markdown subset, mention parsing and its exclusion of code
spans, rate limiting, editing and soft delete. Primary source: `comment-service.ts`,
`src/lib/mentions.ts`, `src/lib/markdown.ts`.

### Notifications and digests (`notifications-and-digests.md`)

The event-driven fan-out hub, per-channel and per-event-class preferences, read/unread
state, and the daily digest email's batching and windowing. Primary source:
`notification-service.ts`, `digest-service.ts`, `email-service.ts`.

### Billing and plan limits (`billing-and-plan-limits.md`)

The single quota table (`PLAN_LIMITS`) and the four-plan ladder every other domain's numeric
limits derive from, plus subscription lifecycle, usage rollup, trial expiry and invoices.
Primary source: `billing-service.ts`, `usage-service.ts`, `src/config/plan-limits.ts`.

### Webhooks (`webhooks.md`)

Endpoint configuration and signing, the queue-and-drain delivery model, bounded batch
claiming, exponential backoff, and the fixed attempt ceiling. Primary source:
`webhook-service.ts`, `webhook-delivery-job.ts`.

### Search (`search.md`)

The event-driven, synchronously maintained search index across issues, comments and
projects; query-time behavior, field-scoped syntax, and the scheduled rebuild path. Primary
source: `search-service.ts`, `search-repository.ts`.

### Feature flags (`feature-flags.md`)

The single registry, the one evaluation function, the four rollout strategies, and the
org-level override mechanism nearly every other domain's plan- or role-gated requirements
depend on. Primary source: `feature-flag-service.ts`, `src/lib/feature-flags.ts`,
`src/config/feature-flags.ts`.

### Auth and sessions (`auth-and-sessions.md`)

Credential login and registration, opaque hashed session tokens, the single cookie-handling
module, and per-organization actor resolution. Primary source: `auth-service.ts`,
`session-service.ts`, `src/lib/session.ts`, `src/proxy.ts`.

### Audit and activity (`audit-and-activity.md`)

The append-only trail derived from the entire event bus, its read/export permission split,
its plan-tied retention window, and CSV export correctness. This is the terminal consumer
most other domains' events feed into, and the last domain in the corpus for that reason.
Primary source: `activity-service.ts`, `activity-repository.ts`,
`cleanup-archived-job.ts`.

## Priority distribution

Requirements are marked `must`, `should` or `could`. The distribution is not even across
domains, and that unevenness is itself informative: `issues.md` and `auth-and-sessions.md`
lean heavily `must` because their requirements describe invariants the rest of the product
assumes hold (an issue number is never reused, a session token is never stored in
plaintext); `webhooks.md` and `search.md` carry more `should` and `could` entries because
they describe a well-built but not existentially load-bearing feature area — Taskflow would
still be a coherent product with a rougher webhook retry policy, in a way it would not be a
coherent product with an inconsistent role matrix.

Roughly two-thirds of the 168 requirements are `must`, with the remainder split between
`should` (the largest share of the rest) and a smaller number of `could` entries reserved for
genuinely optional refinements — CSV export of issues, a project lead field, digest-due
pre-events — that improve the product without any other requirement in the corpus depending
on them.

Status values follow a similar pattern: the overwhelming majority of requirements are marked
`implemented`, since this corpus describes a frozen, already-built codebase rather than a
forward-looking specification. A handful are marked `partial` — `REQ-012`'s timezone
handling, `REQ-121`'s digest gap-filling, `REQ-143`'s invoice generation trigger — where the
requirement's stated intent is broader than what the current implementation delivers; these
are flagged rather than smoothed over, because an accurate requirements corpus should
distinguish "this is how it works" from "this is what we'd eventually like it to fully do."

## Relationship to design docs and ADRs

Every requirement in this corpus is implementation-grounded — its `Implemented by:` field, where
present, cites real source paths, and its `Verified by:` field cites a real test file or
explicitly notes the absence of one. Requirements answer "what must be true"; the design
documents (`DES-###`, in `../design/`) answer "how is it actually built," walking through
the module boundaries, data flow and sequencing that make a requirement true; architecture
decision records (`ADR-###`, in `../adr/`) answer "why this approach and not another,"
recording the trade-off analysis behind cross-cutting choices like the event bus
(`ADR-005`), soft delete (`ADR-004`), and keyset pagination (`ADR-008`) that many
individual requirements across many domains depend on without re-litigating the decision
each time.

A requirement's `related:` list and inline prose references are the seams between these
three layers: a requirement typically names the ADR whose decision it depends on, at least
one design doc describing its implementation in more procedural detail than the requirement
itself provides, and one or more sibling requirements in the same or an adjacent domain whose
behavior interacts with it. Reading a single requirement in isolation is possible, but reading
it alongside its cited ADR and design doc is how an engineer new to Taskflow is expected to
actually build a mental model of a feature area before making a change to it.
