---
title: Webhooks, search and infrastructure
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-150, REQ-153, REQ-154, REQ-155, REQ-156, REQ-157, REQ-158, REQ-161, REQ-170, REQ-171, REQ-172, REQ-174, REQ-176, REQ-179, REQ-180, ADR-006, ADR-008, ADR-011, ADR-017, ADR-018, DES-EVENTBUS]
---

## Purpose

This file documents the four tables declared in `src/server/db/schema/webhooks.ts`:
`webhook_endpoints`, `webhook_deliveries`, `rate_limit_buckets`, and `search_index`. The
grouping in this schema file, and in this dictionary, is functional rather than domain-driven
— none of the four tables are part of the issue-tracking or membership domain proper; they are
the persisted state behind three pieces of cross-cutting infrastructure: outbound webhook
delivery (ADR-018), in-process rate limiting (ADR-011), and a synchronous, denormalized search
index (ADR-017).

## `webhook_endpoints`

**Drizzle export:** `webhookEndpoints` in `src/server/db/schema/webhooks.ts`
**Soft delete:** no — endpoints are deleted outright, not archived
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `WebhookId` |
| `org_id` | TEXT | no | — | REQ-150, per organization |
| `url` | TEXT | no | — | the receiving endpoint |
| `secret` | TEXT | no | — | signs outgoing payloads, REQ-153 |
| `event_types` | TEXT | no | `'[]'` | JSON array of `TaskflowEventType`; which events this endpoint subscribes to |
| `enabled` | INTEGER (boolean) | no | `true` | REQ-158, disabled endpoints fail fast |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `webhook_endpoints_org_idx` | `org_id` | no | listing an org's configured endpoints, and the count feeding `PLAN_LIMITS[plan].webhooks` |

**Invariants**

- **Bounded by the plan's webhook quota (REQ-152)** — `countEndpoints` is checked by
  `WebhookService` before `insertEndpoint`, against `PLAN_LIMITS[org.plan].webhooks` (0 for
  free, up to unlimited for enterprise).
- **`secret` is stored in plaintext in this column** — unlike `sessions.token_hash` or
  `invitations.token_hash`, there is no `_hash` suffix on this column and no indication in the
  schema file that it is hashed before storage; it needs to be readable in its original form
  to sign each outgoing delivery's payload (REQ-153), which is a fundamentally different
  requirement from a session or invitation token that only ever needs to be *compared*, never
  reproduced.
- **`event_types` filters which domain events actually enqueue a delivery for this endpoint** —
  an endpoint subscribed to `["issue.created"]` never gets a `webhook_deliveries` row for a
  `comment.created` event; that filtering happens in `WebhookService` before
  `enqueueDelivery` is called, reading this JSON column.

**Read and write paths**

`src/server/repositories/webhook-repository.ts`: `listEndpoints`, `insertEndpoint`,
`updateEndpoint`, `deleteEndpoint`, `countEndpoints`. `WebhookService` is the sole caller for
configuration; endpoint management additionally requires admin (REQ-151), enforced by
`can()`, not by this table.

## `webhook_deliveries`

**Drizzle export:** `webhookDeliveries` in `src/server/db/schema/webhooks.ts`
**Soft delete:** no — a delivery's outcome is tracked by `status`, not by archiving
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID |
| `org_id` | TEXT | no | — | denormalized alongside `endpoint_id`, per ADR-006 |
| `endpoint_id` | TEXT | no | — | typed `WebhookId` |
| `event_type` | TEXT | no | — | REQ-160, the event this delivery carries |
| `payload` | TEXT | no | — | REQ-160, the full event envelope, serialized |
| `status` | TEXT | no | `'pending'` | enum: `pending`, `delivered`, `failed` |
| `attempts` | INTEGER | no | `0` | REQ-157's ceiling check, against `WEBHOOK_MAX_ATTEMPTS = 5` |
| `last_error` | TEXT | yes | — | most recent failure detail, for REQ-159's visibility in settings |
| `delivered_at` | TEXT | yes | — | null until a successful delivery |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | bumped on every delivery attempt |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `webhook_deliveries_org_status_idx` | `org_id, status` | no | the dispatcher's claim query — finding `pending` deliveries to attempt next (REQ-154, REQ-155) |

**Invariants**

- **Deliveries are queued, never sent inline with the request that triggered them (REQ-154).**
  `enqueueDelivery` only ever writes a `pending` row; the actual HTTP call happens in a
  separate dispatch pass driven by `claimPendingDeliveries`, which is REQ-155's "claimed in
  bounded batches."
- **Failed deliveries retry with exponential backoff up to a fixed ceiling (REQ-156,
  REQ-157).** `attempts` increments on each try; once it reaches `WEBHOOK_MAX_ATTEMPTS` (5, from
  `src/config/constants.ts`), `markDeliveryFailed` presumably sets a terminal `status: 'failed'`
  rather than allowing further retries — the backoff *timing* itself is not stored as a column
  here (no `next_attempt_at`-style field exists), so the scheduling of *when* the next retry
  happens is computed by the dispatcher at claim time from `attempts` and `updated_at`, not
  read from a persisted "next attempt due" value.
- **Deliveries to a disabled endpoint fail fast (REQ-158)** — `claimPendingDeliveries` or the
  dispatch loop is expected to check `webhook_endpoints.enabled` before attempting a delivery,
  short-circuiting to a failed status without consuming a retry attempt against a genuinely
  unreachable-but-disabled endpoint; this is a cross-table check at dispatch time, not a
  constraint expressed within `webhook_deliveries` itself.

**Read and write paths**

`src/server/repositories/webhook-repository.ts`: `enqueueDelivery`, `claimPendingDeliveries`,
`markDelivered`, `markDeliveryFailed`. Same repository file as `webhook_endpoints`, reflecting
that the two tables are two halves of one feature (configuration and delivery log) rather than
independently owned. `WebhookService` is the sole caller.

## `rate_limit_buckets`

**Drizzle export:** `rateLimitBuckets` in `src/server/db/schema/webhooks.ts`
**Soft delete:** no
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID |
| `org_id` | TEXT | no | — | |
| `bucket_key` | TEXT | no | — | identifies which rate-limited operation this bucket tracks |
| `tokens` | INTEGER | no | — | current token count (token-bucket algorithm) |
| `refilled_at` | TEXT | no | — | last refill timestamp |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `rate_limit_org_key_idx` | `org_id, bucket_key` | no | the point lookup every rate-limited operation performs before proceeding |

**Invariants**

- **This table is generic infrastructure, shared across every rate-limited feature in the
  product** — the schema file's own comment says it plainly: "Token-bucket state for
  `src/lib/rate-limit.ts`, persisted per org+key." Comment creation (REQ-096), password reset
  (REQ-208), search queries (REQ-176), and webhook delivery (REQ-161) are four independently
  documented requirements that all rate-limit per organization, and this one table backs all
  four rather than each feature declaring its own bucket table — `bucket_key` is what
  distinguishes one feature's bucket from another's for the same org.
- **ADR-011 ("in-process rate limiter") is the design record this table implements.** Being
  backed by a SQLite table rather than an in-memory structure is itself notable: it means rate
  limit state survives a process restart, at the cost of a database round trip on every
  rate-limited operation — a trade-off consistent with this whole application's single-process,
  synchronous, in-process-everything architecture (`better-sqlite3` makes that round trip cheap
  enough to accept).
- No `index` exists on `bucket_key` alone, only the composite `(org_id, bucket_key)` — every
  real query needs both, since rate limiting is always scoped to a specific org.

**Read and write paths**

No dedicated repository file appears under `src/server/repositories/` for this table — unlike
every other table in this dictionary, `rate_limit_buckets` has no `rate-limit-repository.ts`.
Per the schema file's comment, it is read and written directly by `src/lib/rate-limit.ts`,
which sits at the `lib` layer rather than the `repositories` layer — a deliberate placement,
since rate limiting is a cross-cutting concern several different services call into (comment
creation, password reset, search, webhook delivery), not a single domain's owned table the way
every other table in this directory is owned by exactly one repository file.

## `search_index`

**Drizzle export:** `searchIndex` in `src/server/db/schema/webhooks.ts`
**Soft delete:** no — entries are deleted on archive (REQ-174), not archived themselves
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID |
| `org_id` | TEXT | no | — | REQ-171, the index is scoped by organization |
| `subject_kind` | TEXT | no | — | enum: `issue`, `comment`, `project` (REQ-170's three covered subject kinds) |
| `subject_id` | TEXT | no | — | the id of the indexed row |
| `project_id` | TEXT | yes | — | denormalized, present for issue/comment subjects, absent (or self-referential) for a project subject; supports project-scoped search filtering |
| `content` | TEXT | no | — | the denormalized, indexable text extracted from the subject |
| `indexed_at` | TEXT | no | — | when this entry was last (re)built |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `search_index_org_kind_idx` | `org_id, subject_kind` | no | scoping a search to specific subject kinds within an org |

**Invariants**

- **This is a denormalized, synchronously-maintained index, per ADR-017 ("synchronous search
  index").** The schema file's own comment calls it "maintained by `SearchService`" — every
  write to an issue, comment, or project that affects its indexable content is expected to
  also call `upsertSearchDocument`, synchronously, as part of the same request, rather than
  through an asynchronous background indexer. This is consistent with the whole application's
  single-process, single-writer model (no message queue, no separate search service process).
- **The index is maintained from domain events (REQ-172), and handlers re-read the row rather
  than trusting the event payload (REQ-173)** — `upsertSearchDocument`'s caller is expected to
  fetch the current, authoritative row (from `issues`, `comments`, or `projects`) rather than
  index whatever data happened to be attached to the triggering event, which guards against
  indexing stale or partial data if the event payload and the row's current state have
  diverged by the time the handler runs.
- **Archiving removes a subject from the index (REQ-174)** — `deleteSearchDocument` is called
  when an issue, comment, or project is archived, meaning `search_index` never contains an
  entry for a currently-archived subject; a subsequent restore is expected to
  re-`upsertSearchDocument` it, since a plain "unarchive" alone would not resurrect a deleted
  index row.
- There is no full-text search extension (like SQLite's `FTS5`) declared anywhere in this
  schema or in `drizzle.config.ts` — `content` is a plain `TEXT` column, and `searchDocuments`'s
  matching logic (substring or a similar SQL-`LIKE`-shaped predicate, most likely, though the
  exact matching algorithm is internal to that function rather than expressed by this table's
  columns) is not backed by a dedicated search index structure at the SQLite level, only by the
  `search_index_org_kind_idx` composite index narrowing the row set a query scans.

**Read and write paths**

`src/server/repositories/search-repository.ts`: `upsertSearchDocument`,
`deleteSearchDocument`, `searchDocuments` (keyset-paginated, REQ-179), `countIndexed`.
`SearchService` is the sole caller, and per REQ-180 it also exposes a scheduled full-rebuild
path that presumably clears and re-populates this table from the live `issues`/`comments`/
`projects` tables rather than relying solely on the incremental, event-driven updates staying
perfectly in sync over time.

**Notes**

Grouping `search_index` alongside `webhook_endpoints`/`webhook_deliveries` and
`rate_limit_buckets` in one schema file (and one documentation file) reflects that all four are
supporting infrastructure for the product's core domain rather than domain entities themselves
— none of the four has a corresponding concept a user directly creates and names the way an
issue, project, or comment does. `search_index` is the one table among these four that is
purely derived data: every column's value is computable, in principle, from the `issues`,
`comments`, and `projects` tables plus the extraction logic in `SearchService`, which is why
REQ-180's rebuild capability exists at all — a corrupted or drifted `search_index` can always
be thrown away and regenerated without losing any information that isn't already recoverable
from the tables it was built from.
