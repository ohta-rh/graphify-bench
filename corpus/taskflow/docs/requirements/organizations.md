---
title: Organization requirements
id: REQ-ORGANIZATIONS
status: approved
owners: [product-team, d.okafor]
last_updated: 2026-05-04
related: [REQ-040, REQ-130, REQ-200, DES-001, DES-010, ADR-006]
---

## Scope

This document defines the requirements for the organization entity: the top-level tenant
boundary every other Taskflow object hangs off. It covers creation, slug uniqueness, the
owner invariant, settings and flag overrides, cross-tenant isolation, timezone-driven
scheduling, and the seed data an organization gets on day one. It does not cover membership
or role mechanics (see `membership-and-roles.md`) or billing quota arithmetic (see
`billing-and-plan-limits.md`), though both are downstream of the facts established here.

## Context

An organization is represented by `src/server/db/schema/organizations.ts` and read and
written through `src/server/repositories/organization-repository.ts`. Every write goes
through `src/server/services/organization-service.ts`, which is the only place that is
allowed to combine slug validation, owner-membership seeding and free-subscription seeding
into one unit of work. `createOrganization` takes the creating user's id and returns the new
`Organization`; nothing else in the codebase is permitted to call
`organization-repository.ts#insertOrg` directly, because that would skip the owner
membership and the subscription row.

Tenancy is enforced structurally, not by convention: every tenant-scoped table carries an
`org_id` column (`ADR-006`), and `assertOrgScope()` in `src/lib/tenant.ts` throws
`TenantScopeError` whenever a row's `orgId` does not match the actor's `orgId`. Repositories
filter by `orgId` in every query but never call `can()` — authorization is a service-layer
concern (`ADR-013`), so `organization-service.ts` is where `assertCan()` and
`assertOrgScope()` are actually invoked, and the repository trusts the caller already scoped
the query correctly.

Slugs are the organization's public identifier — every route in the `[orgSlug]` dashboard
route group, such as `src/app/(dashboard)/[orgSlug]/settings/page.tsx`, resolves through
`resolveOrgBySlug` before anything else runs. Because slugs are looked up so often, they are
kept globally unique across the whole product, not merely readable, and the uniqueness check
lives in `src/lib/slug.ts`'s `uniqueSlug` helper, backed by
`organization-repository.ts#listTakenOrgSlugs`.

The `Actor` resolved for a request (`src/lib/actor.ts#getActor`) is always scoped to one
organization at a time; a user who belongs to several organizations switches between them
explicitly through `switchOrgAction`, never implicitly by URL guessing, which is why
`REQ-009` and `REQ-011` both exist — the former is a UX guarantee, the latter is the security
backstop for when the UX guarantee is bypassed (a stale tab, a copied link, a scripted
client).

## Open questions

1. `REQ-012` ties digest timing to the organization's timezone, but `digestWindow()` in
   `src/lib/date.ts` takes a `digestHourUtc` integer rather than an IANA timezone string —
   see the gap noted under `REQ-121` in `notifications-and-digests.md`.
2. `REQ-008` reports usage against plan quotas but the underlying counters are only as fresh
   as the last `usage-rollup` job tick (`REQ-144`); there is no requirement forcing a
   synchronous recompute when the summary page loads.
3. Whether organization display name changes should re-trigger the search index (`REQ-172`)
   for already-indexed issue titles that embed the org name in a snippet is unresolved.

### REQ-001 — An organization is the top-level tenant boundary

- **Priority:** must
- **Status:** implemented
- **Related:** DES-001, ADR-006, REQ-010
- **Implemented by:** `src/server/db/schema/_shared.ts`, `src/server/repositories/organization-repository.ts`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

Every object a user can see or mutate in Taskflow — projects, issues, comments, members,
webhooks, invoices — is reachable only through an organization. There is no cross-org view of
"my issues" or "my projects" anywhere in the product; the org is the unit of billing, the
unit of role assignment and the unit of data isolation. This is a deliberate simplification
over a workspace-within-organization model: Taskflow is aimed at teams that buy one plan for
one org, not agencies managing many client workspaces under one login.

The practical consequence is that almost every repository function's first parameter is
`orgId`, and almost every service function's first parameter is an `Actor`, whose `orgId`
field is immutable for the lifetime of that request.

**Acceptance criteria**

1. Every table holding user-created content has a non-nullable `org_id` foreign key.
2. No repository function accepts a bare record id without also accepting `orgId`.
3. No API surface returns records from more than one organization in a single response.

### REQ-002 — Organization slugs are globally unique and URL-safe

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-008, REQ-041, DES-010
- **Implemented by:** `src/lib/slug.ts` — `assertValidSlug`, `uniqueSlug`
- **Verified by:** `tests/lib/slug.test.ts`, `tests/contract/slug.test.ts`

The slug is what appears in the URL (`/[orgSlug]/...`) and therefore has to be unique across
every organization on the instance, not just within some parent scope — there is no parent
scope above an organization. `assertValidSlug` in `src/lib/slug.ts` rejects anything that is
not lowercase, hyphen-separated and free of reserved words (`login`, `register`, `api`, and
similar route segments that would otherwise collide with the app's own top-level routes).
`uniqueSlug` appends a numeric suffix when the requested slug is taken, checked against
`organization-repository.ts#listTakenOrgSlugs`.

**Acceptance criteria**

1. A slug matches `^[a-z0-9]+(-[a-z0-9]+)*$` and is 3-48 characters.
2. Creating an organization with a taken slug either fails validation or receives a
   suffixed alternative, per the caller's chosen mode.
3. A reserved top-level route segment can never be accepted as an organization slug.

### REQ-003 — Creating an organization makes the creator its owner

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-006, REQ-020, DES-011
- **Implemented by:** `src/server/services/organization-service.ts` — `createOrganization`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`createOrganization` in `src/server/services/organization-service.ts` is transactional in
effect even though the underlying store is SQLite accessed synchronously: it inserts the
organization row, inserts a `member` row for the creator with `role: 'owner'`, and inserts a
`free` `subscription` row, before returning. There is no code path that produces an
organization without an owner member attached in the same call.

**Acceptance criteria**

1. `createOrganization` never returns successfully without also having created exactly one
   owner member.
2. The owner member's `userId` equals the `ownerId` argument passed to
   `createOrganization`.
3. A newly created organization's subscription plan is `free`.

### REQ-004 — Organization display name and description are editable by admins

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-024, REQ-034
- **Implemented by:** `src/server/services/organization-service.ts` — `updateOrganization`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`updateOrganization` requires `org:update`, whose minimum role in `ROLE_MATRIX` is `admin`.
Unlike the owner-only actions (`REQ-007`, `REQ-025`), routine profile edits are not
restricted to the single owner, because in practice the person who set up the org is rarely
the person who keeps its description current.

**Acceptance criteria**

1. A `member` or `viewer` calling `updateOrganizationAction` receives
   `denied_by_role`/`forbidden`.
2. An `admin` or `owner` can change `name` and `description` without also being able to
   change billing or delete the org.
3. The update is audited (see `REQ-034` for the role-change case and `REQ-220` for the
   general activity rule).

### REQ-005 — Organization settings carry per-org feature flag overrides

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-191, REQ-192, DES-020
- **Implemented by:** `src/server/services/feature-flag-service.ts` — `buildFlagContext`, `getSnapshot`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`Organization` carries a `settings` structure that includes a flag-override map, read by
`buildFlagContext` in `src/server/services/feature-flag-service.ts` and consulted by
`isEnabled()` before the flag's own default strategy is evaluated. This is how a single
customer can get `advanced_search` early without changing the global registry in
`src/config/feature-flags.ts`, and how support can kill `webhooks` for one misbehaving
tenant without a deploy.

**Acceptance criteria**

1. An override for a flag not marked `overridable` in the registry is refused.
2. `getSnapshot` reflects the org's own override, not the global default, whenever an
   override exists.
3. Removing an override reverts evaluation to the flag's declared strategy.

### REQ-006 — An organization always has exactly one owner of record

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-003, REQ-031, DES-011
- **Implemented by:** `src/server/services/member-service.ts` — `assertLastOwnerRetained`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

This is the invariant `assertLastOwnerRetained` in `src/server/services/member-service.ts`
exists to protect, even though the invariant is defined here at the organization level: at
no point after creation does an organization have zero owners, and Taskflow does not support
multiple simultaneous owners either — ownership transfer is a role change on one member from
`owner` to a lower rank plus a role change on another member up to `owner`, never an
independent "co-owner" state.

**Acceptance criteria**

1. `countActiveMembers` filtered to `role: 'owner'` is always exactly 1 for a
   non-archived organization.
2. No code path can remove or demote the sole `owner` member.
3. Promoting a second member to `owner` does not demote the first automatically; that is a
   separate, explicit action.

### REQ-007 — Organization deletion is restricted to the owner

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-025, REQ-048, DES-030
- **Implemented by:** `src/server/services/organization-service.ts` — `deleteOrganization`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`deleteOrganization` requires `org:delete`, whose `ROLE_MATRIX` minimum is `owner`, the
strictest gate in the product alongside `org:manage_billing`. Deletion is a soft delete —
`archivePatch()` sets `archived_at` — consistent with `ADR-004`, which means "deletion" here
is closer to deactivation than to purging the row, and the org's data is retained for the
plan's `retentionDays` window like everything else.

**Acceptance criteria**

1. An `admin` calling `deleteOrganizationAction` is denied even though `admin` can do almost
   everything else short of billing and deletion.
2. Deletion sets `archived_at` on the organization row rather than issuing a `DELETE`.
3. The route through `settings/danger/delete-organization-form.tsx` requires the caller to
   retype the org's slug before submitting, matching the destructive-action pattern used
   nowhere else in the settings area with this level of friction.

### REQ-008 — Organization summary reports usage against plan quotas

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-132, REQ-144, DES-040
- **Implemented by:** `src/server/services/organization-service.ts` — `getOrganizationSummary`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`getOrganizationSummary` composes the organization row, its subscription and its usage
counters into one `OrganizationSummary` for the org's landing page and the billing screen.
It does not independently recompute usage; it reads whatever `usage-repository.ts#getUsage`
currently holds, which is refreshed both incrementally (on writes, via
`incrementUsage`) and in bulk (on a schedule, via `REQ-144`'s rollup job).

**Acceptance criteria**

1. The summary includes at minimum seats, projects, issues per project and storage, each
   shown against the plan's limit.
2. An `enterprise` org's unlimited fields render as unlimited, not as a very large number
   (see `REQ-137`).
3. The summary function performs no writes; it is read-only.

### REQ-009 — Switching between organizations is explicit, never implicit

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-213, DES-041
- **Implemented by:** `src/server/services/session-service.ts` — `switchActiveOrg`, `src/actions/organizations/switch-org.ts` — `switchOrgAction`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`switchActiveOrg` in `src/server/services/session-service.ts`, invoked by
`switchOrgAction`, is the only way the session's active organization changes. There is no
implicit "last visited org" fallback that silently switches context — a user landing on a
URL for an org they belong to but did not explicitly switch into still resolves an `Actor`
for that org (URLs are the unit of navigation), but the session's *default* active org used
for org-agnostic surfaces (like the top-level redirect after login) only changes via this
explicit action.

**Acceptance criteria**

1. `switchOrgAction` requires the target org to be one the user is an active member of.
2. No Server Action mutates the session's active org as a side effect of an unrelated
   action.
3. `assertOrgScope` is invoked on the switch target before the session is updated.

### REQ-010 — Every tenant-scoped row carries org_id

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-006, REQ-011, DES-001
- **Implemented by:** `src/server/db/schema/_shared.ts`
- **Verified by:** `tests/server/tenant-scope.test.ts`

This is the schema-level restatement of `REQ-001`. `src/server/db/schema/_shared.ts` defines
the shared column helpers every tenant table's schema module composes, and `org_id` is one of
them, alongside the `archived_at` soft-delete column from `ADR-004`. The one deliberate
exception is `src/server/db/schema/users.ts` — users are global, because a person's login
identity is not owned by any one organization (`REQ-213`).

**Acceptance criteria**

1. Every tenant schema file, such as `src/server/db/schema/organizations.ts` and
   `src/server/db/schema/projects.ts`, except `src/server/db/schema/users.ts`, declares an
   `org_id` column.
2. Every repository query filters on `org_id` except in `user-repository.ts`, which is
   explicitly not tenant-scoped.
3. A migration adding a new tenant table must add `org_id` in the same migration.

### REQ-011 — Cross-tenant access attempts fail closed and are recorded

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-010, ADR-003, DES-001

`assertOrgScope()` in `src/lib/tenant.ts` throws `TenantScopeError` the instant a resource's
`orgId` does not match the actor's. In the permission decision order documented in
`src/lib/permissions.ts` — cross-tenant guard, then platform-staff bypass, then the role
matrix, then ownership escalation — the cross-tenant guard runs first and unconditionally;
not even `actor.isPlatformStaff` can bypass it, which is intentional: platform staff support
one organization at a time through an explicit org-scoped actor, never a blanket
cross-tenant view. `denied_cross_tenant` is a distinct decision reason from
`denied_by_role`, which is what "recorded" means here — the reason is visible to whatever
observability wraps `explain()`, even though it is not itself an activity-feed row.

**Acceptance criteria**

1. A `TenantScopeError` maps to HTTP 403 via `tenant_scope_violation` in
   `HTTP_STATUS_BY_CODE`.
2. `tests/lib/permissions.matrix.test.ts` exercises the cross-tenant denial explicitly.
3. `isPlatformStaff` does not suppress a `TenantScopeError`.

**Implemented by:** `src/lib/tenant.ts`, `src/lib/permissions.ts`
**Verified by:** `tests/lib/tenant.test.ts`, `tests/server/tenant-scope.test.ts`

### REQ-012 — Organization timezone drives digest and due-date windows

- **Priority:** should
- **Status:** partial
- **Related:** REQ-121, REQ-070, DES-050
- **Implemented by:** `src/lib/date.ts` — `digestWindow`, `isOverdue`
- **Verified by:** `tests/lib/date.test.ts`

Organizations conceptually operate in one timezone for the purpose of "what day is this
digest for" and "is this issue overdue yet." In practice `digestWindow()` in
`src/lib/date.ts` takes a `digestHourUtc` number rather than a full IANA timezone, so the
organization's notion of "its day" is currently expressed as a UTC hour offset rather than a
named timezone with daylight-saving awareness. This is flagged as `partial`, not
`implemented`, because the requirement as stated (timezone) is wider than what the code
delivers (a UTC hour).

**Acceptance criteria**

1. `digestWindow` is deterministic for a given `digestHourUtc` and reference time.
2. `isOverdue` compares `dueAt` against the current instant, not against a
   timezone-shifted local date, so due dates are UTC-instant comparisons today.
3. A future timezone-aware version must not change already-computed `dueAt` values
   retroactively.

### REQ-013 — Organization labels are shared across all its projects

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-074, DES-051
- **Implemented by:** `src/server/services/label-service.ts`, `src/server/repositories/label-repository.ts` — `listLabels`, `deleteLabel`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

Labels are not scoped to a project; `label-repository.ts` and `label-service.ts` both key
purely on `orgId`. A label created while looking at one project's issue list is immediately
available on every other project in the same organization. This mirrors how the product is
actually used — labels like `bug` or `needs-design` are organization-wide vocabulary, not
one team's private taxonomy — and avoids the duplicate-label problem a per-project label
table would create.

**Acceptance criteria**

1. `listLabels(orgId)` returns labels regardless of which project the caller is currently
   viewing.
2. Deleting a label detaches it from every issue across every project in the org
   (`deleteLabel`'s cascade through `setIssueLabels`).
3. There is no `project_id` column on the labels table.

### REQ-014 — Organization onboarding seeds a first project

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-040, REQ-053
- **Implemented by:** `src/server/services/organization-service.ts` — `createOrganization`, `src/actions/auth/register.ts` — `registerAction`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`createOrganization` does not stop at the owner member and the free subscription; the
onboarding flow that calls it also creates a starter project so a brand-new organization is
never a completely empty shell when the owner lands on the dashboard for the first time. This
keeps the empty-state problem — "what do I do first" — out of the product entirely for the
single most common entry point, registration.

**Acceptance criteria**

1. A freshly registered organization has at least one non-archived project immediately
   after `registerAction` completes.
2. The seeded project's `project.created` event fires like any other project creation
   (`REQ-053`), so downstream listeners (search indexing, activity) behave identically.
3. Onboarding seeding does not count twice against the `projects` quota if the user then
   creates a second project immediately.
