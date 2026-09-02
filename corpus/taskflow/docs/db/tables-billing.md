---
title: Billing and plan limits
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-130, REQ-131, REQ-132, REQ-133, REQ-134, REQ-135, REQ-136, REQ-137, REQ-138, REQ-141, REQ-142, REQ-143, REQ-144, ADR-006, ADR-010, DES-BILLING-REPO, DES-BILLING-USAGE]
---

## Purpose

This file documents `subscriptions` and `invoices`, declared together in
`src/server/db/schema/billing.ts`. Both tables are the persisted half of Taskflow's plan and
quota system, whose declarative half is `PLAN_LIMITS` in `src/config/plan-limits.ts` —
**ADR-010**, "Declare every plan quota in one table" (as implemented, that "table" is a single
in-code constant object, not a SQL table; see the note at the end of this file)
is the design record for why quotas are declared once and read everywhere rather than stored
per-organization. `organization_usage`, the table that measures *consumption* against these
quotas, is documented in `tables-organizations-and-users.md` since it is declared in
`organizations.ts`, not `billing.ts` — this file is about the *entitlement* side (what plan an
org is on, what it is billed) rather than the *consumption* side.

## `subscriptions`

**Drizzle export:** `subscriptions` in `src/server/db/schema/billing.ts`
**Soft delete:** no — a subscription's lifecycle is its own `status` enum, not archiving
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `SubscriptionId` |
| `org_id` | TEXT | no | — | REQ-130, exactly one subscription per organization |
| `plan` | TEXT | no | `'free'` | enum: `free`, `starter`, `growth`, `enterprise` — the same four-value ladder as `organizations.plan` (REQ-131) |
| `interval` | TEXT | no | `'monthly'` | enum: `monthly`, `annual` |
| `status` | TEXT | no | `'trialing'` | enum: `trialing`, `active`, `past_due`, `canceled` |
| `seats` | INTEGER | no | `1` | contracted seat count, distinct from `organization_usage.seats_used` |
| `current_period_start` | TEXT | no | — | |
| `current_period_end` | TEXT | no | — | |
| `cancel_at` | TEXT | yes | — | scheduled cancellation, null if not canceling |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `subscriptions_org_idx` | `org_id` | no | the per-org lookup — not declared unique here even though REQ-130 states "exactly one subscription per organization" |

**Invariants**

- **Every organization has exactly one subscription (REQ-130)**, but `subscriptions_org_idx`
  is a plain `index`, not a `uniqueIndex` — unlike `organization_usage`, which enforces its 1:1
  relationship structurally by making `org_id` the primary key itself. This is worth flagging
  precisely: the "exactly one" guarantee for `subscriptions` is a requirement and presumably a
  service-level discipline (`BillingService` never calling `insertSubscription` for an org that
  already has one), not a database-level constraint the way `organization_usage`'s shape makes
  it. A row's absence for a given `org_id`, or more than one, would not be caught by this
  table's schema alone.
- **`seats` (contracted) is distinct from `organization_usage.seats_used` (actual active
  members, REQ-133).** The former is what the org is billed for; the latter is what it is
  actually consuming. `updateSeatCount` changes the contracted number; it does not touch
  `organization_usage`.
- **Downgrades are refused while usage exceeds the target plan (REQ-141).** `BillingService`
  checks `organization_usage` against the target plan's `PLAN_LIMITS` entry before allowing
  `updateSubscriptionPlan` to move `plan` downward — this table's own columns carry no
  constraint preventing an inconsistent downgrade; the check happens entirely in the service
  layer, reading two tables (`subscriptions` and `organization_usage`) together.
- **Trials expire on a schedule (REQ-142).** `listTrialsEndingBefore` supports a scheduled job
  that finds subscriptions whose trial period is ending and falls them back to `free` — the
  actual trial end marker lives on `organizations.trial_ends_at`, not on this table, which is
  worth noting as a small cross-table split: `subscriptions.status` reflects billing state
  broadly, while the specific trial countdown timestamp is denormalized onto `organizations`.

**Read and write paths**

`src/server/repositories/subscription-repository.ts`: `findSubscription`, `insertSubscription`,
`updateSubscriptionPlan` (REQ-140's `billing.plan_changed` event source), `updateSeatCount`,
`cancelSubscription`, `listTrialsEndingBefore` (REQ-142). `BillingService` is the sole caller.

## `invoices`

**Drizzle export:** `invoices` in `src/server/db/schema/billing.ts`
**Soft delete:** no — append-only billing record
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed a plain string (no dedicated `InvoiceId` appears in `AnyId`'s fourteen branded types) |
| `org_id` | TEXT | no | — | |
| `number` | TEXT | no | — | human-facing invoice number |
| `amount_cents` | INTEGER | no | — | monetary amounts stored as integer cents, never floating point |
| `currency` | TEXT | no | `'usd'` | |
| `period_start` | TEXT | no | — | |
| `period_end` | TEXT | no | — | REQ-143, one invoice per billing period |
| `paid_at` | TEXT | yes | — | null until paid |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `invoices_org_period_idx` | `org_id, period_start` | no | listing an org's invoice history in period order |

**Invariants**

- **One invoice per billing period per organization (REQ-143)**, though — the same pattern as
  `subscriptions` — there is no unique index enforcing `(org_id, period_start)` uniqueness at
  the database level; `invoices_org_period_idx` is a plain index, and the "one per period"
  guarantee is a generation-job discipline, not a schema constraint.
- **`amount_cents` is an integer, never a floating-point or decimal type** — SQLite has no
  fixed-point decimal type, and storing cents as an integer avoids floating-point rounding
  error in monetary arithmetic entirely, a common and deliberate pattern this schema follows
  consistently (there is no other monetary column anywhere in the schema, so this is the one
  place the convention is exercised).
- `InvoiceRow`'s `id` field is typed as a plain string in `NewInvoiceRow`/`InvoiceRow`'s
  inferred types — worth noting as a small gap relative to **ADR-015**'s branded-id discipline,
  since `AnyId`'s explicit fourteen-member union in `src/types/common.ts` does not include an
  `InvoiceId`, unlike every other entity table's primary key documented across this dictionary.

**Read and write paths**

`src/server/repositories/invoice-repository.ts`: `listInvoices`, `insertInvoice`,
`findInvoice`. `BillingService` generates invoices on a schedule tied to each subscription's
billing period; there is no `updateInvoice`-shaped function beyond `insertInvoice` — an
invoice, once generated, is presumably marked paid through a narrower mechanism not exposed as
a separate repository function in this file's listed surface, or `paid_at` is set as part of a
payment-webhook-driven flow this schema's repository layer does not itself model in detail.

## Plan limits are not a database table

**ADR-010**'s title, "declare every plan quota in one table," could be misread as describing a
database table this schema should contain, and it is worth being explicit that no such table
exists —
there is no `plan_limits` table in any of the eleven schema files, and REQ-132's "plan quotas
are declared in one place" is satisfied by `PLAN_LIMITS`, a `Readonly<Record<PlanId,
PlanLimits>>` constant object in `src/config/plan-limits.ts`, not by a queryable database
table. Reading `PLAN_LIMITS[org.plan]` is how every quota check in the codebase — seat count
against `organization_usage.seatsUsed`, project count against `projects` rows, issue count
against `issues` rows, webhook count against `webhook_endpoints` rows — gets its ceiling.
`UNLIMITED` is `Number.POSITIVE_INFINITY` (REQ-137), used for the enterprise plan's `seats`,
`projects`, `issuesPerProject`, and `webhooks` fields, which is why comparisons against these
limits use ordinary numeric `>=`/`<` rather than a sentinel value requiring special-case
handling — `Infinity` composes correctly with normal arithmetic and comparison, which is
exactly why REQ-137 specifies it rather than, say, `-1` or `null` as the unlimited marker.
`REQ-138`'s "exceeding a quota produces `plan_limit_exceeded`, not a crash" and `REQ-139`'s
`billing.limit_exceeded` event are both consequences of quota checks reading `PLAN_LIMITS`
against the live counted or cached (`organization_usage`) numbers documented in this dictionary
— but the limits themselves are code, not data, and this dictionary's "define no ids" scope
means `PLAN_LIMITS`'s exact values are summarized here (see `docs/db/index.md`'s row-count
expectations table) rather than fully reproduced, since it is config, not schema.

## Quota enforcement, end to end

It is worth tracing one quota check across every table involved, since no single table's
documentation shows the full path. Take REQ-134, "project count is checked before project
creation." `ProjectService.createProject` first resolves the acting organization's `plan` (a
column on `organizations`, `tables-organizations-and-users.md`), looks up
`PLAN_LIMITS[plan].projects` in `src/config/plan-limits.ts`, then calls `countProjects` (on
`projects`, `tables-projects.md`) — which, per `conventions.md`'s `archived_at` rule, counts
every row for the org regardless of archive state, because REQ-044 requires archived projects
to keep consuming the quota. If the count is at or above the limit, the create is rejected with
`plan_limit_exceeded` (REQ-138) before any `insertProject` runs, and `BillingService` is
expected to emit `billing.limit_exceeded` (REQ-139) so the event bus's other subscribers (most
directly, `NotificationService`, which can surface a `plan_limit_reached` notification kind —
see `tables-notifications-and-activity.md`) learn about the breach without `ProjectService`
needing to know anything about notifications itself.

REQ-135 (issue count per project) and REQ-136 (webhook endpoints per plan) follow the identical
shape against `issues`/`countIssues` and `webhook_endpoints`/`countEndpoints` respectively —
three different tables, three different repository functions, one shared quota-checking pattern
reading the same `PLAN_LIMITS` constant. REQ-133 (seats counted as active members) is the one
variant worth calling out: it reads `countActiveMembers` on `members`
(`tables-members-and-invitations.md`) directly for an exact, real-time count rather than
`organization_usage.seats_used`, which is the cached figure `organization_usage` maintains for
REQ-008's dashboard summary. The two numbers are expected to agree, but a seat-limit check that
must be exactly correct at the moment of an invite (REQ-032) reads the live count rather than
trusting a cache that is only periodically reconciled by `recomputeUsage` and the rollup job
`listOrgIdsForRollup` drives (REQ-144, "usage is rolled up on a schedule for the billing
screen"). This is the general shape worth remembering when reading any quota-adjacent table in
this dictionary: a check that gates a write reads live data; a check that only needs to display
a summary reads the cached `organization_usage` snapshot, and the two are reconciled on a
schedule rather than kept transactionally consistent on every write.

One more consequence of this split is worth spelling out for anyone debugging a quota
discrepancy: because `incrementUsage` (documented in `tables-organizations-and-users.md`)
applies a delta on the same code path as the write it accompanies, a quota-gating check that
reads live data (`countProjects`, `countIssues`, `countActiveMembers`, `countEndpoints`) can
never disagree with reality at the instant it runs, while `organization_usage`'s cached
counters can only drift from reality between the moment a write's `incrementUsage` call is
skipped or fails and the next scheduled `recomputeUsage` pass closes the gap. A support
engineer chasing "the usage dashboard says one number, but the org clearly has more projects
than that" should look at `organization_usage.measured_at` first — a stale timestamp there is
the tell that the cached figure, not the live count any create-time check actually enforces,
is the one that is wrong.

This split between billing entitlement (`subscriptions`, `organizations.plan`) and quota
consumption (`organization_usage` plus the live counts) is also why the two are declared in
different schema files rather than one: `subscriptions` and `invoices` model a business
relationship — what an organization has agreed to pay for and been billed — while
`organization_usage` models an operational measurement of what the organization is actually
doing with the product. The two can diverge in exactly the ways a real SaaS billing system's
two halves diverge in practice: an organization can be on the `growth` plan (an entitlement
fact, `subscriptions.plan`) while using a fraction of its `growth`-tier quotas (a consumption
fact, `organization_usage`), and a downgrade attempt (REQ-141) is precisely the operation that
has to read both halves together to decide whether it is safe.
