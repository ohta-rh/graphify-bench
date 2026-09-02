---
title: Taskflow engineering documentation
id: INDEX
status: approved
owners: [platform-team, product-team]
last_updated: 2026-08-28
related: [REQ-001, DES-001, ADR-001, ADR-013, ADR-022]
---

# Taskflow engineering documentation

This is the working documentation set for Taskflow, the multi-tenant project and issue
tracking product. It is written for the people who maintain the system, not for customers:
it assumes you can read the code, and its job is to tell you the things the code does not
say out loud — why a boundary is where it is, what a number was tuned against, which of two
plausible readings of a rule is the one we actually implemented.

Nine sections, roughly in the order you would read them if you joined the team tomorrow.

## Where to start

| If you want to know | Read |
|---|---|
| What the product is supposed to do | `requirements/index.md` |
| How it is put together | `design/architecture-overview.md`, then `design/module-map.md` |
| Why a structural choice was made | `adr/index.md` |
| What an endpoint accepts and returns | `api/index.md` |
| What a table looks like and why | `db/index.md` |
| What a screen shows in each state | `ui/index.md` |
| What is tested and what is not | `test/index.md` |
| What to do when something is broken at 3am | `ops/index.md` |
| Which requirement is implemented where | `traceability.md` |
| What a word means here | `glossary.md` |

## The id system

Three namespaces run through everything.

- **`REQ-###`** — a requirement: what the product must do, with a priority, a status and
  acceptance criteria. Defined once in `requirements/`.
- **`DES-###`** — a design element: how the code actually does it, pinned to concrete files
  and symbols. Defined once in `design/`.
- **`ADR-###`** — an architecture decision record: why a structural choice was made, what it
  cost, and what was rejected. Defined once in `adr/`, one file each.

Every other document references these ids rather than restating the rule. The convention that
makes this hold together is simple: **an id is defined by the heading that starts with it,
and nowhere else.** `pnpm docs:check` from the repository root enforces it, along with the
rule that every source path cited anywhere in these documents actually exists in the tree.

Current totals: 168 requirements, 228 design elements, 22 decision records, referenced about
fourteen times each across the corpus.

## Sections

### requirements/

Twelve domain specifications plus an index. Each requirement carries `Priority`, `Status`,
`Related`, `Implemented by` (real paths and symbols) and `Verified by` (a real spec file, or
an honest `none`). Domains and their id ranges:

| domain | file | ids |
|---|---|---|
| Organizations | `requirements/organizations.md` | REQ-001 – REQ-014 |
| Membership and roles | `requirements/membership-and-roles.md` | REQ-020 – REQ-034 |
| Projects | `requirements/projects.md` | REQ-040 – REQ-054 |
| Issues | `requirements/issues.md` | REQ-060 – REQ-079 |
| Comments and mentions | `requirements/comments-and-mentions.md` | REQ-090 – REQ-102 |
| Notifications and digests | `requirements/notifications-and-digests.md` | REQ-110 – REQ-124 |
| Billing and plan limits | `requirements/billing-and-plan-limits.md` | REQ-130 – REQ-144 |
| Webhooks | `requirements/webhooks.md` | REQ-150 – REQ-161 |
| Search | `requirements/search.md` | REQ-170 – REQ-181 |
| Feature flags | `requirements/feature-flags.md` | REQ-185 – REQ-195 |
| Auth and sessions | `requirements/auth-and-sessions.md` | REQ-200 – REQ-213 |
| Audit and activity | `requirements/audit-and-activity.md` | REQ-220 – REQ-231 |

### design/

Basic design — the eight documents that describe the system as a whole:

- `design/architecture-overview.md` — layers, runtime shape, the Next.js 16 constraints
- `design/module-map.md` — what lives where and the import rules between directories
- `design/data-flow.md` — request to action to service to repository and back
- `design/tenant-isolation.md` — how `org_id` and `assertOrgScope()` keep tenants apart
- `design/permission-model.md` — `can()`, the role matrix, ownership escalation
- `design/event-bus.md` — `emit()` / `subscribe()` and the 21 event keys
- `design/background-jobs.md` — the scheduler, the queue and the seven job kinds
- `design/caching-and-revalidation.md` — cache tags and cacheLife profiles

Detailed design — one document per service, per repository group, and per action group:
thirteen `service-*.md`, six `repository-*.md`, six `action-*.md`. Each pins its design
elements to exact files and symbols, lists the permission actions and events involved, and
carries a sequence diagram with a prose walkthrough.

### adr/

Twenty-two decision records from 2025-11 to 2026-06, covering the framework choice, the ORM,
the single authorization entry point, soft delete, the in-process event bus, `org_id`
everywhere, `src/proxy.ts` instead of middleware, keyset pagination, shared Zod schemas, the
plan-limit table, the rate limiter, flag strategies, the service boundary, the error mapping,
branded ids, the interval scheduler, the synchronous search index, the webhook retry policy,
cache profiles, opaque session tokens, optimistic issue updates, and the event-derived audit
trail. Two of them revise earlier decisions; `adr/index.md` walks the timeline.

### api/

The catalogue of Server Actions and Route Handlers, one document per action group. Each
entry states its file, its Zod input schema, its return type, the permission action it
requires, the feature flag and rate-limit bucket it consults, the plan limit it enforces, the
events it emits, the cache tags it revalidates, and the error codes it can genuinely produce.
`api/actions-overview.md` covers the shared machinery in `src/actions/_lib/`.

### db/

The data dictionary, table by table, generated by reading the Drizzle schema: columns, types,
nullability, defaults, and only the indexes that actually exist. `db/conventions.md` covers
the `org_id` rule, `archived_at` semantics, branded ids over text columns, and the migration
policy.

### ui/

Screen specifications for every dashboard route, twenty-three screens in total. Each names
its route, its files, its components, the actions it invokes, the permission it requires and
the flag that gates it, and specifies the empty, loading, error, permission-denied and
flag-off states. `ui/conventions.md` covers the primitives, role-based navigation, optimistic
updates and the Next.js 16 rules the pages obey.

### test/

The test strategy and what the suite actually covers: 617 tests across 73 files, weighted
heavily toward the library and service layers. `test/traceability-req-to-test.md` maps every
requirement to its coverage and is deliberately honest about the gaps.

### ops/

Five runbooks (the digest job, webhook retries, the overdue sweep, seeding and local setup,
the scheduler and queue), four incident postmortems, and fourteen dated decision-log entries
from November 2025 to August 2026. Several of the notes revisit and change earlier decisions;
where they do, they say which ADR they revise and why.

### traceability.md and glossary.md

`traceability.md` is generated from the documents themselves: requirement to design element
to code to test, plus the reverse mapping and two honest gap lists. `glossary.md` is the
tie-breaker for vocabulary that means different things at different layers.

## Conventions

Every document opens with front matter carrying `title`, `id`, `status`, `owners`,
`last_updated` and a `related` list of ids. Dates are real to the decision they record.
Source paths are written relative to `corpus/taskflow` and are checked mechanically. Where a
document describes behaviour the team considers untidy but has decided to keep, it says so
under a "Known rough edges" or equivalent heading rather than quietly tidying the description
— five deliberate layering exceptions are documented that way in `design/module-map.md`.

## Checking the corpus

```bash
pnpm docs:check
```

from the repository root. It validates that every referenced `REQ`/`DES`/`ADR` id is defined
exactly once, that every cited source path exists under `corpus/taskflow`, and prints file
and word counts per section.
