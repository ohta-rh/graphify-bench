---
title: Unit and library tests
id: TEST-UNIT-LIB
status: approved
owners: [platform-team, d.okafor]
last_updated: 2026-08-14
related: [DES-015, DES-043, ADR-011, ADR-015, REQ-020]
---

## Scope

This file covers the 30 test files that need no database and no `Actor`: 22 under
tests/lib/, 6 under tests/schemas/ and 2 under tests/config/. Every one of these tests
is synchronous or trivially awaited, imports nothing from tests/server/_support/ or
`tests/helpers/db.ts`, and runs in well under a second per file. They are the base of the
pyramid described in `test-strategy.md`, and they are where a change to a cross-cutting
primitive in src/lib/ gets caught first.

## tests/lib/ — cross-cutting primitives

src/lib/ is described in the module map as holding primitives that know nothing about the
domain (`DES-015`); the test files under tests/lib/ mirror that split closely enough that
each one maps to exactly one `src/lib/*.ts` module.

**Identity and secrets.** `tests/lib/id.test.ts` asserts `newId()` produces a 26-character
Crockford base32 string that `isUlid()` accepts, that 500 consecutive calls produce distinct
ids, and that malformed strings — empty, non-ULID text, a 25-character string one short of
valid — are rejected. `tests/lib/hash.test.ts` covers `hashPassword`, `verifyPassword`,
`hashToken` and `randomToken`: it asserts the self-describing `scheme:salt:key` shape a
`scrypt` hash produces, that two hashes of the same password differ because a fresh salt is
drawn each time, and that the plaintext password is never present anywhere in the stored
hash. These two files are the ones almost every database-backed suite depends on indirectly
— `tests/server/_support/doubles/id.ts` exists specifically so that service and repository
tests can swap in a deterministic id generator instead of the real one, which is why so many
service test files carry `vi.mock("@/lib/id", () => import("../server/_support/doubles/id"))`
at their top.

**Errors.** `tests/lib/errors.test.ts` maps every domain error class —
`PermissionDeniedError`, `TenantScopeError`, `FeatureDisabledError`,
`AlreadyArchivedError`, `InvalidSlugError`, plus a `ZodError` — onto its `AppErrorShape`, and
by extension onto the `HTTP_STATUS_BY_CODE` table in `src/lib/errors.ts` that action-layer
error translation (`DES-025`, `DES-222`) depends on. `tests/lib/result.test.ts` covers the
`Result` envelope separately — `mapResult`, `unwrapOr`, `fromPromise`, `collectResults` — the
functional-style wrapper that lets `safeParse` in `src/lib/validation.ts` return a typed
success-or-failure rather than throwing.

**Tenancy and authorization primitives.** `tests/lib/tenant.test.ts` exercises
`assertOrgScope`, `scopedOrNull` and `withOrgScope` from `@/lib/tenant` — the functions
`DES-031` names as the tenant-isolation boundary enforcement — while
`tests/lib/permissions.matrix.test.ts` and `tests/lib/permissions.ownership.test.ts` cover
`@/lib/permissions` from two different angles. The matrix suite, described in more depth in
`test-strategy.md`, sweeps `ROLE_MATRIX` (`DES-043`) exhaustively: it asserts every action is
mapped to a role in `ROLES`, that `can()` grants exactly the roles at or above the required
rank, that a cross-tenant actor is denied every single action regardless of role (checked
before the platform-staff bypass, per the decision order in `DES-042`), that platform staff
bypass the matrix inside their own tenant but not across one, and that
`explain()` reports the right one of the six reasons —
`denied_cross_tenant`, `granted_by_staff`, `denied_unknown_action`, `granted_by_role`,
`granted_by_ownership`, `denied_by_role` — for each shape of decision. It also asserts
`canAll()` requires every listed action to pass, including the edge case of an empty action
list vacuously succeeding. The ownership suite,
`tests/lib/permissions.ownership.test.ts`, narrows in on the escalation path from
`DES-041`: an author may edit their own issue or comment even as a Viewer, but that
escalation does not extend to actions outside the escalation list (`issue:archive`,
`comment:delete`, `notification:manage` are the others named in the escalation set, per the
common brief), so a Viewer cannot delete their own issue merely by authoring it.

**Rate limiting and feature flags.** `tests/lib/rate-limit.test.ts` covers token-bucket
refill and exhaustion behavior in `@/lib/rate-limit` — the buckets named in
`src/lib/rate-limit.ts` (`member:invite`, `comment:create`, `issue:create`,
`search:query`, `auth:password-reset`, `webhook:deliver`, and the `default` bucket) each
have their own capacity and refill rate, and this suite is where the arithmetic of consuming
against those buckets is pinned, independent of which service consumes them.
`tests/lib/feature-flags.test.ts` covers every one of the four rollout strategies
`ADR-012` names — plan-gated, percentage rollout, boolean-on, role-gated — plus the
per-organization override path, exercised through `isEnabled()` in `@/lib/feature-flags`
rather than through the lower-level registry directly.

**Formatting, dates and text.** `tests/lib/format.test.ts` covers money, byte-count and
enum-label formatting, explicitly including the `UNLIMITED` sentinel (`Number.POSITIVE_
INFINITY`) rendering as a human string rather than as `"Infinity"` or `NaN`.
`tests/lib/date.test.ts` covers relative-time formatting, overdue detection and the digest
window calculation that `tests/jobs/digest-email-job.test.ts` builds on without re-deriving.
`tests/lib/markdown.test.ts` covers the restricted Markdown subset `renderMarkdown` accepts
— paragraphs, headings up to level three, bold, italic, inline code — and its plain-text
projection `stripMarkdown` plus `excerpt`. `tests/lib/mentions.test.ts` covers mention
extraction and resolution against a member list, including that mentions inside code spans
and fences are deliberately not treated as mentions. `tests/lib/csv.test.ts` covers
quoting, embedded newlines and column ordering for CSV export. `tests/lib/cn.test.ts`
covers the small `cn()` class-name merge helper — falsy-value dropping, string splitting,
and the last-occurrence-wins precedence a caller's `className` prop relies on.

**Structural helpers.** `tests/lib/slug.test.ts` covers `slugify`, `isReservedSlug`,
`isValidSlug`, `uniqueSlug` suffixing, `assertValidSlug`, `SLUG_MAX_LENGTH` and
`projectKeyFromName` — the same module `tests/contract/slug.test.ts` independently
re-verifies at the contract layer, discussed in `test-strategy.md`.
`tests/lib/pagination.test.ts` covers `pageCount`, `clampPageSize` (clamping into
`DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE` from `@/config/constants`), `emptyPage` and
`sliceToPage`. `tests/lib/url.test.ts` covers route-building helpers —
`orgPath`, `projectPath`, `issuePath`, `settingsPath`, `withSearchParams` — including that a
slug or path segment containing a slash or a space is percent-encoded rather than allowed to
break out of the path it is composed into. `tests/lib/soft-delete.test.ts` covers
`archivePatch`, `restorePatch`, `applyArchiveScope`, `shouldFilterArchived`, `isArchived`,
`isLive` and `assertNotArchived` — the primitives every archive-not-delete flow in the
service and repository layers builds on (`ADR-004`). `tests/lib/validation.test.ts` covers
`safeParse` and `parseSearchParams`, the non-throwing wrapper around Zod parsing that lets a
Server Action return a `validation_failed` error shape instead of throwing past `withAction`.
`tests/lib/logger.test.ts` covers `createLogger`'s level thresholds, its one-JSON-object-
per-line output shape, and the scope binding that makes every log line traceable to the
module that wrote it. `tests/lib/event-bus.test.ts` covers `subscribe`/`emit`/`unsubscribe`
directly against `@/lib/event-bus`, handler isolation, and `subscriberCount` — the same bus
that `tests/server/domain-events.test.ts` exercises indirectly through real services.

## tests/schemas/ — Zod validation

Six files, one per domain area, each asserting the same three things about its schema: that
defaults are applied correctly, that documented bounds are enforced with the right error
path, and that every legal enum member is accepted while illegal values are rejected.

`tests/schemas/issue.schema.test.ts` is the fullest example: it walks
`createIssueSchema`'s defaults (`description: null`, `status: "backlog"`,
`priority: "none"`, empty `labelIds`, and so on), asserts every member of
`ISSUE_STATUSES` and `ISSUE_PRIORITIES` from `@/types/issue` parses successfully, bounds the
title at 3 and 200 characters with an assertion on the exact error message
("give the issue a title"), bounds `estimate` to a whole number between 0 and 100, caps
`labelIds` at 20 entries, and separately covers `updateIssueSchema` (every field optional),
`changeIssueStatusSchema`, `assignIssueSchema` (an explicit `null` unassigns; omitting the
field entirely fails), `issueFilterSchema` (default `limit` of 25, a hard cap of 100) and
`moveIssueSchema` (a non-negative board index). `tests/schemas/comment.schema.test.ts`
covers comment body limits and mention array bounds. `tests/schemas/member.schema.test.ts`
covers the invitable-role subset (narrower than `ROLES` — an invite cannot mint another
owner) and the bulk-invite cap. `tests/schemas/project.schema.test.ts` covers project
slug/key validation, cross-checked against `RESERVED_SLUGS` from `@/lib/slug`, and the
archive-scope extension shared with the issue filter schema. `tests/schemas/billing.schema.
test.ts` covers the plan and billing-interval enums against `PLAN_IDS` from
`@/types/billing` and seat bounds on `updateSeatsSchema`. `tests/schemas/auth.schema.test.ts`
covers the password policy and the confirm-password refinement on `registerSchema` — the
schema-level guarantee behind `REQ-201`'s hashed-storage rule and `REQ-200`'s email-and-
password login.

## tests/config/ — declared truth

`tests/config/plan-limits.test.ts` covers plan ordering (`PLAN_ORDER`), `wouldExceedLimit`
and specifically the enterprise-plan unlimited sentinel, at the config layer rather than the
contract layer's re-derivation (see `test-strategy.md` for why both exist).
`tests/config/nav.test.ts` covers `visibleNav`, asserting the navigation list filters by
both permission (via `can()`) and by feature flag (via `isEnabled()`) — a single function
that has to get two independently-sourced gates right at once, which is why it has its own
test file rather than being folded into either the permissions or the feature-flag suite.

## Shared conventions across this layer

Every file in this group follows the same small set of conventions closely enough that
reading one prepares a reader for the rest. None of them import `tests/helpers/db.ts` or
`tests/server/_support/fixtures.ts` — if a test needs a plain-object fixture at all, it
imports one of `makeActor`, `makeIssue`, `makeOrganization` and the rest from
`tests/helpers/factories.ts`, or it builds its own tiny local factory function the way
`tests/contract/permissions.test.ts` builds its own `actor()` helper rather than sharing
one — a deliberate choice discussed in `test-strategy.md`'s section on the contract suite.
None of them declare a `beforeEach` or `afterEach` unless a test double needs resetting
(`tests/lib/hash.test.ts` and `tests/lib/logger.test.ts` restore `vi` mocks in `afterEach`,
since they spy on `console` or on timing-sensitive output); a pure function with no shared
mutable state does not need per-test setup at all, and the suite avoids adding it out of
habit.

Assertion style favors a message argument over a comment where the two would say the same
thing: `tests/lib/permissions.matrix.test.ts`'s sweep passes `` `${role} → ${action}` `` as
the second argument to `expect(...).toBe(...)` so a failure names the exact combination that
broke, rather than requiring a reader to count table rows to find it — the same pattern
appears in `tests/schemas/issue.schema.test.ts`'s status and priority loops. Where a schema
test asserts a rejection, it also asserts the rejection's shape, not merely its truthiness:
`tests/schemas/issue.schema.test.ts` checks `result.error.issues[0]?.path` and the exact
message text ("give the issue a title") rather than stopping at `success === false`, because
a Zod schema that rejects for the wrong reason — a coercion bug that happens to also fail
validation — would otherwise pass the same assertion a correctly-rejecting schema does.

## Why this layer catches most regressions cheaply

A change to `ROLE_MATRIX` in `src/lib/permissions.ts`, `PLAN_LIMITS` in
`src/config/plan-limits.ts`, or the feature-flag registry in `src/config/feature-flags.ts`
is caught here before it is caught anywhere else in the pyramid, because these 30 files run
without a database, without an `Actor` resolution step, and without a rendered component —
the smallest possible surface area that can still exercise the real exported function. That
is the practical argument for the pyramid's shape described at the top of
`test-strategy.md`: a bug in the matrix itself breaks a handful of assertions in
`tests/lib/permissions.matrix.test.ts` in well under a second, rather than surfacing later
and less precisely as a cluster of unrelated-looking failures across
`tests/server/permissions.test.ts`, several files under tests/services/, and
`tests/components/permission-gate.test.tsx` all at once.

## Reading this layer as a spec for src/lib/ and src/config/

Because none of these 30 files depend on a database or an `Actor`, they double as the
closest thing this corpus has to an executable specification for the modules under
src/lib/ and src/config/ — a new engineer who reads `tests/lib/permissions.matrix.test.ts`
before reading `src/lib/permissions.ts` itself will already know the shape of `can()`'s
decision order, the full list of the six reasons `explain()` can return, and the exact
place the cross-tenant check sits relative to the staff bypass, without having to trace the
implementation. The same is true in miniature for every file in this group: reading
`tests/lib/rate-limit.test.ts` teaches the token-bucket capacity-and-refill model faster than
reading `src/lib/rate-limit.ts`'s implementation would, and reading `tests/config/plan-
limits.test.ts` teaches the plan ladder's shape without requiring a reader to parse the
`PLAN_LIMITS` object literal by eye. This is a secondary but real benefit of the pyramid's
heavy base: it is not only where regressions are caught cheapest, it is where the domain's
declared truth is easiest to read back out.
