---
title: Project screens
id: UI-PROJECTS
status: approved
owners: [m.lindqvist]
last_updated: 2026-08-12
related: [REQ-043, REQ-044, REQ-045, REQ-050, DES-108, DES-111, DES-233, ADR-008]
---

# Project screens

Four screens share this file because they form one lifecycle — list, create, view, edit/archive
— and because none of the four is individually large enough to warrant 1600 words on its own.

## SCR-002 — Project list

- **Route:** `/{orgSlug}/projects`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/page.tsx`
- **Server or client:** Server Component
- **Permission required:** `project:read` to view; `project:create` gates the "New project"
  link and is checked against a **pending** project resource (`PENDING_PROJECT_ID` from
  `src/actions/_lib/permission-resources.ts`) — a placeholder branded id that lets a
  create-time check reuse the same `PermissionResource` shape a real project would use
  (`DES-224`)
- **Feature flag:** none
- **Data loaded:** `listProjects(actor, { orgId, query?, includeArchived, limit, cursor })`
  from `src/server/services/project-service.ts`, keyset-paginated (`ADR-008`) through
  `searchParamsPaginationSchema` (`src/schemas/pagination.ts`)
- **Components:** `ProjectCard` (`src/components/domain/project/project-card.tsx`),
  `EmptyState`
- **Actions invoked:** none directly — creation and archiving happen on separate routes
- **Satisfies:** REQ-041, REQ-044, REQ-046, REQ-052
- **Design:** DES-188, DES-190

### Layout

A header row with the page title, a live count (`{page.total} projects{", archived included"
if the toggle is on}`), and two controls on the right: a text link that toggles
`?archived=1` (labelled "Show archived" / "Hide archived" depending on current state) and,
conditionally, a "New project" button linking to `/{orgSlug}/projects/new`. Below that, a
responsive card grid (1/2/3 columns by breakpoint) of `ProjectCard`s, each showing the
project's stats and linking to its slug-based detail route. `?q=` filters by a free-text
`query` param passed straight into `listProjects`; there is no dedicated filter-bar component
on this screen the way `screen-project-issues.md` has one — filtering here is URL-driven only.

The archive toggle is the one control worth dwelling on: `REQ-046` states archived projects are
hidden from default listings, and this page is the *only* place in the whole dashboard where
that default can be flipped back — no other screen exposes `includeArchived`. `DES-190`
documents why the repository's slug-uniqueness scan includes archived rows even though this
list hides them by default: a restored project must not collide with a slug some *other*,
still-active project claimed while the first one was archived.

### SCR-003 — New project

- **Route:** `/{orgSlug}/projects/new`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/new/page.tsx`
- **Server or client:** Server Component shell, client form (`ProjectForm`)
- **Permission required:** `project:create` — a 404 (via `notFound()`), not a disabled form,
  when absent
- **Feature flag:** none
- **Data loaded:** `getOrganizationSummary(actor, org.id)` for `usage.projectsUsed`,
  `getPlanLimits(summary.organization.plan)` (`src/config/plan-limits.ts`), then either
  `listMembers` + `suggestProjectSlug` (only when the quota has room) or nothing further
- **Components:** `ProjectForm` (`src/components/domain/project/project-form.tsx`)
- **Actions invoked:** `createProjectAction` (`src/actions/projects/create-project.ts`)
- **Satisfies:** REQ-041, REQ-043
- **Design:** DES-108, DES-233

The quota check happens *before* the form is ever built: if `summary.usage.projectsUsed >=
limits.projects`, the page renders a "Project limit reached" message with links back to the
project list and to Settings → Billing, and never fetches members or a suggested slug. This
mirrors `DES-233` — the project quota deliberately counts archived projects, so archiving one
does not free up room, and the copy on this page says so plainly ("archive one you have
finished with, or upgrade the plan" points at *archiving*, which frees room via a different
mechanism: an archived-and-then-deleted project would, but the message intentionally does not
promise archiving alone helps, since it does not). When room exists, `?name=` seeds the form's
name field and triggers a `suggestProjectSlug(org.id, suggestedName)` call so the slug preview
is pre-filled — `DES-108` documents that the key is derived from the name only once, at
creation, and is never touched again, and `DES-114` notes `suggestProjectSlug` itself takes no
`Actor` and performs no authorization (it is a pure derivation, safe to call before the create
permission is even known). `ProjectForm` binds to `createProjectSchema` and previews the slug
client-side with `slugify` before the real suggestion round-trips.

### SCR-004 — Project overview

- **Route:** `/{orgSlug}/projects/{projectSlug}`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/page.tsx`, shell in
  `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/layout.tsx`
- **Server or client:** Server Component
- **Permission required:** none additional beyond resolving the project at all — visibility is
  enforced inside `getProject` (called by `loadProjectContext`,
  `src/app/(dashboard)/[orgSlug]/_lib/project-context.ts`), which 404s a private project the
  caller is not on rather than rendering it empty
- **Feature flag:** the surrounding layout conditionally shows a "Board" tab only when
  `flags.kanban_board` is true
- **Data loaded:** `loadProjectContext` (org, actor, flags, project, `ProjectStats`) plus
  `listIssues(actor, { orgId, projectId, limit: 10 })` for the "Recently updated" section
- **Components:** `ProjectHeader` (rendered by the layout, not this page —
  `src/components/domain/project/project-header.tsx`), `IssueCard`, `EmptyState`
- **Actions invoked:** none
- **Satisfies:** REQ-050, REQ-054
- **Design:** DES-112, DES-113

The page body is deliberately thin: a three-up stat strip (Open / Closed / Overdue, from
`ProjectStats`), an optional description paragraph, and a "Recently updated" list of up to 10
issues linking into `.../issues/{issue.number}`. The title bar, project key badge, lead avatar
and the Overview/Issues/Board/Settings sub-navigation all belong to the surrounding
`ProjectLayout`, not to this page — which is why the page component has no `<h1>` of its own.
`DES-112` is the fact worth citing here: `getProject` composes the project row and its stats
from a second repository call, but both are scoped by the *same* permission check — there is no
window where a caller can see the stats of a project whose row they could not read.

### SCR-005 — Project settings

- **Route:** `/{orgSlug}/projects/{projectSlug}/settings`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/page.tsx`
- **Server or client:** Server Component shell, client forms (`ProjectSettingsForm`,
  `ArchiveProjectPanel`)
- **Permission required:** `project:update` to reach the page at all (404 otherwise);
  `project:archive` — a *different, higher* action in `ROLE_MATRIX` — separately gates whether
  the archive block renders
- **Feature flag:** none
- **Data loaded:** `loadProjectContext`, then `listMembers(actor, { orgId, limit: 100 })` for
  the lead picker inside `ProjectSettingsForm`
- **Components:** `ProjectSettingsForm` (`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/project-settings-form.tsx`),
  `ArchiveProjectPanel` (`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/settings/archive-project-panel.tsx`)
- **Actions invoked:** `updateProjectAction` (`src/actions/projects/update-project.ts`),
  `archiveProjectAction` (`src/actions/projects/archive-project.ts`)
- **Satisfies:** REQ-045, REQ-047, REQ-048
- **Design:** DES-109, DES-111, DES-235

Two independently permissioned sections stacked in one page: "Project details" (name, slug is
immutable so it is not editable here, description, lead, visibility) always renders once the
page-level `project:update` gate passes, and the amber-bordered "Archive this project" section
renders only when `project:archive` — checked against the *same* `resource` object built once
at the top of the function and reused for both checks — also passes. This two-tier gate exists
because `ROLE_MATRIX` ranks `project:archive` above `project:update`: a member can edit a
project's description but only an admin can archive it. `DES-235` documents a related subtlety
this form has to respect: the `visibility` permission is judged against what the project is
*becoming*, not what it currently is, so flipping a project from private to public is checked
against the public-visibility resource shape even mid-edit. `ArchiveProjectPanel` defaults its
`archiveIssues` toggle to true (`DES-232`) — leaving live issues under an archived project is
the corrupting state every count in `ProjectStats` would otherwise have to special-case, so the
UI does not offer "archive but keep issues open" as the default path, only as an opt-out.

### `ProjectSwitcher` and visibility's interaction with `public_projects`

`ProjectSwitcher` (`src/components/domain/project/project-switcher.tsx`, `{ projects,
currentSlug, orgSlug }`) is a separate, smaller navigation surface from the four screens
documented above — it is rendered inside the project layout's header area for quick lateral
navigation between projects without returning to the full list, and it is seeded from the same
`listProjects` call the tenant layout already makes for the sidebar (`SIDEBAR_PROJECT_LIMIT =
12`), not a fresh query of its own. None of the four screens in this file render
`ProjectSwitcher` directly; it belongs to the project-scoped layout shell that wraps
`screen-project-board.md`, `screen-project-issues.md` and `screen-issue-detail.md`'s routes, and
is mentioned here because its data source is this file's `listProjects` service call, making it
worth citing alongside the screens that call the same function.

`REQ-050` ties project visibility to the `public_projects` flag (plan >= enterprise,
overridable): a project's `visibility` field can be `private` or `public`, but the `public`
value only has an externally-visible effect once the org's plan (or override) enables
`public_projects` — none of the four screens in this file render any different UI depending on
that flag directly, since visibility is a per-project setting edited on the settings screen
(`ProjectSettingsForm`) regardless of whether the flag is currently on, and `DES-235`'s point
about the permission being judged against the project's *becoming* state applies identically
whether or not `public_projects` happens to be enabled at edit time. The flag's actual effect —
whether a public project becomes reachable by someone outside the organization at all — is a
concern for the request-routing and permission layers this directory does not itself implement,
not for these four screens' own rendering logic.

### States

| state | screen | trigger | what the user sees |
|---|---|---|---|
| empty | list | zero projects match the current `?q=`/`?archived=` filter | `EmptyState`: "No projects yet", description varies by `mayCreate` — "Create the first one…" vs "Ask an admin to create one…" |
| empty | overview | zero issues in the project | `EmptyState`: "No issues in this project yet" |
| loading | all four | client navigation while server data resolves | nearest `loading.tsx` in the segment tree: `projects/[projectSlug]/loading.tsx` for the overview, `[orgSlug]/loading.tsx` for the list (no dedicated `loading.tsx` under `projects/`) |
| error | overview, settings | thrown error inside project resolution | `projects/[projectSlug]/not-found.tsx` for an unresolvable slug (unknown or a private project the caller cannot see — the two are indistinguishable by design); `[orgSlug]/error.tsx` for anything else |
| permission denied | new, settings | `project:create` / `project:update` absent | `notFound()` — a plain 404, not an explanatory message, because a caller without the permission should not learn the route exists |
| flag off | none of these four | — | — |
| plan limit reached | new | `projects.total >= limits.projects` (archived projects included) | "Project limit reached" panel with links to the project list and to billing, form never rendered |
