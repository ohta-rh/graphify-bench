---
title: Service and repository tests
id: TEST-SERVICE-REPO
status: approved
owners: [platform-team, m.lindqvist, r.saito]
last_updated: 2026-08-14
related: [DES-012, DES-013, DES-030, ADR-006, REQ-011]
---

## Scope and shared fixtures

This file covers the 26 files that run against a real database: 10 under
tests/services/, 3 under tests/repositories/, 10 under tests/server/, 2 under
tests/jobs/ and 1 under tests/emails/. Two fixture layers feed all of them.
`tests/helpers/db.ts` and `tests/helpers/factories.ts` (covered in
`component-and-ui-tests.md`, since their nearest other consumers are the component suites)
provide an in-memory SQLite database and plain-object factories. A second, parallel fixture
layer lives at `tests/server/_support/fixtures.ts`, `tests/server/_support/doubles/id.ts`
and `tests/server/_support/doubles/misc.ts`, and it is what every file under
tests/services/, tests/repositories/, tests/server/ and tests/jobs/ actually imports.

`tests/server/_support/fixtures.ts` is deliberately kept apart from tests/helpers/ — its
own header comment says so — because it needs a real file-backed SQLite database rather than
an in-memory one: `runMigrations` and the application's own database client open separate
connections, and only a file path is shared between the two. Its `useTemporaryDatabase()`
creates a fresh temp directory per suite (`mkdtempSync` under the OS temp dir), points
`process.env.TASKFLOW_DB_PATH` at it, migrates it, and returns a cleanup function removing
the directory — called from `beforeAll`/`afterAll` in every consuming file. Its
`createTenant(slug, plan)` builds one organization with a member in every one of the four
roles (`owner`, `admin`, `member`, `viewer`) plus a single project, entirely through real
repository calls (`userRepo.insertUser`, `orgRepo.insertOrg`,
`subscriptionRepo.insertSubscription`, `memberRepo.insertMember`,
`projectRepo.insertProject`) so the rows under test are the same shape production writes —
not a hand-assembled object that happens to satisfy a type. It returns both `actors`
(an `Actor` per role, ready to pass into a service call) and `userIds`. Its `issueInput()`
helper returns a minimal `CreateIssueInput` with the schema's own defaults already applied,
saving every issue-creation test from repeating them.

`tests/server/_support/doubles/id.ts` supplies a deterministic id generator so assertions on
inserted rows do not have to tolerate a random ULID, and `tests/server/_support/doubles/
misc.ts` exports a `loggerModule` double (nearly every file in this group mocks
`@/lib/logger` with it, since the real logger's `console` calls would otherwise pollute test
output) and a `rateLimitModule` double with an inspectable `rateLimitState`, used by suites
that need to force a specific rate-limit verdict — `comment-service`, `invitation-service`,
`search-service` and the server-level `plan-limits` suite all reach for it rather than
draining a real bucket through many calls, and `tests/server/plan-limits.test.ts`'s own
header comment explains why: the seat-quota refusal case has to be provably about seats and
not about a bucket a previous case happened to drain, and the throttling case needs a
guaranteed denial rather than a probabilistic one.

## tests/services/ — business rules and authorization

Ten files, each named for the service it covers, and each following the same shape: create a
tenant, exercise the service function as an `Actor` would call it, and assert on the
returned value, the resulting row, and any event published to the bus.

`tests/services/issue-service.test.ts` is the anchor example, covered in more depth as a
worked case in `test-strategy.md`'s ownership discussion; its scope sibling,
`tests/services/issue-service.scope.test.ts`, is entirely about the cross-tenant case —
described further below. `tests/services/project-service.test.ts` covers project quota
enforcement, `suggestProjectSlug`'s uniqueness suffixing, and the archive cascade
(`DES-111`) — archiving a project with `archiveIssues: true` archives its open issues in
the same call, and the cascade count travels in the emitted event.
`tests/services/comment-service.test.ts` covers comment authoring, the fifteen-minute
self-edit window (`DES-117`), and soft delete. `tests/services/member-service.test.ts`
covers role changes and the last-owner invariant — `assertLastOwnerRetained` from
`DES-144` is exercised indirectly here through `member-service`'s own call into it, refusing
both a demotion and a removal of the sole remaining owner identically.
`tests/services/invitation-service.test.ts` covers seat quota enforcement (pending
invitations count as provisional seats, per `DES-146`) and invite rate limiting, using the
`rateLimitModule` double to force the throttled case deterministically.
`tests/services/billing-service.test.ts` covers `checkLimit` arithmetic and downgrade
refusal — a plan change that would immediately violate the target plan's own limits is
rejected before the plan row changes (`DES-136`). `tests/services/notification-service.
test.ts` covers fan-out honoring per-channel preferences and the `digestOnly` flag.
`tests/services/activity-service.test.ts` covers one audit row written per domain event and
day-grouping of the resulting feed; its `vi.mock` of `@/server/repositories/activity-
repository` wraps `insertActivity` in a spy (via `importOriginal`) rather than replacing it,
so the test can assert on call counts while the real insert still executes and the row is
still there to query afterward. `tests/services/search-service.test.ts` covers index
maintenance triggered by issue and comment writes — the event-driven indexing behavior
`DES-158` describes as re-reading the row rather than trusting the event payload.

`tests/services/issue-service.scope.test.ts` deserves separate mention because it is the
clearest single file demonstrating `REQ-011`'s "cross-tenant access attempts fail closed"
requirement end to end at the service boundary. It seeds two named tenants, `north` and
`acme`, each with one issue, and asserts: a read across tenants throws `TenantScopeError`
even when the reading actor is the *other* org's owner (ownership inside your own tenant
does not grant a peek into someone else's); `listIssues` scoped to `north` never returns
`acme`'s issue by title; and a cross-tenant `updateIssue` call maps specifically to the
`tenant_scope_violation` error code, not merely to some generic failure.

## tests/repositories/ — tenancy filtering, nothing else

Three files. `tests/repositories/issue-repository.test.ts` is the fullest: beyond excluding
another tenant's issues from every list query and returning `null` (not throwing) for a
cross-tenant id lookup, it covers archived-issue visibility toggling via `includeArchived`,
combined status/priority/assignee/label filtering, keyset-cursor pagination (asserting a
`nextCursor` progression across pages that together account for every seeded row exactly
once), and — the test named directly in `test-strategy.md`'s discussion of the
service/repository boundary — a `vi.spyOn` assertion that neither `can()` nor `assertCan()`
from `@/lib/permissions` is ever called by a repository read. `tests/repositories/comment-
repository.test.ts` covers thread assembly and the visibility of soft-deleted rows within a
thread (`DES-186`: archived replies stay in a thread so it never loses its anchor point).
`tests/repositories/project-repository.test.ts` covers slug uniqueness and the archive/
restore round trip, including that a restore does not silently collide with a slug taken
while the project was archived (`DES-190`: uniqueness scans include archived rows).

## tests/server/ — cross-cutting invariants above a single module

Ten files, each pinning an invariant that spans more than one service or repository, which
is why they live at tests/server/ rather than nested under a single owner's directory.
`tests/server/tenant-scope.test.ts` is the broadest: its header comment states the
invariant directly — every repository read must be filtered by `org_id` — and it proves it
by seeding two organizations with identically-named content (`platform` as a project slug
in both `north` and `acme`) and asserting that asking either tenant for the other's rows,
at every layer from repository through service, returns nothing. `tests/server/permissions.
test.ts` is the service-layer sibling of `tests/lib/permissions.matrix.test.ts` and
`tests/lib/permissions.ownership.test.ts`: rather than sweeping the matrix itself, it proves
every mutating service actually consults `can()`, using a Viewer actor across `comment-
service`, `invitation-service`, `issue-service`, `member-service` and `project-service` as
the sharp negative case. `tests/server/plan-limits.test.ts` proves the write paths — invite
issuance in particular — actually consult `PLAN_LIMITS` and `wouldExceedLimit()` before
writing, not merely that the arithmetic in `@/config/plan-limits` is correct in isolation
(that is `tests/config/plan-limits.test.ts`'s job). `tests/server/domain-events.test.ts`
subscribes to the bus and asserts the specific payload shape of events published by
`comment-service`, `issue-service` and `project-service` in combination — its header comment
explains the stakes: services stay decoupled from notifications, search, the audit log and
webhooks by announcing facts on the bus, so a broken or malformed event silently breaks
every downstream consumer, which is why the contract is pinned here rather than through each
consumer separately. `tests/server/jobs.test.ts` covers the job queue primitives —
`enqueue`, `drain`, `resetQueue`, `pendingCount` — the scheduler's `isSchedulerRunning`/
`startScheduler`/`stopScheduler`, and `backoffMs()` imported directly from
`@/server/jobs/webhook-delivery-job`. `tests/server/soft-delete.test.ts` covers the same
archive/restore invariant as `tests/lib/soft-delete.test.ts`, but at the repository and
service layer rather than the pure-function layer — an archived issue is invisible unless
`includeArchived` is set, and archiving a project cascades to its issues. `tests/server/
seed.test.ts` covers `seedDatabase` from `@/server/db/seed`, whose header comment states
that other suites and manual QA both build on this fixture, so its output shape — two
tenants on different plans, all four roles, issues that are archived and overdue rather than
uniformly healthy — has to be stable across runs.

## tests/jobs/ — scheduled work

Two files, each covering one job in isolation from the scheduler that would normally invoke
it — both call the job's run function directly with an explicit `now`, rather than driving
the scheduler's 60000ms tick. `tests/jobs/digest-email-job.test.ts` is the fuller of the two:
it covers the per-org UTC digest-hour window (an org whose configured hour has not arrived
gets skipped entirely), the plan gate (a `free`-plan org is skipped even with unread
notifications waiting, since `digest_email` requires `growth` or above), an empty window
producing no send, the `DIGEST_MAX_ENTRIES` cap on a single digest email, idempotency across
two runs for the same window (no duplicate send), and — the most subtle case — that the job
constructs its own `Actor` context rather than reading a request's cookies, verified with a
`vi.spyOn` on `featureFlagService.buildFlagContext` asserting it was called with `null` (no
authenticated user) and the target organization. `tests/jobs/overdue-issue-job.test.ts`
covers that `issue.overdue` fires exactly once per overdue issue per run, using
`resetOverdueTracking` between cases to avoid one test's overdue-tracking state leaking into
the next.

## tests/emails/ — template rendering

One file, `tests/emails/render.test.ts`, covering every `EmailTemplate` variant —
`invite`, `digest`, `mention`, `invoice`, `welcome`, `password-reset`, `overdue` — rendered
through `renderTemplate` and `subjectFor` from `@/emails/render`. It asserts every template
produces both HTML (containing `<html`) and non-empty plain text that does not itself
contain `<html`, that every footer carries `SITE_CONFIG.supportEmail`, that the digest
template caps its visible entries at 50 and reports how many were left out
("and 10 more updates" for a 60-entry bundle), that the invoice template formats
`amountCents` as currency (`"$199.00"`, never the raw `19900`), and — a case worth quoting
because it is the one place the suite tests for an absence of something — that the password-
reset email's plain-text body never contains the literal string `"token"`, closing off a
class of accidental token leakage into a rendered log or forwarded email. It also asserts
`subjectFor` falls back to safe defaults when called with an empty props object, which
matters because `subjectFor` is called before `renderTemplate` in the digest job's flow and
must not throw on a template invoked with partial data during a race with the data it
describes.

## What this layer catches that the layer below cannot

The 30 files in `unit-and-lib-tests.md` prove individual functions are correct in isolation;
the 26 files documented here prove those functions are actually wired together the way the
design docs say they are. A concrete example: `tests/lib/permissions.matrix.test.ts` proves
`can()` returns the right boolean for every role/action pair, but nothing in that file proves
`issue-service.createIssue` actually calls `can()` before writing a row — a service that
silently dropped its permission check would pass every test in tests/lib/ while granting
issue creation to a Viewer in production. That failure mode is exactly what
`tests/server/permissions.test.ts` exists to catch, and it is why `test-strategy.md`
describes the pyramid's middle layer as proving wiring, not re-proving arithmetic. The same
relationship holds between `tests/lib/soft-delete.test.ts` and `tests/server/soft-delete.
test.ts`, between `tests/config/plan-limits.test.ts` and `tests/server/plan-limits.test.ts`,
and between `tests/lib/event-bus.test.ts` and `tests/server/domain-events.test.ts` — in each
pair, the tests/lib/ file proves the primitive works, and the tests/server/ file proves a
real service actually reaches for it at the right moment.

## A note on test ordering within a file

Every file that seeds a shared tenant in `beforeAll` rather than per-test relies on its
`describe` block's cases not mutating that tenant's identity-defining rows (its slug, its
plan, its owner) — only adding new issues, comments or members to it. A case that needed to
change the tenant's plan, for instance, creates its own tenant with `createTenant(slug,
plan)` under a distinct slug rather than mutating the shared one, which is why so many test
bodies across this group introduce a locally-scoped tenant (`quotaTenant`, `pager-issues`,
`digest-window`, and so on) instead of reusing the file-level `tenant` variable for cases
that need different starting conditions. This convention is what lets `beforeAll` remain
safe to use at all in a suite this size: a shared setup step is only safe when every
consuming case either only adds to what it sets up, or opts out of it entirely for its own
isolated tenant.
