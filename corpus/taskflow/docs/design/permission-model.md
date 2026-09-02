---
title: Permission model
id: DES-PERM
status: approved
owners: [d.okafor, m.lindqvist]
last_updated: 2026-05-25
related: [REQ-020, REQ-021, REQ-026, REQ-027, REQ-072, REQ-097, ADR-003, DES-041]
---

## Purpose

This document describes the single authorization entry point of Taskflow —
`can()`, `assertCan()`, `explain()` and `canAll()`, all defined in
`src/lib/permissions.ts` — and the two-tier decision it makes: a role-rank check
against `ROLE_MATRIX`, escalated in five specific cases to let an author act on their
own content regardless of rank. `tenant-isolation.md` covers the *whose data*
question this model assumes has already been answered — `explain()`'s very first
check is the cross-tenant guard, before role or ownership is even consulted.

## Constraints

- `can()` is the only sanctioned way to branch on role. The module's own docstring
  states the rule plainly: "if you find yourself writing `role === "admin"`, add an
  action to `PermissionAction` and a row to `ROLE_MATRIX` instead." A raw role
  comparison anywhere else in the codebase is a review-blocking finding.
- Every `PermissionAction` used at any call site must have a row in `ROLE_MATRIX`;
  an action with no row is not "allowed by default," it is denied with reason
  `denied_unknown_action`.
- Ownership escalation is checked *after* the role matrix, never instead of it — an
  admin does not need to own a comment to delete it, because `comment:delete`'s
  matrix minimum is `admin` and the matrix check already grants it.
- `explain()` is the source of truth; `can()` is a thin wrapper (`explain(...).allowed`)
  and must never diverge from it — there is exactly one decision function, called two
  ways.

## DES-040 — `can()` / `explain()` / `assertCan()` / `canAll()` as the single entry point

- **Satisfies:** REQ-020, REQ-021
- **Decided in:** ADR-003
- **Code:** `src/lib/permissions.ts`

Four functions, one decision. `explain(actor, action, resource)` computes and returns
a full `PermissionDecision` (allowed/denied plus a machine-readable reason); `can()`
discards everything but the boolean, for call sites that only need a yes/no (nav
items, conditional rendering); `assertCan()` throws `PermissionDeniedError` when the
decision is negative, for service-layer guard clauses that want to abort a mutation
outright; `canAll(actor, actions, resource)` evaluates a list of actions against one
resource and requires every one to be allowed, used by navigation and toolbar
components that need to know "can this actor do *anything* useful with this row"
before rendering a menu. Every one of these four ultimately calls `explain()` — there
is no second decision path anywhere in the codebase, which is exactly what makes
`explain()`'s `reason` field trustworthy enough for the settings UI to show a user
*why* an action is greyed out.

## DES-041 — Ownership escalation is evaluated after the role matrix

- **Satisfies:** REQ-026, REQ-072, REQ-097
- **Decided in:** ADR-003
- **Code:** `src/lib/permissions.ts` — `explain`, `OWNERSHIP_ESCALATIONS`, `isOwnedByActor`

Five actions carry an ownership escalation: `issue:update`, `issue:archive`,
`comment:update`, `comment:delete`, `notification:manage`. `OWNERSHIP_ESCALATIONS` is
a `Partial<Record<PermissionAction, true>>` — a set, not a boolean flag on the
resource — checked only after the role-matrix branch has already returned `false`.
`isOwnedByActor()` switches on `resource.kind` to decide what "owned" means per
resource type: for an `issue`, ownership is `authorId === actor.userId ||
assigneeId === actor.userId` (REQ-072: "authors and assignees may edit an issue they
do not otherwise own"); for a `comment`, only `authorId` counts (REQ-097); for a
`project`, `leadId`; for a `notification`, `recipientId`; for a `member`,
`targetUserId`. This is why REQ-072 and REQ-097 stop short of granting authors and
assignees a role-level permission — a viewer-role author of an issue still cannot
delete that issue (`issue:delete` has no ownership escalation, requires `admin`
outright), because the escalation set is deliberately narrow rather than "owners can
do anything to their own content."

```mermaid
flowchart TD
    Start([explain(actor, action, resource)]) --> CrossTenant{actor.orgId == resource.orgId?}
    CrossTenant -- no --> DeniedCT[denied_cross_tenant]
    CrossTenant -- yes --> Staff{actor.isPlatformStaff?}
    Staff -- yes --> GrantedStaff[granted_by_staff]
    Staff -- no --> KnownAction{ROLE_MATRIX has action?}
    KnownAction -- no --> DeniedUnknown[denied_unknown_action]
    KnownAction -- yes --> RankCheck{ROLE_RANK[actor.role] >= ROLE_RANK[required]?}
    RankCheck -- yes --> GrantedRole[granted_by_role]
    RankCheck -- no --> Escalates{action in OWNERSHIP_ESCALATIONS?}
    Escalates -- no --> DeniedRole[denied_by_role]
    Escalates -- yes --> Owns{isOwnedByActor(actor, resource)?}
    Owns -- yes --> GrantedOwnership[granted_by_ownership]
    Owns -- no --> DeniedRole
```

The flowchart is the entire body of `explain()`, drawn as a decision tree rather than
prose, because the *order* of these five branches is itself the design decision:
cross-tenant is checked before anything else so a cross-org probe never reveals
whether the resource exists or what role would have been required; staff bypass
comes before the role matrix so support access is unconditional once past the tenant
gate; ownership is the last resort, reached only when the role matrix has already
said no.

## DES-042 — Decision order and the six reasons

- **Satisfies:** REQ-020, REQ-027
- **Code:** `src/lib/permissions.ts`, `src/types/permission.ts`

The six values of `PermissionDecision.reason` — `denied_cross_tenant`,
`granted_by_staff`, `denied_unknown_action`, `granted_by_role`,
`granted_by_ownership`, `denied_by_role` — map one-to-one onto the six terminal
states of the flowchart above. This closed union is what lets
`src/app/(dashboard)/[orgSlug]/settings/*` render a specific, honest explanation for
a denied action rather than a generic "not allowed" — `toAppError()`
(`src/lib/errors.ts`) forwards `action`, `resourceKind` and `reason` from a caught
`PermissionDeniedError` straight into the `ActionResult`'s `meta`, so a form can
distinguish "you need to be an admin" (`denied_by_role`) from "this belongs to
another organization" territory being handled instead by a separate
`TenantScopeError` before authorization is even reached.

## DES-043 — `ROLE_MATRIX` and `ROLE_RANK`

- **Satisfies:** REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025
- **Code:** `src/lib/permissions.ts`, `src/types/member.ts`

`ROLE_RANK` (`src/types/member.ts`) orders the four roles `viewer < member < admin <
owner` (REQ-020: "four roles form a strict rank order"); `ROLE_MATRIX` maps every one
of the 29 `PermissionAction` values to the minimum role required, before any
ownership escalation. The matrix reads as the requirements catalogue in table form:
`org:delete` and `org:manage_billing` require `owner` (REQ-025), `member:invite` /
`member:update_role` / `member:remove` / `org:update` / `org:manage_flags` /
`project:archive` / `issue:delete` / `comment:delete` / `activity:export` /
`webhook:manage` require `admin` (REQ-024), the bulk of create/update/assign actions
require `member` (REQ-023), and every `*:read` action plus `notification:manage`
requires only `viewer` (REQ-022) — `notification:manage` sitting at `viewer` looks
surprising until you notice its only realistic path to `true` for a non-staff, non-
admin actor is the ownership escalation on `recipientId`, since a viewer role alone
would let a viewer manage *anyone's* notifications if the matrix minimum were the
only gate, which is precisely the shape `ROLE_MATRIX` plus `OWNERSHIP_ESCALATIONS`
together prevent.

## DES-044 — Platform staff bypass

- **Satisfies:** REQ-027
- **Code:** `src/lib/permissions.ts`, `src/types/member.ts`

`actor.isPlatformStaff === true` grants every action unconditionally, once past the
cross-tenant guard — REQ-027's "platform staff bypass the role matrix for support
access." This is a wide door deliberately: it is checked second, immediately after
the tenant boundary and before the role matrix is even consulted, so staff access
never depends on being a member of the org at all (an `Actor` for a staff member
still has *some* `role` value, but that value is irrelevant once
`isPlatformStaff` is true). Because the bypass reason (`granted_by_staff`) is
distinct from `granted_by_role`, any audit tooling built on `explain()`'s output can
separate "an ordinary member did this because their role allows it" from "this was a
support action" without additional bookkeeping.

## DES-045 — `PermissionResource`: a discriminated union, not a generic bag

- **Satisfies:** REQ-020
- **Code:** `src/types/permission.ts`, `src/server/services/_support.ts`

`PermissionResource` is nine variants discriminated on `kind` — `organization`,
`billing`, `member`, `project`, `issue`, `comment`, `activity`, `notification`,
`webhook` — each carrying exactly the fields `isOwnedByActor()` needs for that kind
and nothing more. Services never construct a `PermissionResource` literal inline;
`_support.ts`'s `issueResource()`, `commentResource()`, `projectResource()`,
`memberResource()`, `webhookResource()`, `notificationResource()`, `orgResource()`,
`billingResource()` and `activityResource()` are the sanctioned constructors, so a
loaded `Issue` row is turned into `{ kind: "issue", orgId, projectId, issueId,
authorId, assigneeId }` in exactly one place rather than at every one of the many
call sites across `issue-service.ts` that need to check `issue:*` permissions.

## DES-046 — `canAll()` for bulk UI checks

- **Satisfies:** REQ-020
- **Code:** `src/lib/permissions.ts`

`canAll(actor, actions, resource)` is a small function — `actions.every((action) =>
can(actor, action, resource))` — but its existence keeps navigation and toolbar
components from writing their own reduction over `can()` calls, which would risk a
short-circuit bug (stopping at the first `false` without checking whether a *later*
action in the list would also have failed for a *different* reason worth surfacing).
`src/config/nav.ts`'s `visibleNav()` uses `can()` per item rather than `canAll()`,
since each nav item names at most one gating action — `canAll()`'s actual consumers
are toolbar-style components in src/components/domain/ that render a single button
group only when an actor can perform every action in the group.

## DES-047 — `PermissionDeniedError` and its translation

- **Satisfies:** REQ-020
- **Code:** `src/lib/permissions.ts`, `src/lib/errors.ts`

`PermissionDeniedError` carries the `action` and the full `PermissionDecision` that
produced it, not just a message string. `toAppError()` unpacks both into the
response's `meta`, and `HTTP_STATUS_BY_CODE` maps its `code` (`"forbidden" as const`,
set as a readonly class field) to HTTP 403. This is the only error class in the
six-class domain-error union whose `code` field is a literal on the class itself
rather than computed in `toAppError()` — a small but deliberate detail: the class
that *throws* an error already knows what kind of failure it represents, so the
mapping module does not need a lookup table for this one case, only a type-narrowing
`instanceof` check.

## DES-048 — Permissions and feature flags are separate gates, deliberately

- **Satisfies:** REQ-020, REQ-193
- **Code:** `src/lib/permissions.ts`, `src/lib/feature-flags.ts`

`can()` answers "may this role, on this resource, do this" and never consults a
feature flag; `isEnabled()` answers "is this capability turned on for this
organization" and never consults a role beyond the narrow `role` strategy case
(`issue_templates` requires `role >= admin`, evaluated inside `isEnabled()`, not
`can()`). The two are composed at call sites, not merged into one function — a page
like `.../settings/webhooks/page.tsx` checks both `can(actor, "webhook:manage", ...)`
and `isEnabled("webhooks", ctx)` before rendering the endpoint form, and a failure of
either check produces a different `ErrorCode` (`forbidden` for a `can()` failure,
also `forbidden` for a disabled-flag `FeatureDisabledError`, but with different `meta`
— `reason` for the former, `flag` for the latter) so a client can render two visibly
different messages ("you don't have permission" versus "this isn't available on your
plan yet") from what is coincidentally the same HTTP status.

## Reading `explain()`'s output in the settings UI

The permission model is not only a server-side gate — REQ-020's "role rank
determines the default permission decision" is also surfaced to the person hitting
the denial, not just enforced silently. A settings page that renders a disabled
"Delete organization" button for a `member` role calls `explain()` (not `can()`)
specifically to read the `reason` field back and render a tooltip distinguishing
"you need to be the owner" (`denied_by_role`) from a case that should never actually
occur for that button but which the component is written defensively against
anyway — `denied_cross_tenant`, which would only appear if the resource object were
constructed with the wrong `orgId`, a class of bug `_support.ts`'s constructors are
meant to prevent but which a defensive UI still accounts for rather than assuming
away. This is the practical reason `explain()` exists as a separate export from
`can()` rather than being folded into it with an optional verbose flag: call sites
that only need a boolean import `can` and never see the `PermissionDecision` shape at
all, keeping the common case's type signature simple, while the settings UI's
handful of `explain()` call sites opt into the richer return type only where they
actually render it.

## Testing the decision table

Because `ROLE_MATRIX` is a flat, enumerable object and `explain()` is a pure function
of `(actor, action, resource)` with no database access, the permission model is the
most exhaustively unit-tested module in the corpus's test suite —
`tests/lib/permissions.matrix.test.ts` and `tests/lib/permissions.ownership.test.ts`
(see the test manifest for the full list) construct
one actor per role and asserts the expected `allowed`/`reason` pair for every
`PermissionAction`, plus a parallel set of assertions for the five ownership-
escalation actions with an actor who owns the resource and one who does not. This
exhaustive coverage is only possible *because* `can()` is the single entry point
DES-040 describes — a codebase with permission checks scattered across services would
have no single decision table small enough to enumerate this way, and the fact that
this table fits in one test file is itself indirect evidence the "one entry point"
design goal (ADR-003) is holding in practice, not just in the module's own docstring.

## The `useCan` hook and client-side rendering

`src/hooks/use-permission.ts` gives Client Components a way to ask the same question
`can()` answers, without shipping the server-only `permissions.ts` module into the
client bundle. The dashboard layout serializes enough of the resolved `Actor` (role,
`isPlatformStaff`, `orgId`, `userId`) into the client `OrgProvider` for the hook to
reconstruct the same `explain()` logic against a resource shape the component
already has in props — a duplicated, client-safe implementation, not an import of
the server module. This duplication is a deliberate, narrow exception to "one
authorization entry point": the *decision logic* is still expressed once, as the
description in this document, and both the server `permissions.ts` and the client
hook are expected to implement it identically, verified by a shared contract test
(`tests/contract/permissions.test.ts`) that runs both implementations against the
same fixture table and asserts they agree on every row. Nothing about a client-side
`can()` result is ever trusted for an actual authorization decision — it only decides
whether to render a button, never whether to allow a mutation, because the server
Action's own `assertCan()` call is what actually enforces the rule regardless of what
the client believed.

## Known rough edges

- `ROLE_MATRIX`'s minimum for `notification:manage` is `viewer`, which is
  technically correct only because the ownership escalation is the actual gate for
  any non-staff actor — a future engineer reading only the matrix table, without
  tracing through `OWNERSHIP_ESCALATIONS`, could reasonably conclude any viewer can
  manage any notification, which is false.
- There is no permission action at all for editing one's own user profile
  (`update-profile.ts`'s data flow, covered in `architecture-overview.md` DES-008 and
  `module-map.md` DES-017) — the check is an inline `userId === actor.userId`
  comparison rather than a `PermissionAction`, which means this one mutation's
  authorization logic is invisible to any tooling that walks `ROLE_MATRIX` to build a
  permission matrix for documentation or admin UI purposes.
- `explain()`'s cross-tenant check compares `actor.orgId` to `resource.orgId`, but
  nothing in the type system prevents a caller from constructing a
  `PermissionResource` with an `orgId` that was never itself verified against the
  actual row it claims to represent — the `_support.ts` constructors mitigate this by
  always deriving `orgId` from the loaded row, but a hand-rolled resource literal
  bypassing those constructors would not be caught by `explain()` itself.
