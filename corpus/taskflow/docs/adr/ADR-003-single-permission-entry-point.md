---
title: One authorization entry point - can() and ROLE_MATRIX
id: ADR-003
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2025-11-18
related: [REQ-020, REQ-021, REQ-026, REQ-027, ADR-013, ADR-014]
---

# ADR-003 — One authorization entry point: can() and ROLE_MATRIX

## Status

Accepted. Unchanged since November 2025. Every authorization check in the
codebase, without exception, funnels through the functions this ADR defines;
a lint-adjacent code-review rule (documented, not (yet) automated) treats a
hand-written `role === "admin"` comparison anywhere outside
`src/lib/permissions.ts` as a blocking review comment.

## Context

Taskflow has four roles — `owner`, `admin`, `member`, `viewer` — and by the
third week of the project there were already three different places checking
them: a Server Action comparing `actor.role === "admin"` before letting
someone invite a member, a page component hiding a delete button for
non-owners, and a repository function that had started, worryingly, to filter
rows by role instead of by tenant. None of the three agreed on what "admin"
could do to a project versus an issue, and Mira Lindqvist found a real bug in
review: the delete-project button was hidden for members based on client-side
role comparison, but the underlying Server Action had no server-side check at
all, so a crafted request from a member's session could delete a project.

The team also knew from the outset that authorization would need more than a
role comparison. Two things made a pure "role rank required" model
insufficient on its own:

- **Ownership.** REQ-026 requires that authors and assignees can edit their
  own issues, and authors can edit their own comments, even when their role
  rank alone would not qualify — a `member` who created an issue should be
  able to update it even if issue updates were gated at `member` and the
  actor's actual role had since been demoted (membership state is checked
  independently; this is about the rank-vs-ownership interaction).
- **Platform support access.** REQ-027 requires that Taskflow's own staff can
  access an organization's data for support purposes without being a member
  of it at all, which no per-org role can express.

Deji Okafor's proposal, written up after the delete-project incident, was to
make authorization a pure function of `(actor, action, resource)` with a
single, total decision order, rather than a scattered set of ad hoc
conditionals that each reinvent a slightly different notion of "allowed."

## Decision

`src/lib/permissions.ts` is the single authorization entry point. `can()`
answers "may this actor perform this action on this resource?" as a boolean;
`explain()` returns the same decision with a `PermissionDecision` including a
`reason`, used by the settings UI to tell an admin why a control is disabled
rather than just hiding it; `assertCan()` is the throwing variant used in
service-layer guard clauses, raising `PermissionDeniedError` on denial;
`canAll()` bulk-evaluates a list of actions against one resource, used by
navigation and toolbar components that need to know which buttons to render
before the first click.

The decision order is fixed and total, in `explain()`:

1. **Cross-tenant guard.** If `actor.orgId !== resource.orgId`, the decision
   is `denied_cross_tenant` before anything else is evaluated — a
   cross-tenant request is never even considered against the role matrix.
2. **Platform staff bypass.** `actor.isPlatformStaff === true` short-circuits
   to `granted_by_staff`.
3. **Role matrix lookup.** `ROLE_MATRIX[action]` gives the minimum `Role`
   required; `ROLE_RANK[actor.role] >= ROLE_RANK[required]` grants with
   reason `granted_by_role`. An action missing from `ROLE_MATRIX` denies with
   `denied_unknown_action` — there is no default-allow branch.
4. **Ownership escalation.** For the five actions in
   `OWNERSHIP_ESCALATIONS` — `issue:update`, `issue:archive`,
   `comment:update`, `comment:delete`, `notification:manage` — `can()` grants
   with `granted_by_ownership` when `isOwnedByActor()` returns true (the
   actor is the issue's author or assignee, the comment's author, the
   project's lead, or the notification's recipient), even if the role check
   in step 3 failed.
5. Otherwise, `denied_by_role`.

`ROLE_MATRIX` declares the minimum role for all twenty-nine `PermissionAction`
values, from `org:read` (viewer) through `org:delete` and
`org:manage_billing` (owner). Nothing calls the database or an event handler
from inside this module — `can()` is a pure function over its three
arguments, which is what makes it trivially unit-testable and safe to call
from both server code and, via `explain()`'s reason codes, UI logic that only
needs to know whether to render a control, not whether to trust the result as
an authorization decision.

## Consequences

**What this buys the team.** Every authorization question in the product has
exactly one place to look, and exactly one place to change. When REQ-027
(platform staff bypass) was added in December, it was a five-line change in
one function, not a grep-and-patch across a dozen call sites. `explain()`'s
reason codes turned into a genuine product feature: the settings UI shows
"Requires admin" instead of just disabling a button, which was not in the
original spec but fell out of the design almost for free. The five-item
`OWNERSHIP_ESCALATIONS` set is small and reviewable, which matters because
getting it wrong in either direction is a security bug — REQ-072's carve-out
for authors and assignees editing issues they do not otherwise own by rank is
implemented by exactly one boolean lookup, not a scattered set of "or is this
their issue" checks.

**What it costs.** `PermissionResource` has to be a discriminated union
covering every resource kind (`issue`, `comment`, `project`, `notification`,
`member`, and the bare-org-scoped resources), and `isOwnedByActor()`'s
`switch` has to be extended every time a new resource kind gains an ownership
notion — forgetting a case silently falls through to `false`, denying
ownership rather than failing loudly, which is the safe default but has bitten
a feature branch once when a reviewer had to notice the missing case rather
than being told about it. The single-entry-point discipline also means
`can()` cannot express any authorization rule that depends on data it was not
handed — resource fields like `authorId` or `leadId` have to already be
loaded before the check runs, which occasionally means a repository call
purely to fetch fields for a permission decision that will otherwise be
thrown away. ADR-013 is the direct consequence of this ADR: because
authorization lives in one place and takes an already-loaded resource, it has
to live in the service layer, not the repository layer, which is why
repositories never call `can()`.

## Alternatives considered

**Per-resource guard clauses, one function per action** (e.g.
`assertCanUpdateIssue(actor, issue)`). This is closer to what the codebase
had organically grown before this ADR. Rejected because it does not
centralize the decision order — the cross-tenant guard, staff bypass, and
ownership escalation would each have to be re-implemented (or, worse,
inconsistently omitted) in every one of the dozens of guard functions a
twelve-table product needs.

**A policy/rule engine (attribute-based access control) with declarative
rules.** Considered and rejected as over-engineering for four fixed roles and
a bounded, closed set of actions; a rule engine's flexibility is not needed
when `ROLE_MATRIX` is a fully enumerable table, and it would have added a
dependency and a DSL to learn for a decision that a fifty-line
`Record<PermissionAction, Role>` expresses completely.

**Middleware-based authorization**, checking permissions in `src/proxy.ts`
before a request reaches a page or action. Rejected outright and noted
explicitly in that file's own comments: a proxy running before routing
cannot reach the database to load a resource's `orgId`, `authorId`, or
`leadId`, so it can answer "is there a session" but never "may this actor
archive this specific issue." ADR-007 covers what the proxy is responsible
for instead.

## References

- REQ-020 (four roles, strict rank order), REQ-021 (role rank drives default
  decision), REQ-022 (viewer read-only), REQ-026 (author/assignee ownership
  escalation), REQ-027 (platform staff bypass)
- ADR-013 (services own authorization, repositories own tenancy — the direct
  consequence of this ADR's decision order)
- ADR-014 (`PermissionDeniedError` mapped to the `forbidden` error code)
- Code: `src/lib/permissions.ts` (`can`, `explain`, `assertCan`, `canAll`,
  `ROLE_MATRIX`, `OWNERSHIP_ESCALATIONS`), `src/types/member.ts`
  (`ROLE_RANK`), `src/types/permission.ts`
