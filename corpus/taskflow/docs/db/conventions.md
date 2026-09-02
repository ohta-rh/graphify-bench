---
title: Database conventions
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [ADR-002, ADR-004, ADR-006, ADR-008, ADR-015, DES-TENANT, DES-ARCH]
---

## Purpose

This file collects the rules that apply to every table in the schema, so the nine
table-by-table files in this directory can reference them instead of re-explaining them. It
covers the `org_id` rule, `archived_at` semantics, branded id types and how they map to SQL
columns, timestamp representation, naming conventions, and the migration policy. Everything
here is read directly off `src/server/db/schema/_shared.ts`, `src/server/db/client.ts`,
`src/server/db/migrate.ts`, `src/lib/soft-delete.ts`, `src/lib/tenant.ts`,
`src/types/common.ts`, `drizzle.config.ts` and `package.json` — no convention below is
inferred or assumed without a source file backing it.

## The shared column fragments

`src/server/db/schema/_shared.ts` is thirty lines long and is the single most-imported file
in the schema directory: every one of the other ten schema files pulls at least one export
from it. It declares four things, and every table in the database is built by composing some
subset of them into its column list:

- `idColumn(name = "id")` — `text(name).primaryKey()`. Every table's primary key is a `TEXT`
  column, never `INTEGER PRIMARY KEY` / `AUTOINCREMENT`. This is what makes ids ULIDs rather
  than sequence numbers, and it composes with `newId()` in `src/lib/id.ts` (see "Ids are
  ULIDs, typed as branded strings" below).
- `timestampColumns` — `{ createdAt: text("created_at").notNull().$defaultFn(nowIso),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso) }`. Spread into every table that
  tracks bookkeeping timestamps. `nowIso` is `() => new Date().toISOString()`.
- `tenantColumns` — `{ orgId: text("org_id").notNull() }`. Spread into every table that
  belongs to exactly one organization.
- `softDeleteColumns` — `{ archivedAt: text("archived_at") }` (nullable, no default). Spread
  into every table that is archived rather than physically deleted.

A table's shape is legible at a glance from which of these four fragments its Drizzle
definition spreads: `users` spreads only `timestampColumns` (global, never archived);
`organizations` spreads `timestampColumns` and `softDeleteColumns` (global to itself, since it
*is* the tenant, and archivable); `issues` spreads `tenantColumns`, `timestampColumns` and
`softDeleteColumns` (tenant-scoped and archivable); `activity_events` spreads only
`tenantColumns` (tenant-scoped, append-only, no `updatedAt` because rows are never mutated
after insert, no `archivedAt` because activity is pruned by `purgeActivityBefore`, not
archived). Reading a schema file, this composition is the fastest way to know a table's
lifecycle rules without reading its full repository.

## The `org_id` rule

**ADR-006** decided that every table holding tenant-owned data carries an `org_id` column
directly, rather than making callers derive tenant ownership by walking a foreign-key
hierarchy (`comment → issue → project → org`). This applies even to tables that also carry a
more specific parent reference: `issues` has both `org_id` and `project_id`; `comments` has
both `org_id` and `issue_id`; `issue_labels` has `org_id` alongside `issue_id` and `label_id`.
The redundancy is deliberate — REQ-011 requires that cross-tenant access attempts fail closed,
and auditing that is tractable only if "does this table filter by `org_id`" is answerable by
reading one column, not by tracing every table's join path back to `organizations`.

Two tables are the schema's stated exceptions, both for a documented reason rather than an
oversight:

- `users` has no `org_id` at all. A user account is global — the same `users` row can be
  referenced by `members` rows in several different organizations — so tenancy attaches to the
  `members` row, not to the user.
- `organization_usage` uses `org_id` as its own primary key rather than as a foreign-key-style
  column alongside a separate `id`, because the table is a strict 1:1 measurement record per
  organization: there is never more than one usage row per org, so `org_id` alone is the
  natural key.

At the code level, `src/lib/tenant.ts` is the only sanctioned place the `org_id` check is
expressed: `assertOrgScope(actor, orgId)` throws `TenantScopeError` when the two don't match;
`assertRowsInScope(actor, rows)` re-checks a whole result set; `isInOrgScope` /
`scopedOrNull` are the non-throwing predicate and Option-like variants; `withOrgScope(actor,
filter)` spreads the caller's filter first, then adds `orgId: actor.orgId`, so a query builder
cannot construct a filter object that forgets it. The module's own documentation calls a
hand-written `if (row.orgId !== actor.orgId)` a review failure — every domain file in this
dictionary that lists a table's invariants points back to this rule rather than restating it.
`org_id` is indexed on every tenant-scoped table (see each domain file's "Indexes" section),
because it is the leading predicate on nearly every query against that table.

## `archived_at` semantics

**ADR-004** chose a nullable `archived_at TEXT` column over hard deletion for `issues`,
`projects`, `comments`, and `members`, and over a separate `status` enum. `archivedAt ===
null` means the row is live; a non-null value is the ISO-8601 instant the row was archived.
This single column answers both "is it archived" and "when was it archived" — the design
explicitly rejected a `status` enum because the UI wants to show "archived 3 days ago," which
a bare enum would need a second column to express anyway.

What "archived" means downstream is not uniform across every consumer, and getting this wrong
silently is the failure mode ADR-004 documents as having actually happened once (a
project-restore regression that briefly let archived issues leak into a live quota count).
The three call sites that matter, all funneled through `src/lib/soft-delete.ts`:

- **Quotas.** `countIssues`, `countProjects`, and their siblings feeding `PLAN_LIMITS` checks
  count *all* rows, archived or not — REQ-044 requires archived projects to keep counting
  against the plan's project quota, on the reasoning that quota is about resource commitment
  the org made, not about what a member currently sees.
- **Listings.** Default listings (board views, project lists, comment threads) filter to live
  rows only. This is expressed by *not* passing `includeArchived: true` in the `ArchiveScope`
  a caller builds — `shouldFilterArchived(scope)` is what a repository calls to decide whether
  to add the `archived_at IS NULL` predicate, and the module's documentation is explicit that a
  hand-written `isNull(table.archivedAt)` at a call site is exactly the drift this helper
  exists to prevent.
- **Restore.** `restorePatch(now)` sets `archivedAt: null` and bumps `updatedAt`; there is no
  separate resurrection path, no audit-copy table to reconstruct from. Restoring a project does
  not need to restore its issues separately, because they were never removed — only the parent
  row's own `archivedAt` changed.

`archivePatch(now)` / `restorePatch(now)` are the only sanctioned column patches for these
transitions, and `assertNotArchived(entity, id, row)` guards against double-archiving by
throwing `AlreadyArchivedError` (mapped to HTTP 409) rather than silently succeeding a second
time. Comment deletion (REQ-098) reuses this exact mechanism — a "deleted" comment is an
archived comment, not a separate `is_deleted` concept.

Not every table that could conceivably be "deleted" uses this pattern. `attachments` are hard
deleted (`deleteAttachment`), because there is no soft-delete story for bytes that no longer
exist — an archived attachment row pointing at a byte range nobody keeps would be worse than no
row at all. `invitations` are neither soft-deleted nor hard-deleted on decline; they carry
`revokedAt` / `acceptedAt` timestamps instead, which is a narrower, invitation-specific
lifecycle rather than the general archive pattern. `notifications`, `webhook_deliveries`,
`activity_events` and the billing tables carry no `archived_at` at all — they are either
mutated in place through a small state machine (`readAt`, delivery `status`) or are treated as
an append-only log pruned by a scheduled job (`purgeActivityBefore` for activity; retention
windows are a `PlanLimits.retentionDays` quota, per ADR-004's consequences section) rather than
archived by user action.

## Ids are ULIDs, typed as branded strings

Every primary key in the schema is a `TEXT` column holding a 26-character Crockford-base32
ULID, generated by `newId()` in `src/lib/id.ts`. ULIDs were chosen specifically because they
sort lexicographically by creation time, which lets `id` double as a pagination tie-breaker
(see "Migration policy and pagination" cross-reference below, and **ADR-008**) without a
separate sequence column. `idFactory(seed)` produces a deterministic sequence for tests and
`seed.ts`, so fixtures are byte-stable across machines and runs.

At the SQL level, every id column — primary key or foreign-key-shaped reference — is a plain
`TEXT` column with no structural distinction between an id that names an issue and one that
names a project; SQLite has no way to express that distinction in DDL. **ADR-015** closes that
gap at the TypeScript level instead: `src/types/common.ts` declares `Branded<T, B> = T & {
readonly [brand]: B }` and fourteen branded aliases (`UserId`, `OrgId`, `ProjectId`,
`IssueId`, `CommentId`, `MemberId`, `NotificationId`, `ActivityId`, `InvitationId`, `LabelId`,
`AttachmentId`, `SubscriptionId`, `SessionId`, `WebhookId`) built on it, plus an `AnyId` union
for genuinely id-kind-agnostic code. The brand is compile-time-only and has zero runtime
representation — a branded `IssueId` is, at runtime, exactly the same ULID string a plain
`text()` column stores and Drizzle returns. This means the data dictionary's column tables
below list every id column's SQL type as `TEXT`, while the "notes" column calls out the
branded TypeScript type a repository function actually returns it as, since that is
information no amount of reading the SQL schema alone would reveal.

## Timestamps

Every timestamp in the schema — `created_at`, `updated_at`, `archived_at`, `due_at`,
`expires_at`, and every other `_at` column across all eleven schema files — is a `TEXT` column
holding an ISO-8601 string (`new Date().toISOString()`), never a Unix integer and never
SQLite's native `DATETIME` affinity. `src/types/common.ts` brands this as `IsoTimestamp`, and
`toIsoTimestamp(value)` is the one conversion function that produces it from a `Date` or a raw
string. The practical consequence documented in `client.ts`'s comments and consistent across
every schema file: timestamp columns sort correctly as plain text because ISO-8601 is
lexicographically ordered the same as chronologically ordered, so `ORDER BY created_at` and
`WHERE occurred_at > ?` behave exactly as a numeric timestamp would, without needing SQLite's
`DATETIME` functions.

## Naming conventions

Two parallel naming systems are in force everywhere, and the domain files below always show
both: **TypeScript/Drizzle side** uses camelCase (`orgId`, `createdAt`, `mentionedUserIds`),
matching the rest of the codebase's naming; **SQL side** uses snake_case (`org_id`,
`created_at`, `mentioned_user_ids`), matching the string literal passed as the first argument
to every `text()` / `integer()` call. Drizzle's column builder is what performs this
translation — `text("org_id")` declares a column whose SQL name is `org_id` and whose
TypeScript property name is whatever key it is assigned to in the table's object literal
(`orgId: text("org_id")`), and every schema file in this codebase keeps the two names
consistent in the obvious way (camelCase property, its snake_case equivalent as the SQL name)
with no exceptions found in any of the eleven schema files.

Table names themselves are snake_case plural nouns (`issues`, `notification_preferences`,
`webhook_deliveries`), except join tables, which name the two things they join
(`issue_labels`, `project_members`) rather than inventing a third noun. Index names follow a
fixed pattern: `<table>_<column-or-columns>_idx` for a plain index (`issues_org_status_idx`)
and the same shape for unique indexes (`users_email_idx`, `organizations_slug_idx`) — there is
no separate naming convention distinguishing unique from non-unique indexes by name alone; the
distinction is only visible in the Drizzle call (`uniqueIndex(...)` vs `index(...)`) and in
this dictionary's "unique" column.

## Migration policy

`drizzle.config.ts` points `drizzle-kit` at `./src/server/db/schema/index.ts` as the schema
source of truth and `./drizzle` as the output directory for generated SQL, with `dialect:
"sqlite"` and `strict: true`. `package.json` declares `drizzle-kit` (`0.31.10`) as a
dev dependency but exposes only two database scripts:

```
"db:migrate": "tsx src/server/db/migrate.ts"
"db:seed": "tsx src/server/db/seed.ts"
```

There is no `db:generate` script in `package.json`, and no `./drizzle` directory is checked
into this corpus. `src/server/db/migrate.ts` documents why directly in its own header comment:
"the corpus has to migrate offline from a clean clone," so the file embeds a fallback
`SCHEMA_STATEMENTS` array — one `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
statement per table and index, hand-kept in step with `src/server/db/schema/**` — and
`runMigrations()` prefers files under `./drizzle` when that directory exists (splitting each
file's SQL on Drizzle's `--> statement-breakpoint` marker) and falls back to the embedded
array when it does not. Both paths are idempotent, since every statement uses `IF NOT EXISTS`,
so `pnpm db:migrate` is safe to run repeatedly against the same database file. In a normal
development workflow outside this corpus, the expected sequence would be editing a schema file
under `src/server/db/schema/`, running `drizzle-kit generate` to produce SQL under `./drizzle`,
and then `pnpm db:migrate` to apply it — but only the apply step is an actual script in this
repository, and this dictionary documents commands that exist rather than inferring a
`generate` script that does not.

`src/server/db/client.ts`'s `getDb()` opens (or reuses, via a module-level singleton) a
`better-sqlite3` connection at `TASKFLOW_DB_PATH` (default `./data/taskflow.db`), setting
`journal_mode = WAL` and `foreign_keys = ON` as SQLite pragmas. That last pragma is worth
flagging precisely because none of the eleven schema files declare an actual `.references()`
foreign key — every "foreign key" documented in the table-by-table files below (an `orgId`
that names an `organizations` row, a `projectId` that names a `projects` row) is a plain `TEXT`
column with no `REFERENCES` clause in the Drizzle definition, enforced only at the application
layer by `src/lib/tenant.ts` and the repository functions that look the parent row up before
writing the child. Turning `foreign_keys` on affects `ON DELETE`/`ON UPDATE` cascade behavior
*if* a constraint existed, and prevents orphaned rows only for constraints SQLite is actually
told about — since none are declared here, this pragma is currently inert with respect to
referential integrity, and every referential guarantee this schema has comes from repository
and service code, not from the database engine.
