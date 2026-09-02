---
title: Component and UI tests
id: TEST-COMPONENT-UI
status: approved
owners: [platform-team, s.duarte]
last_updated: 2026-08-14
related: [DES-040, DES-045, ADR-009, REQ-022]
---

## Scope: mostly logic, rarely rendering

Seventeen files sit under tests/components/ and tests/ui/ — 13 and 4 respectively —
plus the two shared fixture files under tests/helpers/ that both this layer and the
database-backed suites depend on. The naming pattern across most of these files is a tell:
`board-model.test.ts`, `mention-query.test.ts`, `shortcut-match.test.ts`,
`issue-filter-params.test.ts`, `command-groups.test.ts`, `search-query-syntax.test.ts`,
`activity-grouping.test.ts`, `role-select.test.ts`, `optimistic-issues.test.ts` and every
file under tests/ui/ test pure functions extracted out of a component or hook — reducers,
parsers, predicates, formatters — rather than the component's rendered output. Only two
files actually mount a component with Testing Library and assert on the DOM:
`tests/components/app-sidebar.test.tsx` and `tests/components/permission-gate.test.tsx`,
plus the narrower `tests/components/issue-card.test.tsx` and
`tests/components/usage-meter.test.tsx`. That split is deliberate, not incomplete: logic
that decides *what* to render — a filter predicate, a board-column grouping, a shortcut
match — is cheap and fast to test as a plain function, and testing it that way catches the
overwhelming majority of real bugs in this codebase's history without paying for a DOM
render or a `@testing-library/react` `cleanup()` cycle per case. The visual and interaction
layer above that logic is intentionally left to manual QA and the `run` skill's live-app
verification rather than automated rendering tests, which is the honest gap this file and
`test-strategy.md` both name rather than hide.

## Component-level DOM tests

`tests/components/permission-gate.test.tsx` is the most consequential of the four, because
`PermissionGate` (`src/components/domain/permission/permission-gate.tsx`, referenced by its
export path in the test) is the one component every authorization-gated UI element in the
app is supposed to route through. The suite asserts children render when `can(actor, action,
resource)` is true, nothing renders (an empty DOM element) when it is false and no fallback
was supplied, a supplied `fallback` renders in its place on denial, and — the case that
justifies the component's own existence rather than a plain role check — that the gate
delegates the decision to `can()` itself rather than comparing `actor.role` directly: a
`member`-role actor is granted `comment:delete` on a comment they authored purely through
the ownership escalation in `DES-041`, which a naive `actor.role === "admin"` check inside
the component would have denied. It also asserts a resource from another organization is
denied, matching the library's own cross-tenant rule from `DES-030` at the component
boundary. `tests/components/app-sidebar.test.tsx` covers that navigation items the current
actor cannot access — by permission or by feature flag, the same combination
`tests/config/nav.test.ts` covers at the pure-function layer — are hidden from the rendered
sidebar rather than merely disabled. `tests/components/issue-card.test.tsx` covers that the
card renders an issue's title, status and assignee correctly, and
`tests/components/usage-meter.test.tsx` covers that the meter's exceeded visual state
activates at and above the quota boundary, not only strictly above it — an off-by-one
distinction that matters because `wouldExceedLimit`'s own semantics treat "at the limit" as
already exceeded for a new request.

## Pure-function extraction tests

`tests/components/board-model.test.ts` covers `buildBoardColumns`, `compareBoardIssues`,
`findIssue`, `moveIssueInColumns` and `orderColumns` from `@/components/domain/board/board-
model` — the in-memory model behind the Kanban board's drag-and-drop, which `DES-104`
describes as a status change plus a touch rather than a persisted order; this file is where
the client-side reordering arithmetic that supports that model is pinned, separate from the
server-side status-change assertions in `tests/services/issue-service.test.ts`.
`tests/components/optimistic-issues.test.ts` covers `optimisticIssuesReducer`,
`withStatus`, `withAssignee` and `isClosedStatus` from `@/hooks/optimistic-issues-reducer` —
the client-side state that makes issue mutations feel instant ahead of the server's
response, the pattern `ADR-021` documents. `tests/components/mention-query.test.ts` covers
`findMentionQuery`, `matchMembers`, `applyMention` and `mentionHandle` from
`@/components/domain/comment/mention-query`, the client-side counterpart to the server-side
mention resolution `tests/lib/mentions.test.ts` and `DES-116` cover — the server's list
still wins on any disagreement with what the client matched, which is why this file tests
only the client's candidate-matching UX and not the authoritative mention list itself.
`tests/components/role-select.test.ts` covers `assignableRoles` from
`@/components/domain/member/role-select`, asserting an owner can grant every role while a
lower-ranked actor's assignable set narrows accordingly — plus, sharing the same file
because they are small enough not to warrant a file each, `isActiveSegment` from
`@/components/domain/nav/app-sidebar` and `formatUnreadBadge` from
`@/components/domain/notification/notification-bell`.

`tests/components/activity-grouping.test.ts` covers `activityDay`, `activityLabel` and
`groupEventsByDay` from `@/components/domain/activity/activity-labels`, the client-side
projection of the audit feed that `DES-172`'s `groupByDay` reshapes on the server; the same
file also covers `usageRatio` and `usageTone` from `@/components/domain/billing/usage-
meter`, the pure functions behind the DOM assertions in `usage-meter.test.tsx`.
`tests/components/command-groups.test.ts` covers `buildCommandGroups` from `@/hooks/
command-groups`, asserting the command palette's available actions narrow by plan through
`snapshotFlags` — a `free`-plan organization does not offer a command that requires a flag
gated at `growth` or above. `tests/components/issue-filter-params.test.ts` covers
`parseIssueFilterParams`, `issueFilterToParams`, `issueFilterQueryString`,
`activeFilterCount` and the `UNASSIGNED_TOKEN` sentinel from `@/hooks/issue-filter-params` —
the URL-search-param serialization behind `REQ-077`'s status/assignee/label filtering and
`REQ-078`'s cursor pagination on issue listings. `tests/components/search-query-syntax.
test.ts` covers `parseSearchQuery` and `describeQuery` from `@/components/domain/search/
query-syntax`, including that field-scoped `kind:` syntax is parsed only when the
`advanced_search` flag is on for the caller — everything is treated as free text otherwise,
matching `REQ-175`'s gate. `tests/components/shortcut-match.test.ts` covers
`parseShortcut`, `matchesShortcut`, `formatShortcut` and `prefersMetaKey` from
`@/hooks/shortcut-match`, the keyboard-shortcut matching behind the command palette's
accelerator keys.

## tests/ui/ — the generic widget library

Four files, each covering a src/components/ui/_lib/ helper module behind a reusable widget
rather than a domain-specific one. `tests/ui/command-palette.test.ts` covers
`flattenGroups` from `@/components/ui/command-palette` — numbering rows continuously across
group boundaries, dropping a group whose items all filter out, matching on hint text as well
as label, matching on the group heading itself, and renumbering after a filter so the
active-row index stays in range — plus, sharing the file, `progressPercent` from
`@/components/ui/progress` (rounding to a whole percent, clamping an out-of-range count,
returning 0 rather than `NaN` for an unusable maximum such as zero or `Infinity`) and
`initialsOf` from `@/components/ui/avatar`. `tests/ui/calendar.test.ts` covers
`isIsoDate`, `parseIso`, `toIso`, `buildMonthGrid`, `monthLabel`, `shiftMonth` and
`isOutOfRange` from `@/components/ui/_lib/calendar` — date-grid arithmetic entirely
independent of the domain, reused wherever a due-date picker appears.
`tests/ui/list-navigation.test.ts` covers `moveActiveIndex` (wrapping at both ends of a
list, entering from either end when nothing is active, jumping to the edges on Home/End),
`isNavKey`, `filterByQuery` and `matchesQuery` from `@/components/ui/_lib/list-navigation`
— the shared keyboard-navigation primitive behind both the command palette and any other
searchable list in the UI. `tests/ui/pagination-range.test.ts` covers `pageCount`,
`rangeStart`, `rangeEnd` and `buildPageRange` from `@/components/ui/_lib/pagination-range`,
including that a nonsensical page size (zero) returns zero rather than dividing by it, and
that even zero rows still report at least one page rather than zero pages — a UI-level
convenience distinct from `tests/lib/pagination.test.ts`'s server-facing `pageCount`, which
the two files' near-identical names make worth flagging explicitly so a reader does not
assume one is redundant with the other.

## tests/helpers/ — the fixtures this layer and others share

`tests/helpers/db.ts` and `tests/helpers/factories.ts` underpin every suite that does not
use the separate tests/server/_support/ fixture layer described in
`service-and-repository-tests.md` — in particular the component and tests/lib/ suites that
need a `makeActor`, `makeIssue`, `makeOrganization` or similar plain object without touching
a database at all. `tests/helpers/db.ts` wraps `getDb`/`useInMemoryDb` from `@/server/db`
and `runMigrations` from `@/server/db/migrate` into three functions: `setupTestDb()` points
the singleton database client at `:memory:` and migrates it; `resetTestDb()` truncates every
table (deleting rows table by table with foreign keys temporarily disabled, which is
cheaper than re-running migrations) and is called from `beforeEach` in suites that need a
clean slate per test; `seedTwoTenants()` inserts two organizations — `ORG_A` ("Acme") and
`ORG_B` ("Globex") — owned by the same user, so that "does this query filter by orgId"
assertions have a real row in a real other tenant to fail against, rather than testing an
absence that could just as easily mean the query is broken in an unrelated way.

`tests/helpers/factories.ts` is the single source of the deterministic test data nearly
every non-tests/server/ suite in the corpus imports: `makeActor`, `makeUser`,
`makeOrganization`, `makeProject`, `makeIssue`, `makeComment`, `makeMember` and
`makeLimitCheck`, each accepting a `Partial<T>` of overrides and each seeded from the same
`idFactory(42)` so a test that does not care about ids gets stable, reproducible ones. It
also exports the shared constants `ORG_A`, `ORG_B`, `ALICE` and `BOB` — real ULIDs, not
placeholder strings — that appear by name across dozens of the files documented above and
in `unit-and-lib-tests.md`; a change to any of these four constants' literal values would
ripple through a very large fraction of the suite, which is exactly the kind of change
`d.okafor`'s review ownership over tests/helpers/ (noted in `index.md`) exists to catch
before it merges.

## `tests/setup.ts` and the rendering environment

The four files that actually mount a component — `tests/components/app-sidebar.test.tsx`,
`tests/components/permission-gate.test.tsx`, `tests/components/issue-card.test.tsx` and
`tests/components/usage-meter.test.tsx` — depend on `tests/setup.ts`, which wires
`jest-dom`'s matchers (`toBeInTheDocument`, `toBeEmptyDOMElement`, and the rest) into
Vitest's `expect`, configured as the project's global test setup file. Every one of those
four files calls `cleanup` from `@testing-library/react` in an `afterEach` hook, unmounting
whatever the previous case rendered before the next one runs — a discipline that matters
more in this suite than in most, because `PermissionGate`'s denial case renders nothing at
all (`container` is an empty DOM element), and a leaked prior render would make that
assertion pass for the wrong reason if cleanup were skipped. None of the seventeen files in
tests/components/ or tests/ui/ uses `userEvent` or simulates a click, a keystroke, or a
focus change — the DOM assertions that do exist check only what rendered given a fixed set
of props, never a subsequent interaction, which is consistent with the file's opening claim
that this layer is mostly about logic rather than rendering.

## The naming trap: two `pageCount` functions

Both `tests/lib/pagination.test.ts` and `tests/ui/pagination-range.test.ts` export and test a
function named `pageCount`, and they are not the same function — `@/lib/pagination`'s
version is the one repository listings use server-side, while
`@/components/ui/_lib/pagination-range`'s version drives the UI's own page-number widget,
independently re-deriving the same rounding-up arithmetic for a slightly different call
shape. This is worth stating plainly rather than leaving a reader to notice it by accident:
a reviewer skimming a diff to either file could reasonably assume it duplicates the other
and propose deleting one, when in fact the two exist at different layers for the same reason
`tests/config/plan-limits.test.ts` and `tests/contract/plan-limits.test.ts` both exist —
independent re-derivation is deliberate in each case, and `test-strategy.md`'s discussion of
the contract suite makes the same point about a different pair of files.

## Where this layer's coverage runs out

A reader who wants to know whether a specific rendered screen behaves correctly — whether
the issue board actually reflows when a card is dragged, whether the command palette's
keyboard navigation actually moves focus, whether the permission gate actually hides a
button in the live app rather than merely in a `render()` call in a test file — will not
find that answer in tests/components/ or tests/ui/. Those sixteen files test the logic
each of those screens is built from, proven correct as pure functions and, in four cases, as
a component's static output for a fixed prop set; none of them drive an actual browser or
assert on an actual interaction sequence. `test-strategy.md` names this as the top of the
pyramid being "deliberately thin," and this file is the place to see exactly which sixteen
functions and four components that thinness applies to, one by one, rather than as an
abstract claim.
