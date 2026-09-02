---
title: Membership and roles requirements
id: REQ-MEMBERSHIP
status: approved
owners: [product-team, m.lindqvist]
last_updated: 2026-05-11
related: [REQ-001, REQ-006, ADR-003, DES-011]
---

## Scope

This document defines how a user becomes a member of an organization, what the four roles
mean, how invitations work end to end, and the invariants that keep the last-owner rule and
authored-content ownership consistent under role changes and removals. It does not define
the tenant boundary itself (`organizations.md`) or what each permission action actually
gates on individual resources like issues and comments (`issues.md`,
`comments-and-mentions.md`), though the ownership-escalation mechanic is defined here because
it is a property of roles, not of any one resource.

## Context

Membership is a join between a global `User` (`src/server/repositories/user-repository.ts`,
the one repository that is not tenant-scoped) and an `Organization`, represented as a
`Member` row with a `role`. `src/server/services/member-service.ts` owns role changes and
removal; `src/server/services/invitation-service.ts` owns the invite-and-accept lifecycle
that produces new members. Both call into `src/lib/permissions.ts`, which is the single
authorization entry point (`ADR-003`): `can()`, `assertCan()`, `explain()` and `canAll()`
all read from one `ROLE_MATRIX` table keyed by `PermissionAction`.

The four roles — `owner`, `admin`, `member`, `viewer` — form a strict total order captured
in `ROLE_RANK` (`src/types/member.ts`). `ROLE_MATRIX` records, for every action, the minimum
role required, and `hasRoleAtLeast` is the comparison every "at least this role" check
reduces to. The decision order documented in `permissions.ts` runs cross-tenant guard,
platform-staff bypass, role matrix, then ownership escalation — so a `member` who is not
the assignee of an issue is denied `issue:update` by the matrix, but the same `member` who
authored that issue is granted it by the escalation step that runs after the matrix would
otherwise deny.

Invitations are their own short-lived entity (`src/server/repositories/invitation-repository.ts`),
keyed by a hash of the invite token rather than the plaintext token, so the unauthenticated
accept page (`src/app/(auth)/invite/[token]/page.tsx`) never has to trust a value it cannot
verify against the database. `invitation-service.ts` checks the seat quota
(`wouldExceedLimit`) and the `member:invite` rate-limit bucket before it mints a token,
which is why an org near its seat limit gets `plan_limit_exceeded` before Taskflow ever
writes a pending invitation row it would have to clean up later.

## Open questions

1. `REQ-026`'s ownership escalation list (`issue:update`, `issue:archive`,
   `comment:update`, `comment:delete`, `notification:manage`) is fixed in `permissions.ts`;
   whether project leads (`REQ-049`) should get an analogous escalation for
   `project:update` is an open product question, not yet a requirement.
2. `REQ-027`'s platform-staff bypass has no requirement here describing how staff status is
   granted or revoked — that lives outside this corpus's scope (an internal admin tool).
3. `REQ-032` checks seats at invite time; whether an accepted invitation should re-check the
   seat quota at acceptance time (a window where the quota could have been exhausted by a
   concurrent invite) is unresolved — see the note under `REQ-030`.

### REQ-020 — Four roles form a strict rank order

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-003, REQ-021, DES-011

`ROLE_RANK` in `src/types/member.ts` orders the four roles `owner > admin > member >
viewer`, and every "minimum role" check in the product — `ROLE_MATRIX`, `hasRoleAtLeast`,
the last-owner guard — is expressed against this single ordering rather than an ad hoc set
of role comparisons scattered per feature. There is no fifth role and no per-organization
custom role; Taskflow deliberately does not offer role customization, trading flexibility
for a permission surface simple enough to reason about in one file.

**Acceptance criteria**

1. `ROLE_RANK` assigns a strictly increasing numeric rank to `viewer < member < admin <
   owner`.
2. Every comparison of "is this role at least that role" in the codebase goes through
   `hasRoleAtLeast`, not a hand-rolled string comparison.
3. Role values outside the four are rejected at the schema layer (`src/schemas/role.ts`).

### REQ-021 — Role rank determines the default permission decision

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-020, ADR-003, REQ-027

For any `PermissionAction`, `ROLE_MATRIX` declares a minimum role; `can()` compares the
actor's role rank against that minimum after the cross-tenant and platform-staff checks have
already passed. This is the `granted_by_role` / `denied_by_role` branch of `explain()`'s
decision reasons, and it is the default path — most calls to `can()` in the app resolve here
without ever reaching the ownership-escalation step.

**Acceptance criteria**

1. `can(actor, action)` returns `true` whenever `actor.role` rank is greater than or equal
   to the action's `ROLE_MATRIX` minimum.
2. `explain()` reports `granted_by_role` or `denied_by_role` for every action not covered
   by an escalation.
3. `tests/lib/permissions.matrix.test.ts` sweeps every action against every role.

**Implemented by:** `src/lib/permissions.ts`
**Verified by:** `tests/lib/permissions.matrix.test.ts`

### REQ-022 — Viewers have read-only access across the product

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-020, REQ-181, REQ-224

`viewer` is the minimum role for every `*:read` action in `ROLE_MATRIX` —
`org:read`, `member:read`, `project:read`, `issue:read`, `comment:read`,
`notification:read` — and the minimum role for no mutating action at all. A viewer can open
every screen a member can, but every button that would write is hidden by
`PermissionGate` (see `tests/components/permission-gate.test.tsx`) and, more importantly,
would be denied server-side even if a viewer forged the request.

**Acceptance criteria**

1. No `*:create`, `*:update`, `*:delete`, `*:archive` or `*:manage_*` action's `ROLE_MATRIX`
   minimum is `viewer`.
2. Every `*:read` action's minimum is `viewer` or lower (there is no lower role).
3. A viewer's forged Server Action call is denied server-side regardless of what the client
   rendered.

### REQ-023 — Members may create and edit issues, projects and comments

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-060, REQ-090, REQ-040

`member` is the `ROLE_MATRIX` minimum for `project:create`, `project:update`,
`issue:create`, `issue:update`, `issue:assign`, `issue:archive`, `comment:create` and
`comment:update`. This is the working-contributor role: enough to do the day-to-day job of
running a project and triaging issues, without the organizational authority of `admin`
(inviting people, archiving projects, deleting issues).

**Acceptance criteria**

1. A `member` can call `createIssueAction`, `createProjectAction` and
   `createCommentAction` successfully against a resource in their own org.
2. A `member` calling `deleteIssueAction`-equivalent flows (which require `admin`) is
   denied.
3. A `member`'s issue update to a field they are not the author or assignee of still
   succeeds, because `issue:update`'s matrix minimum is already `member`, independent of
   the ownership escalation in `REQ-026`.

### REQ-024 — Admins manage membership, flags and archiving

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-028, REQ-192, REQ-045

`admin` is the `ROLE_MATRIX` minimum for `member:invite`, `member:update_role`,
`member:remove`, `org:manage_flags`, `org:update`, `project:archive`, `issue:delete`,
`comment:delete`, `activity:export` and `webhook:manage`. Admins run the organizational side
of the product — who's in it, what's turned on, what gets archived — everything short of
the two owner-only actions (`org:delete`, `org:manage_billing`).

**Acceptance criteria**

1. An `admin` can invite a member, toggle a feature flag and archive a project in one
   session without hitting a permission wall.
2. An `admin` cannot change the plan or delete the organization (`REQ-025`).
3. Every action listed above has `admin` as its exact `ROLE_MATRIX` minimum, not `owner`.

### REQ-025 — Owners alone may delete the organization or change billing

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-007, REQ-140, DES-021

`org:delete` and `org:manage_billing` are the only two actions whose `ROLE_MATRIX` minimum
is `owner`. Every billing action — `changePlanAction`, `updateSeatsAction`,
`cancelSubscriptionAction` — is gated on `org:manage_billing`, so an `admin` who can do
almost everything else in settings still cannot see or press the change-plan button;
`billing/page.tsx` renders it behind the same `can()` check the server enforces.

**Acceptance criteria**

1. `can(actor, 'org:manage_billing')` is `false` for every role below `owner`.
2. `changePlanAction` called by an `admin` returns a `forbidden` `ActionResult`, not a
   silently ignored no-op.
3. The billing settings page hides mutating controls from non-owners but still renders the
   current plan read-only, since `org:read` remains available to everyone.

### REQ-026 — Authors may edit their own issues and comments regardless of rank

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-072, REQ-097, ADR-003

The ownership escalation step runs after the role matrix would otherwise deny: for
`issue:update`, `issue:archive`, `comment:update`, `comment:delete` and
`notification:manage`, an actor who is the resource's author (or, for issues, its assignee)
is granted the action even at a role rank the matrix alone would refuse. This exists because
a `viewer`-turned-`member`'s own issue history and a `member`'s own comments should not
require an `admin` babysitting every edit — self-authored content is a reasonable thing to
let someone maintain regardless of their organizational rank, as long as the action is one
of the five escalation actions and not, say, `issue:delete`.

**Acceptance criteria**

1. `explain()` returns `granted_by_ownership` when the matrix would have denied but the
   actor is the author or assignee.
2. Ownership escalation applies to exactly the five actions listed above; it does not apply
   to `issue:delete` or `comment:create`.
3. `tests/lib/permissions.ownership.test.ts` covers both the issue-author and
   issue-assignee escalation paths independently.

**Implemented by:** `src/lib/permissions.ts`
**Verified by:** `tests/lib/permissions.ownership.test.ts`

### REQ-027 — Platform staff bypass the role matrix for support access

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-011, ADR-003, REQ-021

`actor.isPlatformStaff` is checked immediately after the cross-tenant guard and before the
role matrix, so a support engineer resolved as an `Actor` for a customer's organization is
granted every action regardless of what role, if any, they hold as a member of that org.
This is deliberately narrower than a global superuser flag: the cross-tenant guard still
runs first, so staff access is always scoped to one organization at a time through the same
`Actor` resolution path everyone else uses, never a backdoor that skips tenancy.

**Acceptance criteria**

1. `explain()` returns `granted_by_staff` when `actor.isPlatformStaff` is true, before the
   role matrix is even consulted.
2. Staff bypass does not suppress `denied_cross_tenant`; it only overrides the role matrix.
3. `granted_by_staff` is distinguishable from `granted_by_role` in the decision reason, so
   support-access usage is auditable separately from ordinary admin usage.

### REQ-028 — Invitations are addressed to an email and carry a role

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-024, REQ-032, DES-020

`inviteMember` in `src/server/services/invitation-service.ts` takes an email address and a
target role, not a user id — the invited person need not have a Taskflow account yet. The
invitation row records the email, the role it will grant on acceptance, who sent it and when.
`inviteMembers` (plural) exists for the bulk-invite flow on the members settings page,
capped by the bulk-invite bound enforced in `tests/schemas/member.schema.test.ts`.

**Acceptance criteria**

1. An invitation cannot be created for a role higher than the inviting actor's own role
   (an `admin` cannot invite an `owner`).
2. `inviteMembers` enforces the same per-invite checks (seat quota, rate limit) as
   `inviteMember` for each recipient in the batch.
3. Re-inviting an email with a pending invitation updates or resends rather than creating a
   second pending row (`REQ-029`, `resendInvitation`).

### REQ-029 — Invitation tokens are single-use and time-limited

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-030, DES-030, ADR-020

`invitation-repository.ts` keys lookups on a hash of the token (`hashToken` in
`src/lib/hash.ts`), the same pattern session tokens use (`REQ-203`), so the database never
stores a value that alone lets someone accept the invite. `markInvitationAccepted` records
an acceptance timestamp; an invitation with that timestamp already set, or past its
expiry, is refused by `acceptInvitation` before it ever creates a member.

**Acceptance criteria**

1. Accepting an already-accepted invitation fails rather than creating a duplicate member.
2. Accepting an expired invitation fails with a distinct error from an already-accepted
   one.
3. `findInvitationByTokenHash` never receives a plaintext token; the caller hashes first.

### REQ-030 — Accepting an invitation creates a member and emits member.joined

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-006, REQ-111, DES-031

`acceptInvitation(userId, input)` in `invitation-service.ts` inserts the member row at the
role recorded on the invitation, marks the invitation accepted, and emits `member.joined`
through the event bus, which is what drives the welcome notification path and the activity
row (`REQ-220`). Because the seat quota was already checked at invite time (`REQ-032`), the
happy path here does not re-check it — a design trade-off that leaves a narrow window where
concurrent acceptances could together exceed the seat count between the invite check and the
accept; this is the open question flagged at the top of this document.

**Acceptance criteria**

1. `acceptInvitation` returns a `Member` row whose `role` matches the invitation's recorded
   role, not the caller's request.
2. `member.joined` is emitted exactly once per successful acceptance.
3. `acceptInvitationAction` works for a user who is not yet authenticated as a member of
   any organization, since accepting is how they first join one.

### REQ-031 — The last owner cannot be removed or demoted

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-006, REQ-034, DES-011

`assertLastOwnerRetained(orgId, memberId, nextRole)` in `member-service.ts` runs before both
`updateMemberRole` and `removeMember` commit. If the target member is the organization's
only `owner` and the requested change would leave zero owners, the call throws rather than
silently no-opping, so the caller sees a clear error instead of a permission change that
appeared to succeed but did nothing.

**Acceptance criteria**

1. Demoting the sole owner to any other role fails.
2. Removing the sole owner fails, even when the caller is a platform-staff actor.
3. The check counts only active (non-archived) members, so a soft-deleted former owner does
   not block the invariant.

**Implemented by:** `src/server/services/member-service.ts`
**Verified by:** `tests/services/member-service.test.ts`

### REQ-032 — Seat count is checked against the plan before an invite is sent

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-133, REQ-138, ADR-010

`inviteMember` calls `wouldExceedLimit(plan, 'seats', usedSeats)` before it writes the
invitation row. A pending invitation counts toward the seat total the same as an accepted
member does — otherwise an organization at its seat limit could send an unlimited number of
pending invites and accept them all at once, blowing past the plan's `seats` field the
moment they resolve.

**Acceptance criteria**

1. Inviting past the plan's seat limit fails with `plan_limit_exceeded`, not a database
   constraint error.
2. Pending (unaccepted) invitations are included in the seat count the quota check reads.
3. Revoking a pending invitation frees the seat it was holding.

### REQ-033 — Removing a member preserves their authored content

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-004, REQ-026, REQ-071

`removeMember` is a soft delete on the member row (`archivePatch`), not a cascade that
deletes or reassigns the issues and comments that member authored. An issue's `authorId`
keeps pointing at a `userId` whose membership is now archived; the UI resolves the name via
`findUsersByIds` regardless of membership state, so historical attribution never breaks even
after someone leaves the org.

**Acceptance criteria**

1. Removing a member does not delete or reassign any issue, comment or attachment they
   authored.
2. A removed member's `role` on the archived member row is left as it was at removal time,
   for audit purposes.
3. A removed member cannot authenticate an `Actor` for that organization afterward, even
   though their `User` row and past content remain intact.

### REQ-034 — Role changes are audited with before and after values

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-220, REQ-222, ADR-022

`updateMemberRole` is one of the events that flows into the audit trail: the `activity`
service records the member's previous role and new role in the activity row's metadata, not
just "role changed." This is what lets an admin later answer "who promoted this person to
admin, and when" without digging through database backups.

**Acceptance criteria**

1. The activity row for a role change includes both the prior and new role values.
2. The actor performing the change is recorded, not just the member being changed.
3. A role change that fails validation (for example, one blocked by `REQ-031`) produces no
   activity row, since no change actually occurred.
