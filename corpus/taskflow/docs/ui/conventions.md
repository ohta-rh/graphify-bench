---
title: UI conventions
id: UI-CONVENTIONS
status: approved
owners: [platform-team, s.duarte]
last_updated: 2026-08-11
related: [DES-005, DES-076, DES-220, ADR-009, ADR-021, REQ-194]
---

# UI conventions

Every screen spec in this directory leans on the same handful of primitives and rules. This
file is where they are explained once, so a screen spec can say "gated by `PermissionGate`"
without re-deriving what that means. If a screen departs from one of these conventions, the
spec calls it out explicitly — otherwise, assume it holds.

## The design-system layer: src/components/ui/

`src/components/ui/index.ts` is a barrel that re-exports every primitive in the directory —
`Alert`, `Avatar`, `Badge`, `Button`, `Card` (plus `CardHeader`/`CardTitle`/`CardDescription`/
`CardContent`/`CardFooter`), `Checkbox`, `Combobox`, `CommandPalette`, `DatePicker`, `Dialog`
(plus `DialogHeader`/`DialogFooter`), `Drawer`, `DropdownMenu`, `EmptyState`, `ErrorMessage`,
`FormField`, `IconButton`, `Input`, `Label`, `Pagination`, `Popover`, `Progress`, `Select`,
`Skeleton`, `Spinner`, `Switch`, `Table` (plus `TableHead`/`TableBody`/`TableRow`/`TableCell`/
`TableHeaderCell`), `Tabs`, `TagInput`, `Textarea`, `Toast`, `Toaster`, `Tooltip`. Domain
components (under src/components/domain/) import from this barrel, never from an individual file
under `ui/`, and never reimplement one of these — a second button component is a code-review
finding, not a style choice.

The primitives carry no domain knowledge. `Progress` knows nothing about plan quotas; `usage-meter.tsx`
wraps it with a `LimitCheck` and picks a `tone` (`brand` / `warning` / `danger`) from how close
`used` sits to `limit`. `Skeleton` is what every `loading.tsx` in the dashboard subtree is built
from — `src/app/(dashboard)/[orgSlug]/loading.tsx` mirrors the real sidebar and content column
widths with a handful of `Skeleton` rectangles so the page does not visibly jump once real data
lands, and every other `loading.tsx` under `[orgSlug]` follows the same pattern at a smaller
scale (the project overview skeleton, the issue list skeleton, the issue detail skeleton).

`EmptyState` is the other primitive worth calling out by name because it appears in nearly
every screen spec's state table: `{ title, description?, icon?, action? }`. A screen with zero
rows never renders a bare "no data" string — it renders an `EmptyState` with a title that names
what is missing and, where the actor can do something about it, a description that says what.
The project list, the search page, the notification inbox, the label manager and the invoice
history all follow this pattern; where an actor without create rights views an empty screen the
copy changes to point at who *can* act ("Ask an admin to create one"), not what the viewer
cannot do.

## Role-aware navigation: `visibleNav()`

`src/config/nav.ts` declares two `readonly NavItem[]` trees, `SIDEBAR_NAV` and `SETTINGS_NAV`.
Each `NavItem` names an optional `action: PermissionAction` and an optional
`flag: FeatureFlagKey`; `visibleNav(items, actor, flags)` is the single function that turns a
tree into what a given actor may see, and it is the *only* place that decision is made — no
sidebar or settings-tab component branches on `actor.role` directly. It recurses into
`children`, filters each item by flag first (`flagAllows()`, which prefers the passed-in
`FeatureFlagSnapshot` and falls back to a direct `isEnabled()` call if the flag is missing from
an older snapshot) and then by permission (`can()`, against a `PermissionResource` built by the
item's own `navResource()`/`resourceFor()` helper — nav-level checks are always asked about the
actor's own organization, never about a specific row, because "could this actor do this at all"
is a coarser question than any single-record check inside the screen). A parent item whose every
child gets filtered away, and which has no destination of its own (`segment === ""`), is dropped
entirely rather than rendered as a dead-end group header.

`SIDEBAR_NAV` is consumed by `AppSidebar` (`src/components/domain/nav/app-sidebar.tsx`),
rendered from `DashboardShell` (`src/app/(dashboard)/[orgSlug]/_components/dashboard-shell.tsx`).
`SETTINGS_NAV`'s equivalent, `TABS`, lives inline in
`src/app/(dashboard)/[orgSlug]/settings/layout.tsx` rather than importing `SETTINGS_NAV` —
both express the same idea (a permission-filtered list of `{ segment, label, action }`) but the
settings layout's list is shorter and organization-scoped in a way that made a second constant
simpler than threading `SETTINGS_NAV` through an extra resource-mapping layer. `resourceFor()`
in the settings layout is the settings-specific twin of `navResource()` in `nav.ts`: same idea,
same pattern, different call sites, because neither file imports from the other.

Every dashboard layout (`[orgSlug]/layout.tsx`, `settings/layout.tsx`,
`projects/[projectSlug]/layout.tsx`) repeats a permission check that a downstream page also
performs — the project layout's `maySettings` check, for instance, matches the one inside
`projects/[projectSlug]/settings/page.tsx` exactly. A layout hiding a link is not a security
boundary; it is a courtesy so a caller does not click into a 404. `screen-org-home.md`'s and
`conventions.md`'s framing of this point is the same one `[orgSlug]/error.tsx`'s doc comment
makes about `PermissionDeniedError` and `TenantScopeError` — the enforcement always lives one
layer below where the UI merely declines to render.

## Optimistic updates: `useOptimisticIssues`

`src/hooks/use-optimistic-issues.ts` wraps React's `useOptimistic` around
`optimisticIssuesReducer` (co-located as `optimistic-issues-reducer.ts`). It exposes
`{ issues, applyStatus, applyAssignee }`: the caller renders `issues` in place of the server-
provided list, and calls `applyStatus(issueId, status)` or `applyAssignee(issueId, assigneeId)`
inside the same transition that invokes the corresponding Server Action
(`changeIssueStatusAction` from `src/actions/issues/change-issue-status.ts`, or the assignment
path inside `src/actions/issues/assign-issue.ts`). React discards the optimistic overlay the
moment the action settles and the route revalidates through `withAction()`'s `revalidate`
option — there is no separate "roll back on failure" branch to write, because a rejected action
simply never revalidates the optimistic guess into a real one, and the next server render
replaces it with ground truth. `KanbanBoard` (`src/components/domain/board/kanban-board.tsx`)
is the primary consumer: a drag reorders the local `IssueBoardColumn` state immediately, then
fires `onMove`, which is `moveIssueAction` wired straight through from
`projects/[projectSlug]/board/page.tsx`. `DES-104` documents the server side of the same fact —
a board move is a status change plus a touch, never a persisted ordinal — which is why the
optimistic reducer only ever moves an issue between column buckets and never reorders within
one beyond appending at the drop index.

## The client-side flag snapshot

Server Components call `isEnabled(flag, ctx)` directly against a `FlagContext` built by
`buildFlagContext(actor, org)` (`src/server/services/feature-flag-service.ts`). Client
Components cannot do that — they have no access to `FlagContext`'s ingredients — so every
tenant layout computes `snapshotFlags(buildFlagContext(actor, org))` once
(`src/lib/feature-flags.ts`, iterating `FEATURE_FLAG_KEYS`) and hands the resulting
`FeatureFlagSnapshot` down through `FeatureFlagProvider`
(`src/components/domain/flags/feature-flag-provider.tsx`). `useFeatureFlag(flag)`
(`src/hooks/use-feature-flag.ts`) reads one key off that snapshot, and `FeatureGate`
(`src/components/domain/flags/feature-gate.tsx`) wraps `useFeatureFlag` to declaratively hide
children. `REQ-194` states the underlying rule plainly: the client receives a *snapshot*, never
the registry (`FEATURE_FLAG_DEFINITIONS`) itself — a client bundle that could read
`FEATURE_FLAG_DEFINITIONS` could infer rollout percentages and plan gates for flags it has no
business knowing about, so `src/config/feature-flags.ts` never ships to the client.

The snapshot is a point-in-time evaluation, not a subscription. A percentage-rollout flag
(`ai_issue_summary`) or a role-gated one (`issue_templates`) can only change value on the next
navigation that re-runs the tenant layout — there is no client-side re-evaluation loop. This is
why `move-issue.ts` (`src/actions/issues/move-issue.ts`) re-checks `kanban_board` on the server
before applying a move (`DES-230`): the client's `flags.kanban_board` could be stale by the time
the action runs, if an admin toggled the org's override in another tab.

## Forms bound to shared Zod schemas

Every create/edit form under src/components/domain/ is bound to a schema from src/schemas/
through `useFormAction` (`src/hooks/use-form-action.ts`), which bridges a React Hook Form
submission to a Server Action's `ActionResult<T>` shape and exposes
`{ submit, pending, error }`. The schema is the same object the Server Action parses its input
with — `IssueForm` and `createIssueAction` both resolve against `createIssueSchema`
(`src/schemas/issue.ts`); `ProjectForm` and `createProjectAction` both resolve against
`createProjectSchema`; `CommentComposer` and `createCommentAction` both resolve against
`createCommentSchema`. `ADR-009` is the decision record for sharing one schema object across the
client/server boundary rather than hand-duplicating validation rules on each side, and the
practical payoff shows up here: a `FormField` renders `ErrorMessage` from the same
`ZodError.flatten()` shape the action returns, so client-side and server-side validation never
drift into disagreeing about what a valid issue title looks like.

`withAction()` (under src/actions/_lib/, documented fully in DES-220) is what every Server Action
funnels through before touching a service: parse input against the schema, resolve and
authenticate the actor, translate a thrown domain error into an `ActionResult` error shape, and
— when the call succeeds — revalidate the cache tags the mutation named. `stamp()` attaches a
`submittedAt` timestamp to the result specifically so `useActionState` (inside `useFormAction`)
can tell two consecutive identical-looking results apart, which matters for a resubmitted form
whose previous attempt also failed with the same validation error.

## Permission checks in the UI: `PermissionGate`, `usePermission`, `can`

Server Components call `can(actor, action, resource)` directly (from `src/lib/permissions.ts`)
and branch on the boolean — every screen spec's "Permission required" line and state table
entry for "permission denied" describes exactly this call. Client Components that need the same
answer use `usePermission(action, resource)` (`src/hooks/use-permission.ts`), which is
documented as never re-implementing the matrix — it is a thin client-safe wrapper that assumes
the actor and resource are already in scope (typically from `useOrg()`,
`src/hooks/use-org.ts`, which reads the context installed by the tenant layout).
`PermissionGate` (`src/components/domain/permission/permission-gate.tsx`) is the declarative
form: `{ actor, action, resource, fallback?, children? }`, used where a component tree wants to
conditionally render without threading a boolean through several levels of props. None of these
three are a security boundary by themselves — as with nav filtering, the service layer is where
`assertCan()` actually throws `PermissionDeniedError`; the UI-layer checks exist purely to avoid
showing a control that would fail if pressed.

## Next.js 16 rules every page under `[orgSlug]` obeys

- **`params` and `searchParams` are Promises.** Every `page.tsx` and `layout.tsx` in this
  subtree destructures them as `props: { params: Promise<...>; searchParams: Promise<...> }`
  and awaits both before use — even when a page ignores `searchParams`'s values, it still
  awaits the promise (see `[orgSlug]/page.tsx`'s `await props.searchParams;`), because Next.js
  16 requires the await to happen for the request to be considered fully read.
- **No `middleware.ts`.** The request-level hook is `src/proxy.ts`, exporting `proxy`
  (`ADR-007`, `DES-036`). Its role in the pages documented here is limited to presence, not
  validity — it does not resolve `orgSlug` to a real organization or check membership; that
  work is `loadTenantContext()`'s job, every time, on every page.
- **`default.tsx` for parallel-route slots.** `[orgSlug]/@panel/default.tsx` exists purely
  because Next.js 16 fails the build without it — a parallel route slot with no matching
  segment for the current URL needs an explicit default, and `@panel/page.tsx` (the slot's
  own base content) and `@panel/notifications/page.tsx` (matched when the URL is
  `/{orgSlug}/notifications`) are its two real occupants.
- **`revalidateTag` takes a cache-life profile.** Server Actions never call the framework's
  `revalidateTag` directly; they go through `revalidateTagged()` (`src/lib/cache.ts`), which
  pairs a tag with one of the named `CACHE_PROFILES` (`DES-070` through `DES-077` cover the
  full tag vocabulary and staleness budgets this UI layer relies on but does not itself define).

## The two deliberate layering exceptions this directory does not spec separately

`brief-common.md`'s list of five deliberate layering exceptions includes two dashboard pages
that call a repository directly instead of going through a service:
`src/app/(dashboard)/[orgSlug]/profile/page.tsx` and
`src/app/(dashboard)/[orgSlug]/settings/notifications/page.tsx` (a third,
`settings/members/invitations/page.tsx`, is documented in
`screen-settings-org-and-members.md` because its bypass — reading
`listPendingInvitations()` straight from `src/server/repositories/invitation-repository.ts` —
is central to how that screen behaves). The profile and notification-preferences pages are both
single-form, single-permission screens with no state machine complex enough to earn a spec of
their own: profile editing has no permission check at all (an actor may always edit their own
profile) and no flag; the notification-preferences page gates only on `isEnabled` for
`digest_email` to decide whether the digest column of `NotificationPreferencesForm`
(`src/components/domain/notification/notification-preferences-form.tsx`) renders. Their
architectural interest — bypassing the service layer — is a fact about the codebase's layering,
not about screen behavior, which is why it lives here rather than in a dedicated spec.
