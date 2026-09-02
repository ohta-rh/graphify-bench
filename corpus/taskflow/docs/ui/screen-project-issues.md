---
title: Issue list screens
id: UI-PROJECT-ISSUES
status: approved
owners: [m.lindqvist]
last_updated: 2026-08-12
related: [REQ-061, REQ-064, REQ-077, REQ-078, DES-101, DES-107, DES-229, ADR-008]
---

# Issue list screens

Three routes share this file: the per-project issue list, the cross-project "my issues" view,
and the new-issue form that hangs off the per-project list.

## SCR-007 — Project issue list

- **Route:** `/{orgSlug}/projects/{projectSlug}/issues`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/page.tsx`
- **Server or client:** Server Component
- **Permission required:** `issue:read` to view (404 otherwise); `issue:create` gates the "New
  issue" link
- **Feature flag:** none
- **Data loaded:** `listIssues(actor, filter)` where `filter` is parsed through
  `issueFilterSchema` (`src/schemas/issue.ts`) from the URL's `status`, `q`, `archived`, and
  keyset pagination params; then `getIssue(actor, org.id, issue.id)` per row, in parallel via
  `Promise.all`, to attach relations (assignee, label objects) the raw `listIssues` rows do not
  carry
- **Components:** `IssueList` (`src/components/domain/issue/issue-list.tsx`), `EmptyState`
- **Actions invoked:** none directly on this page — row-level mutations live on the detail page
  and the board
- **Satisfies:** REQ-061, REQ-077, REQ-078
- **Design:** DES-101, DES-107, DES-180

### Layout

A one-line summary ("{page.total} issues in {project.name}") and, when `mayCreate`, a "New
issue" button, sit above `IssueList`. The filter itself has no dedicated filter-bar component
rendered on this page in the current build — `issue-filter-bar.tsx`
(`src/components/domain/issue/issue-filter-bar.tsx`) exists in the component manifest and is
wired for `IssueFilter`, but this page constructs its filter purely from raw URL search params
(`parseStatuses()`, a local helper, plus `search.q` and `search.archived`) rather than mounting
the filter-bar component — the filter chips are read-model only here, driven by whatever URL a
caller lands on (from a saved link, the search page, or manual editing), not by an interactive
control on this particular screen. `IssueList` itself hides the archive control per row based on
the actor's own permission for that row (`onArchive?`), consistent with `DES-107`'s point that
visibility narrows *inside* the list rather than being decided once for the whole page — the
list is authorized at the organization level up front, and per-row affordances are what actually
vary underneath that.

`REQ-078` governs pagination here: keyset, not offset (`ADR-008`), driven by
`searchParamsPaginationSchema` — a `cursor` param rather than a page number, which is why this
screen's URLs are shareable-but-not-jumpable (there is no "go to page 5" without walking the
cursor chain forward).

## SCR-008 — Cross-project issue list ("my issues")

- **Route:** `/{orgSlug}/issues`
- **Files:** `src/app/(dashboard)/[orgSlug]/issues/page.tsx`
- **Server or client:** Server Component
- **Permission required:** `issue:read`, checked at the organization level (per `DES-107`, this
  cross-project view is exactly the case that justifies authorizing at the org rather than the
  project — a per-project check would need one call per project represented in the results)
- **Feature flag:** none
- **Data loaded:** `listIssues` scoped by `orgId` with no `projectId` filter, plus the same
  `?assignee=me`-style query params the sidebar's "Assigned to me" nav child links to
  (`src/config/nav.ts`'s `issues.assigned` entry)
- **Components:** `IssueList`, `EmptyState`
- **Actions invoked:** none
- **Satisfies:** REQ-077, REQ-078
- **Design:** DES-107

This is the destination the sidebar's plain "Issues" nav entry and its "Assigned to me" child
both point at, distinguished only by the `?assignee=me` query param — there is no separate route
for "my issues" versus "all issues"; both are this one page with a different filter applied.
Because it spans every project in the org, this screen is the one place `DES-107`'s
organization-level authorization choice is directly visible in the UI: a viewer sees issues from
every project they can read, aggregated, with no per-project boundary drawn on the page itself.

## SCR-009 — New issue

- **Route:** `/{orgSlug}/projects/{projectSlug}/issues/new`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/new/page.tsx`
- **Server or client:** Server Component shell, client form (`IssueForm`)
- **Permission required:** `issue:create` — a 404 when absent
- **Feature flag:** none
- **Data loaded:** `getPlanLimits(org.plan)` for `issuesPerProject`; `listIssues(actor, {
  orgId, projectId, limit: 1, includeArchived: true })` to get `existing.total` (archived
  issues counted deliberately — see below); then, only if under quota, `listMembers` and
  `listLabels` (`src/server/services/label-service.ts`) for the form's pickers
- **Components:** `IssueForm` (`src/components/domain/issue/issue-form.tsx`)
- **Actions invoked:** `createIssueAction` (`src/actions/issues/create-issue.ts`)
- **Satisfies:** REQ-064, REQ-065
- **Design:** DES-101, DES-229

### The quota check counts archived issues, and the copy says so

`existing.total >= limits.issuesPerProject` is checked with `includeArchived: true` — this is
not an oversight, it is `DES-229`: the create-time quota check deliberately matches the same
convention the project quota uses (`DES-233`, documented in `screen-projects.md`), so an admin
cannot make room in a full project simply by archiving old issues. Rather than leave that as a
surprise a user discovers by trial and error, the "This project is full" message states it in
plain language: "The {plan} plan allows {N} issues per project, archived ones included, and {M}
exist." A "new project starts with a fresh one" nudge and a link to Settings → Billing are the
two ways out offered on the page.

`IssueForm`'s default `status` value is not hardcoded to a fixed status — it reads
`org.settings.defaultIssueStatus` (a plain string on `OrganizationSettings`) and re-validates it
against `issueStatusSchema` via a local `defaultStatusFor()` helper, falling back to `"backlog"`
if the stored value has drifted out of the closed vocabulary (`REQ-062`) since it was last
written. This defensive re-parse exists because the settings field is stored as an unconstrained
string, not an enum column, so a schema change to `ISSUE_STATUSES` could otherwise leave a
stale, now-invalid default sitting in an org's settings row.

### `issue-filter-bar.tsx` and `use-issue-filters.ts` exist but are not wired into this page

The component manifest lists `IssueFilterBar` (`src/components/domain/issue/issue-filter-bar.tsx`,
`{ filter, projects, members, onChange }`) and a matching hook, `useIssueFilters`
(`src/hooks/use-issue-filters.ts`, reading and writing an `IssueFilter` through the URL search
params), as complete pieces of the component library. Neither is imported by
`projects/[projectSlug]/issues/page.tsx` as currently written — the page builds its filter with a
local `parseStatuses()` helper reading `search.status` directly, rather than mounting
`IssueFilterBar` and letting `useIssueFilters` drive the URL. This is worth stating precisely
because it is easy to assume the presence of a documented component means it is wired into the
screen it seems designed for; here, the filter-bar component is available and schema-compatible
(both read and write the same `IssueFilter` shape from `src/schemas/issue.ts`) but this
particular route currently renders its filter chips implicitly — a caller changes the filter by
editing the URL (typically by following a link generated elsewhere, such as a saved view or the
search page) rather than through an on-page control. Wiring `IssueFilterBar` into this page is
tracked as a near-term enhancement rather than a bug, since the URL-driven behavior is still
fully functional and shareable — it simply lacks a visible in-page control for changing it.

### `IssueList` and the per-row permission pattern

`IssueList` (`{ issues, actor, emptyLabel?, onArchive? }`) receives the whole authorized
`actor` object rather than a precomputed array of per-row booleans, and decides internally,
row by row, whether to render the archive affordance on `IssueRow`
(`src/components/domain/issue/issue-row.tsx`) — this mirrors the pattern `screen-org-home.md`
describes for `ProjectCard`: the page authorizes the list as a whole (`issue:read` at the
top), and the leaf row component makes its own finer-grained call (`issue:archive`, which per
`ROLE_MATRIX` requires only `member` rank, unlike `issue:delete` which requires `admin`) using
the same `can()` function rather than a bespoke check duplicated in the row. `IssueRow` also
receives `assignee: User | null` directly rather than an id, since this page already resolved
full relations through `getIssue` for every row before handing them to `IssueList` — unlike the
org-home page's compact cards, which deliberately skip that resolution for cost reasons (see
`screen-org-home.md`).

### Bulk actions

`IssueBulkActions` (`src/components/domain/issue/issue-bulk-actions.tsx`,
`{ selected, actor, onArchive, onAssign }`) is listed in the component manifest as a toolbar
"shown when rows are selected," gated by `can()` the same way every other action-bearing
component in this directory is. Neither the project issue list nor the cross-project issue list
page currently renders a row-selection UI that would populate `selected` — bulk selection
(checkboxes on `IssueRow`, a "select all" control) is not part of either page's current
implementation, so `IssueBulkActions` exists in the component library ahead of the screen wiring
that would activate it. This is analogous to the `IssueFilterBar` gap above: a documented,
schema-correct component sitting one integration step away from being live on this screen,
rather than a component that has been removed or deprecated.

### Priority, status, and label pickers reused from issue detail

`IssuePrioritySelect` and `IssueStatusSelect` — the same two components `screen-issue-detail.md`
documents inside `IssueDetail`'s metadata rail — are not rendered on either list screen directly;
list rows show status and priority as read-only badges (via `IssueCard`/`IssueRow`'s own internal
rendering, not a picker), and changing either field requires navigating into the issue's own
detail page or, for status specifically, using the board's drag interaction documented in
`screen-project-board.md`. This is a consistent pattern across the whole issue-browsing surface:
list and board views are for finding and skimming; the detail page is where a single issue's
fields actually get edited, aside from the board's one dedicated drag-to-change-status shortcut.
`IssueLabelPicker`, similarly, only appears inside `IssueForm` (the create/new-issue screen) and
`IssueDetail` — neither list route offers inline label editing from a row.

### States

| state | screen | trigger | what the user sees |
|---|---|---|---|
| empty | project list, cross-project list | zero issues match the filter | `EmptyState`: "No issues match this filter", description "Clear the filter, or file the first issue in this project." |
| loading | project list | client navigation | `projects/[projectSlug]/issues/loading.tsx` |
| loading | issue detail's list-adjacent nav | n/a | see `screen-issue-detail.md` |
| error | any | thrown error resolving project or org context | `[orgSlug]/error.tsx` (no dedicated `error.tsx` under `issues/`) |
| permission denied | project list, new issue | `issue:read` / `issue:create` absent | `notFound()` |
| flag off | none of these three | — | — |
| plan limit reached | new issue | `existing.total >= limits.issuesPerProject` (archived counted) | "This project is full" panel; form never rendered, no members/labels fetched |
