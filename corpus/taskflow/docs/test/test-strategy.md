---
title: Test strategy
id: TEST-STRATEGY
status: approved
owners: [h.iqbal, d.okafor]
last_updated: 2026-08-14
related: [ADR-002, ADR-013, DES-012, DES-013, REQ-011]
---

## The pyramid as it actually is, not as the textbook draws it

Taskflow's suite is heavy at the bottom, thick through the middle and deliberately thin at
the top. By file count: 22 files under tests/lib/, 6 under tests/schemas/, 2 under
tests/config/ — pure-function and pure-schema coverage with no database — against 10 files
under tests/services/, 3 under tests/repositories/, 10 under tests/server/, 2 under
tests/jobs/ and 1 under tests/emails/ that do touch a real (in-memory or temp-file)
SQLite database. Above that: 13 files under tests/components/, 4 under tests/ui/ — a
component or hook layer test, mostly rendering-free logic extracted out of components rather
than full DOM assertions. Above that there is nothing. No end-to-end layer exists in this
repository: no Playwright, no route-handler integration test that starts a real Next.js
server and issues HTTP requests, no browser automation of any kind.

That shape is a direct consequence of two things the design docs establish and this suite
takes as given. First, src/server/services/ is where authorization and business rules
live (`DES-012`), so a service test that asserts a `PermissionDeniedError` or a
`TenantScopeError` is asserting something an end-to-end click-through test would only ever
assert indirectly and far more slowly. Second, src/server/repositories/ deliberately
performs no authorization of its own (`DES-013`) — repository tests exist to pin the one
thing repositories are responsible for: filtering by `orgId` and by `archived_at`. The
repository suite (`tests/repositories/issue-repository.test.ts`,
`tests/repositories/comment-repository.test.ts`,
`tests/repositories/project-repository.test.ts`) includes an explicit negative assertion of
that boundary — `tests/repositories/issue-repository.test.ts` spies on `can` and
`assertCan` from `@/lib/permissions` and asserts neither is called by a repository read,
which is the test-suite's own enforcement of the layering rule in `DES-013` rather than a
comment asking a reviewer to remember it.

The heavy investment in `tests/lib/permissions.matrix.test.ts` — which sweeps every action
in `ROLE_MATRIX` against every role in `ROLES`, asserting `can()` matches
`ROLE_RANK[role] >= ROLE_RANK[required]` for each pair — exists because that single test
function is cheaper to keep exhaustive than any number of hand-picked service-level cases
would be to keep in sync with the matrix. When an engineer adds a new permission action to
`ROLE_MATRIX` in `src/lib/permissions.ts`, this test starts covering it automatically
(`ACTIONS` is derived from `Object.keys(ROLE_MATRIX)`, not hand-listed), while
`tests/server/permissions.test.ts` covers the narrower, sharper question of whether each
mutating service actually calls into `can()` at all — a Viewer actor is used as the
canonical "may read everything, change nothing" probe across
`comment-service`, `invitation-service`, `issue-service`, `member-service` and
`project-service`.

## Why there is no end-to-end layer

The team's stated reasoning (recorded because a newcomer reliably asks): Server Actions in
src/actions/ are thin, validate-and-dispatch shims by design (`DES-011`) — they call
`safeParse`, resolve an `Actor`, and delegate to exactly one service function. An end-to-end
test that submits a form and checks a resulting database row would, in this codebase, mostly
be re-testing the service layer through several additional layers of indirection and
Next.js's own request machinery. The suite chooses instead to test the service layer
directly against a real database (see `service-and-repository-tests.md`) and to leave the
action layer's own thin logic — schema parsing, Actor resolution order documented in
`DES-221`, `stamp()` from `DES-223` — implicitly covered by the schema tests in
tests/schemas/ and manually verified rather than automated. This is a real gap, not a
theoretical one: it means a bug introduced only in an action file's dispatch logic, and
nowhere in the service it calls, can reach production without a failing test. It is recorded
honestly in `traceability-req-to-test.md` rather than glossed over.

## The contract tests: pinning the frozen layer

tests/contract/ is a distinct kind of suite from everything else and deserves separate
billing. `tests/contract/permissions.test.ts`, `tests/contract/plan-limits.test.ts` and
`tests/contract/slug.test.ts` do not exist to catch regressions during ordinary feature work
— `tests/lib/permissions.matrix.test.ts`, `tests/config/plan-limits.test.ts` and
`tests/lib/slug.test.ts` already do that, with fuller coverage. The contract suite exists to
independently re-derive, from first principles and without importing the production test
helpers, that the exported shape of `@/lib/permissions`, `@/config/plan-limits` and
`@/lib/slug` matches what the rest of the corpus (requirements, design docs, ADRs) assumes
about them. `tests/contract/permissions.test.ts` builds its own `actor()` and resource
helpers rather than importing `tests/helpers/factories.ts`, and it closes with a
"fixture ids" block that validates its own hand-written ULID constants against
`orgIdSchema` / `userIdSchema` / `projectIdSchema` / `issueIdSchema` / `commentIdSchema` from
`@/schemas/common` — the comment in that file explains why: the ids are declared with `as`
casts that skip runtime validation, so a fixture that drifted outside Crockford base32 (no
I, L, O, U) would keep passing every permission assertion while every real schema in
src/schemas/ would reject the same string. If someone changes the shape of
`PermissionResource`, `PLAN_LIMITS`, or the exported surface of `@/lib/slug` without meaning
to — a refactor that happens to also change behavior — the contract suite is the tripwire
that is least likely to have been refactored in the same change, because it deliberately
avoids sharing code with the suites next to it.

`tests/contract/plan-limits.test.ts` similarly re-derives the full set of numeric resources
(`seats`, `projects`, `issuesPerProject`, `storageMb`, `apiRequestsPerHour`, `webhooks`) and
walks `PLAN_ORDER`, `getLimit`, `getPlanLimits`, `planAtLeast` and `wouldExceedLimit`
directly against `PLAN_IDS` from `@/types/billing`, which is the type-level enumeration of
plans rather than the config-level one — so a plan added to one and not the other fails
here even if `tests/config/plan-limits.test.ts` happens not to have been extended to notice.

## What is deliberately not tested

Three categories, named rather than left implicit:

- **The database engine itself.** `better-sqlite3`'s own correctness, Drizzle's SQL
  generation, and SQLite's foreign-key enforcement are treated as trusted dependencies.
  Tests seed data through real repository calls and real migrations (`runMigrations` in
  `tests/helpers/db.ts` and `tests/server/_support/fixtures.ts`) rather than mocking the
  database layer, per `ADR-002`'s choice of Drizzle over SQLite, but nothing in the suite
  asserts that SQLite itself behaves correctly.
- **Real network egress.** `sendEmail` is stubbed with `vi.spyOn` in every job and service
  test that would otherwise trigger it (see `tests/jobs/digest-email-job.test.ts`), and
  `tests/emails/render.test.ts` documents in its own suite that email delivery is a
  structured log write, not a real SMTP call — there is nothing to fake past that boundary
  because production itself does not cross it.
- **Wall-clock time.** Every test that depends on "now" either passes an explicit `Date`
  argument to the function under test (`runDigestEmailJob(now)`,
  `runOverdueIssueJob`) or uses `vi.useFakeTimers()` / `vi.setSystemTime()` with a fixed
  instant, always restored in `afterEach` with `vi.useRealTimers()`. No test in the suite
  is allowed to depend on the actual system clock at run time; a test that did would be
  intermittently flaky in exactly the way this discipline exists to prevent.

## The four gates and what each one catches

A change is not considered green until all four pass, run in this order for the fastest
feedback on the cheapest failure first:

1. **`pnpm typecheck`** (`tsc --noEmit`) catches type drift that a passing test would not
   necessarily reach — a branded id (`ADR-015`) passed where a different branded id was
   expected, an exhaustiveness switch missing a newly added `IssueStatus` variant, a
   `PermissionResource` discriminant used without narrowing. Tests written with loose `any`
   escapes would sail past `pnpm test` while failing here.
2. **`pnpm lint`** (`eslint`) catches import-direction violations — the module-map's
   convention-not-tooling boundary between lib/, server/ and the client bundle — and
   React hook-rule violations, which is why `tests/helpers/db.ts` aliases
   `useInMemoryDb` to `attachInMemoryDb` on import: unaliased, the `use`-prefixed name reads
   to the react-hooks lint rule as a hook.
3. **`pnpm test`** (`vitest run`) is what this whole directory documents: the 617 assertions
   described in the four sibling files.
4. **`pnpm build`** (`next build`) catches anything only the production bundler and Next.js's
   own static analysis surface — a Server Action missing `"use server"`, a client component
   importing something from src/server/ that can never reach the client bundle
   (`DES-003`), a parallel-route slot missing its `default.tsx` (a Next.js 16 requirement
   noted in the module map). None of the four gates subsumes another; a red `pnpm test` next
   to a green `pnpm build` is common during active development, but a shipped change needs
   all four green, and `index.md`'s gate table is the quick-reference version of this
   section.

## Consequence: what "green" means for this repository

Because the suite has no end-to-end layer, a fully green `pnpm test` run is evidence that
every unit, schema, service-authorization rule, repository tenancy filter and background job
behaves as its test describes — it is not evidence that a user can actually complete a
task through the rendered UI, because nothing in tests/components/ or tests/ui/ mounts
a full page or drives a real interaction sequence end to end (see
`component-and-ui-tests.md` for what that layer does cover). Teams relying on this suite as
a merge gate should read that as a real boundary of confidence, not a formality: the
requirement catalogue in docs/requirements/ and the traceability matrix in
`traceability-req-to-test.md` are the places to check whether a specific requirement's
behavior is actually pinned by a test before assuming it is.

## Test doubles: what is mocked, and the discipline around it

The suite mocks exactly two things, and both are named consistently across every file that
needs them, via `tests/server/_support/doubles/id.ts` and `tests/server/_support/doubles/
misc.ts`. `@/lib/id` is swapped for a deterministic generator in any suite that asserts on an
inserted row's id, because a random ULID would make an equality assertion on a returned row
brittle for no reason — the double exists purely for test ergonomics, not because the real id
generator is slow, external, or otherwise unsuitable for a real test. `@/lib/logger` is
swapped for a no-op-with-inspection double in nearly every database-backed suite, because the
real logger writes structured JSON to `console` on every warn or error path, and a suite
running 617 assertions would otherwise produce an unreadable wall of log lines on every run.
`@/lib/rate-limit` is mocked only in the handful of suites that need to force a specific
verdict deterministically — `comment-service`, `invitation-service`, `search-service`, and
the server-level plan-limits suite — and everywhere else in the corpus the real token-bucket
implementation runs, because most tests actually want realistic rate-limit behavior rather
than a stubbed one. No suite mocks a repository, a service, or the database itself: the
database-backed tests documented in `service-and-repository-tests.md` run against a real
SQLite file or in-memory database end to end, which is a deliberate trade of raw speed
(mocking every repository call would run faster) for the much higher confidence that a real
insert, a real `WHERE org_id = ?` filter, and a real migration all actually behave as the
production code path behaves. This is the same trade-off `ADR-002` makes when choosing
Drizzle over an ORM with more magic: the corpus consistently favors tests that exercise real
code over tests that exercise a model of that code.

## Adding a test to an existing file versus a new one

A rule of thumb this repository's history bears out: if a change adds a new exported
function to an existing src/lib/, src/schemas/, src/server/services/ or
src/server/repositories/ module, its test belongs in that module's existing test file,
appended as a new `describe` block or a new `it` inside the existing one — not a new file.
A new file is warranted only when an entire new domain module is introduced (a new service,
a new repository, a new job kind), mirroring the one-file-per-module convention the whole
suite already follows. This keeps the file-count-to-source-count ratio meaningful as a rough
coverage signal — a src/server/services/ directory with twelve modules and a
tests/services/ directory with ten files is a visible, three-second signal that two
services are missing dedicated coverage, which is exactly the situation `traceability-req-
to-test.md` documents for webhooks, auth and sessions.
