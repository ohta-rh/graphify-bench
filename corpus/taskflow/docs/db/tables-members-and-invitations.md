---
title: Members and invitations
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-020, REQ-021, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, ADR-006, ADR-004, DES-MEMBER-INVITATION, DES-PERM]
---

## Purpose

This file documents `members` and `invitations`, the two tables that carry Taskflow's
permission model in the database — every role check ultimately reads a `members` row, and
every organization's growth in seat count runs through the invitation lifecycle these two
tables together model. Both are declared in `src/server/db/schema/members.ts`; both spread
`tenantColumns` and `timestampColumns` from `_shared.ts`, and `members` additionally spreads
`softDeleteColumns` while `invitations` does not — see `conventions.md` for what that
difference implies about each table's lifecycle.

## `members`

**Drizzle export:** `members` in `src/server/db/schema/members.ts`
**Soft delete:** yes (`archived_at`)
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `MemberId` |
| `org_id` | TEXT | no | — | the tenant this membership belongs to |
| `user_id` | TEXT | no | — | typed `UserId`; the account holding this membership |
| `role` | TEXT | no | `'member'` | enum: `owner`, `admin`, `member`, `viewer` (REQ-020's rank order) |
| `status` | TEXT | no | `'active'` | enum: `active`, `invited`, `suspended` |
| `invited_by` | TEXT | yes | — | typed `UserId`; null for the org's founding owner |
| `joined_at` | TEXT | yes | — | null until the invitation is accepted or the row is created directly (e.g. org creation) |
| `last_seen_at` | TEXT | yes | — | updated by `touchLastSeen`, not on every request |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | bumped on role change (REQ-034) |
| `archived_at` | TEXT | yes | — | non-null when the member has been removed from the org |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `members_org_user_idx` | `org_id, user_id` | yes | one membership row per user per organization — the schema-level enforcement of REQ-213 ("a user may belong to several organizations," but exactly once each) |
| `members_org_role_idx` | `org_id, role` | no | supports role-filtered listing, e.g. "list this org's admins," and the last-owner check behind REQ-031 |

**Invariants**

- **One row per (org, user) pair, enforced by the unique index**, not merely by convention —
  a second `insertMember` call for the same pair would violate `members_org_user_idx` at the
  database level, independent of any application-level check.
- **The last owner cannot be removed or demoted (REQ-031).** This is enforced in
  `MemberService`, not by a database constraint — SQLite has no way to express "at least one
  row with `role = 'owner'` must remain for this `org_id`" declaratively, so the guard is a
  read-then-check in application code before any `updateMemberRole` or `archiveMember` call
  that would remove the last owner.
- **Removing a member preserves their authored content (REQ-033).** Archiving a `members` row
  does not touch `issues.author_id`, `comments.author_id`, or any other authorship column
  elsewhere in the schema — those columns hold a raw `user_id`/`UserId` value that keeps
  resolving through `users`, independent of whether the corresponding `members` row is live.
  A removed member's past issues and comments remain attributed to them.
- **Role changes are audited (REQ-034).** Every `updateMemberRole` call is expected to also
  write an `activity_events` row recording the before/after role — that pairing is a service-
  layer discipline (`MemberService` calling both `member-repository.ts` and
  `activity-repository.ts` in the same operation), not a database trigger, since this schema
  has no triggers anywhere.
- `status = 'invited'` is a legacy/transitional state distinct from having an `invitations`
  row at all — an org can represent "this person is joining" either via a live `invitations`
  row before acceptance, or via a `members` row already created with `status: 'invited'`,
  depending on the specific flow; both paths converge on `status: 'active'` once
  `markInvitationAccepted` runs.

**Read and write paths**

`src/server/repositories/member-repository.ts`: `findMember` (by org+user), `findMemberById`,
`listMembers` (keyset-paginated, per ADR-008), `countActiveMembers` (feeds the seat quota
check in REQ-032), `insertMember`, `updateMemberRole`, `archiveMember`, `touchLastSeen`.
`MemberService` is the sole caller, and it is also the layer that calls into
`src/lib/permissions.ts`'s `can()`/`assertCan()` — this repository itself performs no
authorization, per ADR-013's boundary.

**Notes**

`members` is the table `assertOrgScope` and the whole permission model ultimately bottom out
in: an `Actor` (see `src/types/member.ts`) is built by resolving the current user's `members`
row for the organization the request is scoped to (REQ-210, "an actor is resolved per
organization, not globally"), and every `can()` check reads that actor's `role`. This is why
`members_org_user_idx` being unique matters beyond simple deduplication — actor resolution
assumes there is at most one role for a given user in a given org, and the index is what makes
that assumption safe to rely on at the database level rather than merely by convention.

## `invitations`

**Drizzle export:** `invitations` in `src/server/db/schema/members.ts`
**Soft delete:** no — invitations are accepted, revoked, or expire; they are never archived
in the `archived_at` sense
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `InvitationId` |
| `org_id` | TEXT | no | — | the tenant issuing the invitation |
| `email` | TEXT | no | — | the address it is addressed to, REQ-028 |
| `role` | TEXT | no | `'member'` | the role the invitee will receive on acceptance |
| `invited_by` | TEXT | no | — | typed `UserId`; the member who sent it, always required (unlike `members.invited_by`) |
| `token_hash` | TEXT | no | — | hash of the single-use acceptance token, REQ-029 |
| `expires_at` | TEXT | no | — | time-limited per REQ-029 |
| `accepted_at` | TEXT | yes | — | null until accepted; non-null makes the invitation terminal |
| `revoked_at` | TEXT | yes | — | null until revoked; non-null makes the invitation terminal |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `invitations_token_idx` | `token_hash` | yes | the acceptance-flow lookup, same hashed-token pattern as `sessions.token_hash` |
| `invitations_org_email_idx` | `org_id, email` | no | supports "does this org already have a pending invitation for this email" and listing pending invitations by org |

**Invariants**

- **Single-use, time-limited tokens (REQ-029).** `accepted_at` and `revoked_at` are the two
  terminal states; `listPendingInvitations` and `countPendingInvitations` are expected to
  filter for `accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now`. Unlike
  `password_reset_tokens.used_at`, this table splits "consumed" into two distinct terminal
  states (accepted vs. revoked) because they trigger different downstream behavior — accepting
  creates a `members` row and emits `member.joined` (REQ-030); revoking does neither.
  Note there is no dedicated index on `(org_id, accepted_at, revoked_at)` for this filtered
  scan — the pending-invitation query relies on `invitations_org_email_idx`'s leading `org_id`
  column and a residual filter, not on an index that covers the terminal-state predicate
  directly.
- **Seat count is checked before sending an invite (REQ-032).** `countPendingInvitations` and
  `countActiveMembers` (on `members`) are combined by `MemberService`/`InvitationService`
  before `insertInvitation` runs, so a pending invitation counts against the seat quota the
  same way an active member does — an org cannot oversell its seat count by sending unlimited
  pending invitations.
- Unlike `members`, there is no unique index preventing two invitations to the same
  `(org_id, email)` pair simultaneously — a second invite to an already-invited email is a
  service-level decision (typically: revoke-and-reissue), not a schema-enforced constraint.

**Read and write paths**

`src/server/repositories/invitation-repository.ts`: `insertInvitation`,
`findInvitationByTokenHash`, `listPendingInvitations`, `markInvitationAccepted`,
`revokeInvitation`, `countPendingInvitations`. `InvitationService`/`MemberService` are the
callers; acceptance is the one path that writes to both `invitations` (via
`markInvitationAccepted`) and `members` (via `insertMember`) as effectively one logical
operation, though the two tables are updated through two separate repository calls rather
than a single cross-table transaction primitive — `better-sqlite3`'s synchronous, in-process
nature is what makes sequencing these two writes without an explicit wrapping transaction
acceptable in practice, per the reasoning in ADR-002 and ADR-008 about the single-writer
model.

**Notes**

The `invitations`/`members` split mirrors the `password_reset_tokens`/`sessions` split in
`tables-organizations-and-users.md`: a short-lived, single-use credential table
(`invitations`, `password_reset_tokens`) feeds the creation or modification of a longer-lived
state table (`members`, `sessions`). Both credential tables use the same hashed-token,
never-store-the-raw-token discipline, and both are consulted by a `findLiveXByTokenHash`-
shaped repository function before any state change is allowed. Reading `invitations` and
`members` together is the fastest way to understand how a person actually becomes a member of
an organization end-to-end: an `invitations` row is created, a token is mailed out (never
stored in plaintext in either table), the recipient's acceptance click resolves the token
back to the row via `findInvitationByTokenHash`, and a successful acceptance is what actually
produces the `members` row that every subsequent permission check reads.

## The role column and the permission model

`members.role` is the one column in this entire schema that every other authorization decision
in the product ultimately traces back to, and it is worth being explicit about what this
dictionary does and does not claim about it. The column itself is a closed four-value enum —
`owner`, `admin`, `member`, `viewer` — and REQ-020's "strict rank order" is a fact about how
those four values are *interpreted* by `src/lib/permissions.ts`'s `ROLE_MATRIX`, not something
the `TEXT` column or its enum constraint expresses on its own; SQLite enforces that the stored
value is one of the four literals, nothing about their relative ordering. `can()`, `assertCan()`
and `explain()` (DES-PERM) are the functions that turn a `role` value plus a requested action
into an allow/deny decision, and none of them are repository functions — they operate on an
already-loaded `Actor`, built from a `members` row by the request-resolution layer described in
REQ-210, not on a live database read performed at authorization-check time. This matters for
anyone tracing a permission bug through this dictionary: a stale `Actor` (one built before a
role change's `updateMemberRole` write landed) is a request-lifecycle question, not a schema
question, since nothing in this table's shape refreshes an already-resolved `Actor` mid-request.

REQ-027's platform-staff bypass is the other detail worth flagging precisely because it does
*not* live in this table at all — there is no `is_platform_staff` column on `members`, `users`,
or anywhere else in the schema documented in this dictionary. Platform-staff status is resolved
outside the tenant-scoped membership model entirely (most likely from configuration or an
environment-level allowlist rather than a per-org row, though this schema's tables give no
column that would represent it), which is consistent with the bypass being described in
`permissions.ts` as a deliberate authorization-layer exception rather than a data-layer one:
a platform-staff actor's ability to act across organizations is exactly the kind of cross-tenant
capability ADR-006 says has no legitimate expression as a normal `org_id`-scoped row. Anyone
auditing "which of these tables could a bug make a support engineer see across organizations"
should treat the absence of any platform-staff column here as confirmation that the bypass,
wherever it lives, is at least architecturally kept out of the tenant-scoped data model this
dictionary describes.
