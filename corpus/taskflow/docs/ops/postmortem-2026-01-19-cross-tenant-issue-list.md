---
title: Postmortem — cross-tenant issue list leak
id: OPS-PM-2026-01-19
status: approved
owners: [m.lindqvist, j.novak]
last_updated: 2026-01-24
related: [REQ-010, REQ-011, DES-030, DES-031, DES-033, ADR-006]
---

## Summary

On 2026-01-19, a support engineer investigating a slow issue-list page for Northwind
Labs (`org: northwind`) discovered that the returned rows included issues belonging to
Acme Robotics (`org: acme`) — a different tenant entirely. The leak was traced to a
temporary diagnostic script that a platform engineer had added to
`src/server/repositories/issue-repository.ts` two days earlier while investigating an
unrelated performance question, and which called the underlying query builder directly
instead of going through `listIssues`. The script bypassed the `orgId` predicate that
every other call site relies on, and — critically — was left registered behind a
debug-only route that was not supposed to be reachable outside a local environment but
was reachable in the staging deployment used for the support engineer's investigation.
No production customer data was exposed; this occurred entirely in the shared staging
environment, which nonetheless holds realistic-looking multi-tenant fixture data close
enough to production shape that the leak was immediately recognizable as serious.

## Impact

- Zero production organizations affected. Staging only.
- One staging environment showed cross-tenant issue rows for approximately 6 hours
  before detection.
- No customer-reported impact; internal discovery.
- Engineering time: roughly one day across two engineers for root cause and remediation,
  plus a same-day review of every other repository module for the same pattern.

## Timeline

| time (UTC) | event |
|---|---|
| 2026-01-17 14:10 | Platform engineer adds a temporary debug script to investigate a slow issue-list query, calling the query builder directly rather than `issueRepo.listIssues` |
| 2026-01-17 14:40 | Debug script wired to a route intended for local-only use; deployed to staging as part of an unrelated batch deploy |
| 2026-01-19 09:55 | Support engineer uses the debug route while reproducing a customer-reported slowness ticket against staging fixture data |
| 2026-01-19 10:02 | Support engineer notices issue titles from Acme Robotics appearing in a Northwind-scoped page and immediately flags `#incident` |
| 2026-01-19 10:15 | `j.novak` confirms the debug route is staging-only and pulls the deploy that introduced it |
| 2026-01-19 10:40 | Root cause identified: the debug script's query bypassed `assertOrgScope` entirely, calling Drizzle's query builder without an `orgId` filter |
| 2026-01-19 11:30 | Debug route and script removed; staging redeployed from the prior known-good commit |
| 2026-01-19 13:00 | `m.lindqvist` audits every repository module under src/server/repositories/ for any other call site that constructs a query without going through a scoped helper |
| 2026-01-19 16:00 | Audit complete; no other instance found. Incident closed |
| 2026-01-24 | Postmortem published; action items filed |

## Root cause

`src/server/repositories/issue-repository.ts`'s `listIssues` function is the sanctioned
entry point for reading issues, and — like every other repository in Taskflow — is
supposed to filter by `orgId` on every query, never calling `can()` and never trusting a
caller to have already scoped the request (`DES-033`). The debug script bypassed
`listIssues` entirely and issued its own query against the same table, omitting the
`orgId` predicate that `ADR-006` requires on every tenant table access. Because the
script ran inside the same process and shared the same database connection as the real
application code, nothing in the request path caught the omission — there is no
database-level row-security layer enforcing `org_id` filtering independently of
application code; `DES-030` states plainly that `org_id` on every tenant table is the
tenant boundary "full stop," which also means the boundary lives entirely in
disciplined, reviewed code, not in a backstop the database itself enforces. A
hand-written query that skips the helper is, by that same design, unprotected.

Secondarily, `assertOrgScope()` (`src/lib/tenant.ts`, `DES-031`) is only useful at the
service layer, where a resolved `Actor` and the target `orgId` are both in hand — it has
no way to intercept a repository-level query that never reaches it. The debug script sat
below the service layer, so this guard was structurally unable to catch the mistake.
Both failures point at the same root cause: a script that was written for a
diagnostic purpose reused production code paths' table access without reusing their
scoping discipline, and was reachable from a route that should never have shipped to any
deployed environment.

## Detection

Detection was manual and accidental — a support engineer noticed unfamiliar issue
titles while looking at a slow-loading page, not through any automated tenant-isolation
check. Taskflow has no runtime assertion that a repository's return set is homogeneous
by `orgId` before it reaches a caller; `assertRowsInScope()` exists in `lib/tenant.ts`
for exactly this purpose but is opt-in, called by services that choose to defend against
exactly this class of bug, not universally enforced.

## Resolution

1. The debug script and its route were deleted outright, not disabled — a disabled
   route with the same code intact was judged too easy to accidentally re-enable.
2. `m.lindqvist` audited every file under src/server/repositories/ for any query
   construction that did not go through `withOrgScope` or an equivalent scoped
   filter, and confirmed no other instance existed.
3. Staging was redeployed from the last commit before the debug script was introduced.
4. A note was added to the platform team's review checklist: any repository-adjacent
   script, even a temporary one, must call the exported repository functions, never the
   underlying query builder directly — see the action items below for how this became
   more than a checklist entry.

## What went well / what did not

**What went well:**
- Detection, even though accidental, happened same-day, and the person who noticed
  escalated immediately rather than assuming it was expected fixture overlap.
- The blast radius was correctly and quickly confirmed to be staging-only; no
  customer-facing incident communication was needed.
- The audit of every repository module for the same pattern was thorough and completed
  the same day, giving real confidence the issue was isolated to one script.

**What did not go well:**
- A temporary diagnostic script reached a deployed environment at all. There was no
  gate — code review, lint rule, or deployment check — that would have caught a
  repository-shaped file bypassing the repository layer's own conventions.
- The debug route had no environment guard beyond an assumption ("this is only reachable
  locally") that turned out to be false in the actual staging configuration.
- Nothing in the codebase would have caught this automatically even with careful code
  review, because `assertRowsInScope` is opt-in per caller rather than a default applied
  to every repository return value.

## Action items

| action | owner | status |
|---|---|---|
| Add a lint rule flagging any file outside src/server/repositories/ and src/server/db/ that imports the Drizzle query builder directly | d.okafor | done |
| Require any temporary or diagnostic route to be gated behind an environment check enforced in `src/proxy.ts`, not left to convention (relates `REQ-212`) | j.novak | done |
| Evaluate making `assertRowsInScope` (`DES-031`) the default behavior of `listIssues` and its siblings rather than an opt-in caller responsibility | m.lindqvist | in_review |
| Document the incident and the resulting lint rule in the tenant isolation design doc | m.lindqvist | done |
| Add an automated staging smoke test that seeds two organizations and asserts a cross-org query returns zero rows through every list endpoint (relates `REQ-011`) | h.iqbal | in_progress |

## Follow-up: why this could not have happened through a normal service call

It is worth being precise about why this required a script that bypassed the repository
layer, rather than being reachable through any ordinary code path, because the incident
prompted more than one anxious question about whether `issue-service.ts` itself could
leak cross-tenant data under some edge case. It cannot, by construction, as long as
callers follow the layering `DES-012` and `DES-013` describe: every service function
that reads issues takes an `Actor` and either calls `can()` against that actor's own
`orgId` before touching the repository, or passes the actor's `orgId` into the
repository call so the query itself is scoped from the start. `assertOrgScope()` in
`src/lib/tenant.ts` is called at the service boundary specifically so a service can never
forward a request-supplied `orgId` that disagrees with the actor's own organization —
this is the mechanism `REQ-011` describes as "cross-tenant access attempts fail closed."
The debug script had none of this because it had no `Actor` at all; it queried the table
directly with a hardcoded test value that happened to omit the filter entirely. This is
precisely why the audit in the Resolution section focused on finding any other file that
constructs a query the same low-level way, rather than re-auditing `issue-service.ts`
itself, which was never implicated.

A secondary question raised during the retro was whether Drizzle's query builder could
be wrapped so that a query missing an `orgId` predicate on a tenant table fails to
construct at the type level, rather than relying on code review and the lint rule added
as an action item to catch it. That proposal was judged too large a change to take on
immediately — it would touch every repository module — and was instead logged as a
candidate topic for a future architecture review rather than an action item on this
incident specifically.

## Related

- Code: `src/server/repositories/issue-repository.ts`, `src/lib/tenant.ts`,
  `src/proxy.ts`
- Ids: `REQ-010`, `REQ-011`, `REQ-212`, `DES-030`, `DES-031`, `DES-033`, `DES-037`,
  `ADR-006`, `ADR-007`
- See also: `runbook-scheduler-and-queue.md` (unrelated system, cited here only because
  the same on-call rotation covers both)
