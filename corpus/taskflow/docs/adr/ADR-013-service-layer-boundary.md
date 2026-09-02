---
title: Services own authorization, repositories own tenancy
id: ADR-013
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2026-02-12
related: [REQ-010, REQ-011, REQ-020, ADR-003, ADR-006, ADR-001]
---

# ADR-013 — Services own authorization, repositories own tenancy

## Status

Accepted, with five explicitly documented and accepted exceptions carried in
the common brief for this corpus and repeated here for completeness (see
Consequences). The boundary itself has held since February 2026 without
further exceptions being added.

## Context

ADR-003 established that `can()` is the single authorization entry point,
and ADR-006 established that `assertOrgScope()` is the single tenancy guard.
Neither of those decisions, on their own, said which *layer* of the
application — page component, Server Action, service, or repository — is
responsible for calling them, and by early February 2026 the answer had
drifted: some Server Actions called `assertCan()` directly before invoking a
service; some services called it themselves; and one repository function
(an early draft of `webhookRepo.listEndpoints`) had grown an inline role
check because the engineer writing it wanted to filter out secrets for
non-admin callers at the query layer, which meant the repository — a layer
that, per ADR-006's own design, should only need to know about `orgId` — was
reasoning about `Role`.

Deji Okafor's concern, raised in a February architecture review, was that
without a fixed layer for each kind of check, every new repository function
would need its author to independently decide whether it needed an
authorization check, a tenancy check, both, or neither, with no consistent
answer to point to — exactly the ambiguity ADR-003 and ADR-006 were each
individually meant to eliminate, just recreated at the boundary between them.

## Decision

The service layer, in src/server/services/, is the only layer that calls
`can()` / `explain()` / `assertCan()` / `canAll()`. Repositories, in
src/server/repositories/, never call any of those functions — the
prohibition is explicit in `src/lib/permissions.ts`'s own module
documentation ("every Server Action, service method, Route Handler and
permission-sensitive UI component funnels through `can()`") and is enforced
by convention and review, the same way ADR-003's "no hand-written role
check" rule is. Repositories instead are the layer responsible for tenancy:
every repository query filters by `orgId` and calls `assertOrgScope()` (or
builds its filter via `withOrgScope()`) from ADR-006, but never asks "is this
actor allowed to see this," only "does this row belong to this org." A
repository function's signature typically takes an `orgId` or an already-
scoped filter object, not an `Actor` — a repository that needed the full
`Actor` type to do its job would be a signal that authorization logic had
leaked into it.

Server Actions, in src/actions/, are thin: they parse input through the
ADR-009 Zod schema, resolve the `Actor` from the session (ADR-020), and call
exactly one service method, wrapped by `withAction()`
(`src/actions/_lib/with-action.ts`) which turns a thrown domain error into
the `ActionResult` shape ADR-001 and ADR-014 describe. A Server Action does
not call `can()` directly and does not call a repository directly — in the
ordinary case. Services sit between: a service method receives the `Actor`,
calls `assertOrgScope()` first (tenancy: is this actor even allowed to be
asking about this org at all), then `assertCan()` (authorization: is this
specific action allowed for this specific resource), and only then calls
into one or more repository functions to actually read or write data. The
order matters and mirrors ADR-003's own decision order — tenancy is checked
before authorization, since an authorization decision about a resource in
the wrong tenant is meaningless.

## Consequences

**What this buys the team.** A reviewer looking at a new repository function
knows immediately what to look for: an `orgId` parameter and a tenancy
check, nothing else. A reviewer looking at a new service method knows to
look for both an `assertOrgScope` call and an `assertCan`/`can` call, in that
order, before any repository call. This predictability is what let the
February incident (the inline role check inside `webhookRepo.listEndpoints`)
get caught in review rather than shipped — once the boundary was written
down, "why is a repository checking `Role`" became an obvious review
question rather than a judgment call. It has also made testing more
targeted: repository tests (tests/repositories/) never need to construct a
fake `Actor` with a specific role, only an `orgId`, and service tests
(tests/services/) are where role- and ownership-sensitive behavior is
actually exercised, which keeps the two test suites from duplicating
coverage of the same logic at two layers.

**What it costs, including the five accepted exceptions.** The layering adds
one hop: a Server Action cannot shortcut to a repository even when the
authorization check would be trivial, which means even a simple
read — say, a settings page that just needs one row — goes through a full
service method. This was judged worth it uniformly, except in five places
the common brief for this documentation set records explicitly as
deliberate, accepted layering violations, not oversights:
`src/actions/profile/update-profile.ts`,
`src/app/(dashboard)/[orgSlug]/profile/page.tsx`,
`src/app/(dashboard)/[orgSlug]/settings/members/invitations/page.tsx`,
`src/app/(dashboard)/[orgSlug]/settings/notifications/page.tsx`, and
`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx`
all call repositories directly, bypassing the service layer, in each case
for a read that is scoped entirely to the acting user's own data (their own
profile, their own pending invitations, their own notification preferences,
or a single issue detail render where the page itself performs the
permission check inline before rendering). The team's judgment was that
adding a full service method for a single-row, self-scoped read was
ceremony without safety benefit, since there is no meaningfully different
authorization decision to make beyond "is this your own data" — but this
list is treated as closed, not as precedent, and a sixth exception requires
the same explicit sign-off the original five got, not a quiet copy-paste of
the pattern. A related, adjacent gap: `src/server/services/auth-service.ts`
documents that it needs to call `emit()` (to publish login/logout as domain
events other services could react to) but cannot, because `TaskflowEventMap`
in ADR-005 has no auth-related event keys defined — a known omission, not
resolved by this ADR, that means auth actions are invisible to the audit
trail (ADR-022) and to any future auth-triggered notification, until
`TaskflowEventMap` is extended.

## Alternatives considered

**Authorization and tenancy both enforced only in Server Actions**, treating
services and repositories as trusted internal code with no independent
checks. Rejected as a defense-in-depth failure: a service method called from
two different Server Actions, one of which forgot its check, would have no
second line of defense. Requiring the check at the service layer means every
caller of that service method, present and future, inherits the guarantee.

**Push both authorization and tenancy down into the repository layer**,
where the actual query runs. Rejected because authorization decisions
(`can()`) frequently need data that has not been loaded yet at query time —
an ownership escalation check (ADR-003) needs to know an issue's `authorId`
and `assigneeId` before deciding whether to grant access, which means the
row has to be fetched first, by the repository, before the authorization
decision can even be evaluated. Repositories authorizing their own results
would require fetching, deciding, and potentially re-fetching, an awkward
inversion of the natural "check first, then act" flow that fits comfortably
in the service layer instead.

**No fixed layer, decided case by case per feature.** This is what the
codebase had before this ADR, and it is exactly what produced the drift this
ADR was written to end.

## References

- REQ-010, REQ-011 (tenancy — enforced at the repository layer per this
  ADR), REQ-020 (role rank — enforced at the service layer per this ADR)
- ADR-003 (`can()` as the single authorization entry point — this ADR fixes
  which layer calls it), ADR-006 (`assertOrgScope()` as the single tenancy
  guard — this ADR fixes which layer calls it), ADR-001 (Server Actions as
  the thin caller layer this ADR keeps thin)
- Code: `src/actions/_lib/with-action.ts`,
  `src/server/services/activity-service.ts` (a service that calls
  `assertOrgScope` then `assertCan` before any repository call),
  `src/server/services/auth-service.ts` (the documented auth-events gap),
  `src/actions/profile/update-profile.ts`,
  `src/app/(dashboard)/[orgSlug]/profile/page.tsx` (accepted layering
  exceptions)
