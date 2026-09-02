---
title: Carry org_id on every tenant table
id: ADR-006
status: accepted
owners: [platform-team]
last_updated: 2025-12-09
related: [REQ-010, REQ-011, ADR-002, ADR-013, ADR-015]
---

# ADR-006 — Carry org_id on every tenant table

## Status

Accepted, and treated internally as close to non-negotiable: it is the one
schema convention that shows up in the platform team's onboarding checklist
as "will fail review, no exceptions," rather than as a preference.

## Context

Taskflow is multi-tenant B2B software where every organization's data must be
completely invisible to every other organization — projects, issues,
comments, members, webhooks, and the audit trail all belong to exactly one
org, and there is no legitimate cross-org read anywhere in the product except
the platform-staff support bypass in `can()` (ADR-003), which is an
authorization decision, not a data-scoping one. A tenant-isolation failure in
software like this is not a minor bug; it is a customer-visible confidentiality
breach and the kind of incident that ends contracts.

Early in schema design (late November 2025), the team looked at two shapes
for expressing this: scoping tenancy implicitly through a join (an issue
belongs to a project, which belongs to an org, so "which org is this issue
in" is always derivable by joining up the hierarchy), or scoping it
explicitly by storing `org_id` directly on every table that holds
tenant-owned data, even tables like `issues` and `comments` that also carry a
more specific parent foreign key (`project_id`, `issue_id`).

The implicit-join approach was rejected specifically because every query that
needs to enforce tenant scope would need to know, and correctly write, the
join path to the org for that particular table — a three-hop join for a
comment (comment → issue → project → org), a two-hop join for an issue
(issue → project → org). Getting that join right, every time, in every
repository function, forever, was judged an unacceptable amount of surface
area for the single most safety-critical invariant in the product. A missing
or wrong join predicate is exactly the kind of mistake that fails silently in
development (where test data often has only one organization) and shows up
in production as a cross-tenant leak.

## Decision

Every table that holds data belonging to a specific organization carries an
`org_id` column directly, regardless of how many levels of foreign key
hierarchy separate it from the `organizations` table. This is declared once,
as a reusable column pattern in `src/server/db/schema/_shared.ts` (alongside
the `archived_at` soft-delete pattern from ADR-004), and composed into each
domain table's schema in src/server/db/schema/ — `issues.ts`, `comments.ts`,
`projects.ts`, `members.ts`, `notifications.ts`, `activity.ts`, `webhooks.ts`,
and `billing.ts` all carry it, even though `comments` also has an `issue_id`
and `issues` also has a `project_id`.

At the code level, the convention is enforced by `src/lib/tenant.ts`, not by
foreign-key constraints alone:

- `assertOrgScope(actor, orgId)` throws `TenantScopeError` unless `orgId`
  equals `actor.orgId` — the guard every repository query and every service
  method calls before touching a specific org's data (REQ-011).
- `assertRowsInScope(actor, rows)` re-checks a whole result set, used after a
  repository call returns rows that must all belong to the actor's org.
- `isInOrgScope(actor, row)` / `scopedOrNull(actor, row)` are the
  non-throwing predicate and Option-like variants, used for filtering rather
  than failing.
- `withOrgScope(actor, filter)` wraps an arbitrary filter object with the
  actor's `orgId`, spreading the caller's filter first so a repository query
  builder cannot forget to add the tenant predicate — the module's own
  documentation calls a hand-written
  `if (row.orgId !== actor.orgId)` a review failure, in the same language
  ADR-003 uses for hand-written role checks.

Repositories filter every list and lookup query by `orgId` directly against
the column, never by walking a join path to derive it, and — per ADR-013 —
repositories are also the layer where this specific check belongs;
authorization (`can()`) is a separate concern handled one layer up, in
services.

## Consequences

**What this buys the team.** Every table's tenant ownership is answerable
with one column read, with no join required and therefore no join to get
wrong. `assertOrgScope()` and its siblings give the codebase one grep target
for "does this code path check tenancy": REQ-011's requirement that
cross-tenant access attempts fail closed and are recorded is satisfiable by
confirming every repository function calls `assertOrgScope` or filters by
`withOrgScope`, rather than auditing join conditions table by table. It also
made the branded-id decision in ADR-015 more valuable than it would otherwise
be: an `OrgId` passed to `assertOrgScope` cannot be confused, at the type
level, with a `ProjectId` that happens to be the same ULID shape, which
closes off one class of "passed the wrong id" bug that a plain-string
approach would leave open.

**What it costs.** Denormalization is the honest cost: `org_id` is
redundant data on `issues` and `comments` given that it is derivable from
`project_id` and `issue_id` respectively, and that redundancy has to stay
correct. Concretely, moving an issue between projects (REQ-076, issue
renumbering on project move) has to update `org_id` too if the move ever
crossed an organization boundary — in practice it cannot, because project
selection UI only ever offers projects within the actor's current org, but
the repository function that performs the move still writes `org_id`
explicitly on every affected row rather than relying on it having been
correct already, precisely because the team does not want that invariant's
safety to depend on an assumption holding upstream. Every new migration that
adds a tenant-scoped table has one more mandatory column and one more mandatory
index (`org_id` is indexed on every such table, since it is the leading
predicate on nearly every query against that table) — a small, fixed tax
paid on every schema change, accepted because the alternative tax (auditing
join correctness forever) was judged larger and, worse, invisible until it
fails.

## Alternatives considered

**Implicit tenancy via join path only**, with no `org_id` stored below the
top-level owning table. Rejected as described in Context: it makes tenant
isolation a property of every join being written correctly, forever, rather
than a property of one column and one guard function.

**Row-level security enforced at the SQLite layer.** SQLite has no native
row-level security comparable to, say, Postgres policies; simulating it with
views or triggers was considered and rejected as significantly more complex
than an application-layer guard, for a database engine that was never
designed for that pattern, and for a single-process application where the
application layer is trusted code, not an untrusted client directly querying
the database.

**Deriving tenancy from the session/request context implicitly** (a
thread-local or async-local "current org" that queries consult automatically,
without a repository function ever seeing `orgId` as an explicit argument).
Rejected because it hides the tenant check rather than making it visible in
every function signature — a reviewer looking at
`findIssueById(orgId, issueId)` can see the scoping is happening; a reviewer
looking at `findIssueById(issueId)` with implicit ambient scoping has to trust
that the ambient context was set correctly somewhere upstream, which is
exactly the kind of invisible invariant this ADR is designed to avoid.

## References

- REQ-010 (every tenant-scoped row carries `org_id`), REQ-011 (cross-tenant
  access attempts fail closed and are recorded)
- ADR-002 (Drizzle schema layout `org_id` is composed into via
  `_shared.ts`), ADR-013 (repositories own tenancy, services own
  authorization — the layering this ADR's guard functions live inside),
  ADR-015 (branded ids, which make an `OrgId` argument to `assertOrgScope`
  distinct at the type level from any other id)
- Code: `src/lib/tenant.ts` (`assertOrgScope`, `assertRowsInScope`,
  `isInOrgScope`, `scopedOrNull`, `withOrgScope`, `TenantScopeError`),
  `src/server/db/schema/_shared.ts`, `src/server/db/schema/issues.ts`,
  `src/server/db/schema/comments.ts`
