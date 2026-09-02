---
title: Organizations and users
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-001, REQ-002, REQ-003, REQ-006, REQ-008, REQ-009, REQ-010, REQ-200, REQ-202, REQ-203, REQ-204, REQ-208, REQ-209, ADR-006, ADR-020, DES-194, DES-168]
---

## Purpose

This file documents the five tables that sit below the two root identities in Taskflow's
data model: `organizations` (the tenant boundary) and `users` (the global account). It also
covers `organization_usage`, `sessions`, and `password_reset_tokens` — the tables that
respectively measure an organization's quota consumption and carry a user's authentication
state. Everything below is read directly from `src/server/db/schema/organizations.ts` and
`src/server/db/schema/users.ts`; see `conventions.md` for the shared column fragments
(`idColumn`, `timestampColumns`, `tenantColumns`, `softDeleteColumns`) these tables compose.

## `organizations`

**Drizzle export:** `organizations` in `src/server/db/schema/organizations.ts`
**Soft delete:** yes (`archived_at`)
**Tenant column:** none — this table *is* the tenant

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `OrgId` at the TypeScript layer |
| `name` | TEXT | no | — | display name, REQ-004 |
| `slug` | TEXT | no | — | globally unique, URL-safe, REQ-002 |
| `owner_id` | TEXT | no | — | references a `users.id`; typed `UserId`, REQ-006 |
| `plan` | TEXT | no | `'free'` | enum: `free`, `starter`, `growth`, `enterprise` |
| `logo_url` | TEXT | yes | — | optional branding asset URL |
| `trial_ends_at` | TEXT | yes | — | ISO timestamp; null once trial converts or was never started |
| `default_issue_status` | TEXT | no | `'backlog'` | seeds new issues' initial status |
| `allow_public_projects` | INTEGER (boolean) | no | `false` | gates `visibility: "public"` on `projects` |
| `require_two_factor` | INTEGER (boolean) | no | `false` | org-wide policy flag |
| `digest_hour_utc` | INTEGER | no | `7` | hour-of-day the daily digest job fires for this org |
| `enabled_flag_overrides` | TEXT | no | `'[]'` | JSON array of `FeatureFlagKey`, REQ-005 |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |
| `archived_at` | TEXT | yes | — | non-null when the org itself is archived |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `organizations_slug_idx` | `slug` | yes | REQ-002's global-uniqueness guarantee; also the lookup path for slug-based routing |
| `organizations_owner_idx` | `owner_id` | no | supports finding every org a given user owns |

**Invariants**

- Exactly one owner of record at all times (REQ-006); ownership transfer is a service-level
  operation, not a schema constraint — there is no `CHECK` enforcing a single owner, since
  SQLite cannot express "exactly one row elsewhere has `role = 'owner'` for this `org_id`"
  declaratively. The invariant is enforced by `MemberService`, not by this table.
- `slug` uniqueness is global across all organizations, not per-shard or per-plan — the one
  unique index above is sufficient because there is exactly one `organizations` table.
- `enabled_flag_overrides` is a denormalized JSON array rather than a join table to
  `feature_flags` (see `feature-flag-service.ts`); this keeps per-org flag reads to a single
  row fetch instead of a join, at the cost of the array being opaque to SQL queries.

**Read and write paths**

`src/server/repositories/organization-repository.ts`: `findOrgById`, `findOrgBySlug`,
`listOrgsForUser` (joins through `members` to answer REQ-213's "a user may belong to several
organizations"), `insertOrg`, `updateOrg`, `archiveOrg`, `listTakenOrgSlugs` (feeds
`uniqueSlug()` collision checking on create). `OrganizationService` is the sole caller of
these functions, per ADR-013's service/repository boundary.

**Notes**

`organizations` is the smallest table in the schema by row count and the most heavily
referenced by every other tenant-scoped table's `org_id` column — see `conventions.md`'s
discussion of ADR-006. `plan` duplicates information that also lives, more authoritatively,
on the `subscriptions` table (`tables-billing.md`); `organizations.plan` is the fast-path
read `PLAN_LIMITS[org.plan]` uses everywhere a quota check happens, while `subscriptions`
carries the billing-period and payment-status detail that a plan check does not need on every
request. Keeping both in sync is `BillingService`'s job when a subscription's plan changes.

## `organization_usage`

**Drizzle export:** `organizationUsage` in `src/server/db/schema/organizations.ts`
**Soft delete:** no — this table has no lifecycle of its own; it tracks a live measurement
**Tenant column:** `org_id`, and uniquely, `org_id` is also this table's primary key

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `org_id` | TEXT | no (PK) | — | one row per organization, no separate `id` |
| `seats_used` | INTEGER | no | `0` | active `members` count, REQ-008 |
| `projects_used` | INTEGER | no | `0` | live `projects` count |
| `issues_used` | INTEGER | no | `0` | live `issues` count, summed across projects |
| `storage_mb_used` | INTEGER | no | `0` | derived from `attachments.size_bytes` |
| `measured_at` | TEXT | no | — | when this snapshot was last recomputed |

**Indexes**

None beyond the primary key on `org_id`. A 1:1 table keyed by the tenant id needs no
secondary index — every access is a point lookup by `org_id`.

**Invariants**

- Exactly one row per organization, created alongside the organization and never deleted
  independently of it.
- This is a cached, periodically recomputed snapshot, not a live-computed value — REQ-008's
  usage summary reads this table directly rather than issuing four `COUNT(*)` queries against
  `members`, `projects`, `issues`, and `attachments` on every dashboard load.

**Read and write paths**

`src/server/repositories/usage-repository.ts`: `getUsage` (point read), `recomputeUsage`
(rebuilds all four counters from the live tables), `incrementUsage` (in-place delta applied
by the create/archive paths so a full recompute isn't needed on every mutation),
`listOrgIdsForRollup` (feeds a scheduled job that periodically reconciles drift between the
incremental counters and a full recompute). `UsageService` orchestrates both the incremental
and full-recompute paths.

**Notes**

The incremental-update-plus-periodic-reconciliation pattern here is a deliberate trade-off:
`incrementUsage` keeps the hot path (creating an issue, adding a member) cheap — one row
update instead of a full count — at the cost of the counters being able to drift from ground
truth if an incremental update is ever missed on an error path. `recomputeUsage` and the
rollup job exist specifically to bound that drift, not to eliminate the incremental path
entirely.

## `users`

**Drizzle export:** `users` in `src/server/db/schema/users.ts`
**Soft delete:** no — user accounts are not archived by this schema
**Tenant column:** none — users are global, per the file's own comment: "one account can join
many orgs"

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `UserId` |
| `email` | TEXT | no | — | login identifier, REQ-200 |
| `name` | TEXT | no | — | display name |
| `password_hash` | TEXT | no | — | never a plaintext password, REQ-201 |
| `avatar_url` | TEXT | yes | — | optional |
| `timezone` | TEXT | no | `'UTC'` | drives per-user time display, distinct from `organizations.digest_hour_utc` |
| `email_verified_at` | TEXT | yes | — | null until verified |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `users_email_idx` | `email` | yes | login lookup and REQ-200's implicit one-account-per-email guarantee |

**Invariants**

- `email` is unique across the whole product, not per organization — a person has exactly one
  Taskflow account regardless of how many organizations they belong to (REQ-213).
- `password_hash` is the only credential material this table stores; REQ-201 forbids storing
  a recoverable password anywhere, and `src/lib/hash.ts` is the only code path allowed to
  produce or verify this column's value.
- No `org_id` and no `archived_at` — a user is never "archived" at this table; removing a
  person's access to an organization is expressed by archiving their `members` row, not by
  touching `users`.

**Read and write paths**

`src/server/repositories/user-repository.ts`: `findUserById`, `findUserByEmail`, `insertUser`,
`updateUser`, `findPasswordHash` / `updatePasswordHash` (isolated from the general `User`
read shape so a password hash is never accidentally included in a response object),
`findUsersByIds` (batch lookup used to hydrate author/assignee display names across issue and
comment lists). `AuthService` owns registration and credential changes; most other services
read through `findUserById`/`findUsersByIds` only to display names and avatars.

**Notes**

Splitting `findPasswordHash`/`updatePasswordHash` out from the rest of the user repository's
surface is a deliberate narrowing: every other `UserRow`-returning function can be trusted not
to leak `password_hash` into a response by construction, because callers that need the hash go
through a distinctly-named function whose only two callers are `AuthService`'s login and
password-change paths.

## `sessions`

**Drizzle export:** `sessions` in `src/server/db/schema/users.ts`
**Soft delete:** no — sessions end by expiry or explicit revocation, not archiving
**Tenant column:** none directly; carries `active_org_id` as the currently-selected org, not
a table-scoping tenant column

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `SessionId` |
| `user_id` | TEXT | no | — | typed `UserId` |
| `active_org_id` | TEXT | yes | — | the org the session is currently switched into, REQ-009 |
| `token_hash` | TEXT | no | — | hash of the opaque session token, REQ-203 |
| `expires_at` | TEXT | no | — | fixed-lifetime expiry, REQ-204 |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | bumped by `setActiveOrg` |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `sessions_token_idx` | `token_hash` | yes | the per-request lookup path every authenticated request takes |

**Invariants**

- The session cookie carries the *token*, never `token_hash` or the session `id` directly —
  REQ-202 (opaque session tokens) and REQ-203 (stored hashed) together mean this table never
  holds a value that, if read directly from the database, could be replayed as a valid cookie
  without also matching the hash function.
- `active_org_id` is nullable because a freshly authenticated session, before REQ-009's
  explicit organization switch, has not yet selected one; a session with several organizations
  available does not default to any one of them implicitly.
- Expired sessions are not automatically deleted by this table's own logic — `expires_at` is
  checked at read time by `findSessionByTokenHash`, and physical removal is a separate,
  explicitly-invoked cleanup (`purgeExpiredSessions`), so a session can be "logically expired"
  and still be a row in this table for some period before that job runs.

**Read and write paths**

`src/server/repositories/session-repository.ts`: `createSession`, `findSessionByTokenHash`,
`setActiveOrg` (REQ-009's org-switch), `revokeSession` (REQ-207's server-side logout),
`purgeExpiredSessions` (scheduled cleanup). `AuthService`/`SessionService` (ADR-020's opaque
session token design) are the only callers.

**Notes**

`ADR-020` is the design record for why this table stores a hash of an opaque token rather than
a JWT or any self-describing credential: a hashed opaque token can be revoked by deleting or
invalidating the database row, where a signed JWT would remain valid until its own expiry
regardless of what this table says, since nothing about a JWT's validity depends on a database
lookup. That trade-off is also why `sessions` exists as a table at all rather than being
encoded entirely in the cookie.

## `password_reset_tokens`

**Drizzle export:** `passwordResetTokens` in `src/server/db/schema/users.ts`
**Soft delete:** no — tokens are consumed or expire, not archived
**Tenant column:** none — password reset is a global-user operation

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID |
| `user_id` | TEXT | no | — | typed `UserId` |
| `token_hash` | TEXT | no | — | same hashed-token discipline as `sessions.token_hash` |
| `expires_at` | TEXT | no | — | short-lived, REQ-208 |
| `used_at` | TEXT | yes | — | null until consumed; non-null values make the token single-use |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

None declared beyond the implicit primary-key index on `id`. Lookups by `token_hash` (in
`findLiveResetToken`) run as a filtered scan rather than through a dedicated unique index —
worth noting precisely because every other hashed-token table in this schema (`sessions`,
`invitations`) *does* index its token-hash column; this table's small, short-lived row count
(REQ-208's rate limiting keeps concurrent live tokens per user to effectively one or a
handful) is presumably why no index was added here, though this dictionary documents the
absence rather than the reasoning behind it, since no ADR covers this specific choice.

**Invariants**

- A token is single-use: `consumeResetToken` sets `used_at` and any subsequent attempt to use
  the same token must be rejected by `findLiveResetToken` checking both `used_at IS NULL` and
  `expires_at > now`.
- REQ-208 requires password reset to be rate limited; that limiting itself is enforced by
  `rate_limit_buckets` (`tables-webhooks-search-and-infra.md`), not by this table — this table
  only records tokens once issuance has already been allowed through.

**Read and write paths**

`src/server/repositories/_password-reset-repository.ts`: `issueResetToken`,
`findLiveResetToken`, `consumeResetToken`. The leading underscore in the filename marks it as
an internal implementation detail of `AuthService`, not a repository other services import
directly — consistent with `_mappers.ts` and `_paging.ts` in the same directory, which follow
the same underscore convention for shared internals rather than a public repository surface.

**Notes**

This table's naming (`password_reset_tokens`, plural, snake_case) and its file's underscore
prefix are the schema's one small inconsistency worth flagging: every other repository file
in `src/server/repositories/` is named after its owning table without a leading underscore,
and this one's underscore signals "AuthService-internal" at the file-naming level even though
the table itself sits in the shared `users.ts` schema file alongside `users` and `sessions`,
which are both accessed by more than one repository consumer.
