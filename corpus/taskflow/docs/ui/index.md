---
title: UI screen index
id: UI-INDEX
status: approved
owners: [platform-team]
last_updated: 2026-08-11
related: [DES-010, DES-020, REQ-211, ADR-001]
---

# UI screen index

This directory documents every route rendered by the tenant dashboard — the subtree that
lives under src/app/(dashboard)/[orgSlug]/ — plus the design-system conventions those
routes share. It does not cover the marketing site (src/app/(marketing)/) or the
unauthenticated auth flows (src/app/(auth)/); both are thin enough that `conventions.md`
covers what they borrow from the dashboard layer and nothing more is warranted.

Every screen spec follows the same shape: route, files, server/client split, the permission
and flag that gate it, the data it loads, the real components and actions it wires together,
which requirements and design docs it satisfies, and a state table covering empty, loading,
error, permission-denied, flag-off and quota-reached where each applies. `conventions.md`
covers what is common to all of them — the src/components/ui/ primitives, role-aware
navigation, optimistic updates, the client-side flag snapshot, and the Next.js 16 rules every
page under `[orgSlug]` obeys.

## Route map

| route | spec | permission | flag | notes |
|---|---|---|---|---|
| `/{orgSlug}` | [screen-org-home.md](./screen-org-home.md) | `org:read` | — | recent issues, projects, usage |
| `/{orgSlug}/projects` | [screen-projects.md](./screen-projects.md) | `project:read` | — | archive toggle in the URL |
| `/{orgSlug}/projects/new` | [screen-projects.md](./screen-projects.md) | `project:create` | — | quota-gated |
| `/{orgSlug}/projects/{projectSlug}` | [screen-projects.md](./screen-projects.md) | `project:read` (via `getProject`) | — | overview, stats |
| `/{orgSlug}/projects/{projectSlug}/settings` | [screen-projects.md](./screen-projects.md) | `project:update`, `project:archive` | — | archive block is separately gated |
| `/{orgSlug}/projects/{projectSlug}/board` | [screen-project-board.md](./screen-project-board.md) | `issue:read`, `issue:update` to drag | `kanban_board` | redirects to the issue list when off |
| `/{orgSlug}/projects/{projectSlug}/issues` | [screen-project-issues.md](./screen-project-issues.md) | `issue:read` | — | filters live in the URL |
| `/{orgSlug}/projects/{projectSlug}/issues/new` | [screen-project-issues.md](./screen-project-issues.md) | `issue:create` | — | per-project quota, archived issues count |
| `/{orgSlug}/projects/{projectSlug}/issues/{issueNumber}` | [screen-issue-detail.md](./screen-issue-detail.md) | `issue:read` | — | number is scoped to org + project |
| `/{orgSlug}/issues` | [screen-project-issues.md](./screen-project-issues.md) | `issue:read` | — | cross-project "my issues" |
| `/{orgSlug}/search` | [screen-search.md](./screen-search.md) | — (read-only, no gate beyond membership) | `advanced_search` narrows kinds | shares `search()` with the command palette |
| `/{orgSlug}/inbox` | [screen-inbox.md](./screen-inbox.md) | `notification:read` | — | `@panel/notifications` mirrors it |
| `/{orgSlug}/activity` | [screen-activity.md](./screen-activity.md) | `activity:read` | `activity_feed` | flag-off renders an upsell, not a 404 |
| `/{orgSlug}/settings` | [screen-settings-org-and-members.md](./screen-settings-org-and-members.md) | `org:read` (read), `org:update` (write) | — | renders read-only rather than 404 for a viewer |
| `/{orgSlug}/settings/members` | [screen-settings-org-and-members.md](./screen-settings-org-and-members.md) | `member:read`, `member:invite` | — | seat quota drives the invite form |
| `/{orgSlug}/settings/members/invitations` | [screen-settings-org-and-members.md](./screen-settings-org-and-members.md) | `member:read` | — | revoke only, no resend UI |
| `/{orgSlug}/settings/labels` | [screen-settings-org-and-members.md](./screen-settings-org-and-members.md) | `org:update` (write) | — | read-only for everyone else |
| `/{orgSlug}/settings/danger` | [screen-settings-org-and-members.md](./screen-settings-org-and-members.md) | `org:delete` | — | owner-only, 404s otherwise |
| `/{orgSlug}/settings/billing` | [screen-settings-billing-flags-webhooks.md](./screen-settings-billing-flags-webhooks.md) | `org:manage_billing` | — | plan cards from `PLAN_LIMITS` |
| `/{orgSlug}/settings/billing/invoices` | [screen-settings-billing-flags-webhooks.md](./screen-settings-billing-flags-webhooks.md) | `org:manage_billing` | — | |
| `/{orgSlug}/settings/flags` | [screen-settings-billing-flags-webhooks.md](./screen-settings-billing-flags-webhooks.md) | `org:manage_flags` | — | only `overridable` flags accept a toggle |
| `/{orgSlug}/settings/webhooks` | [screen-settings-billing-flags-webhooks.md](./screen-settings-billing-flags-webhooks.md) | `webhook:manage` | `webhooks` | permission is a 404, flag/quota are explanations |

`/{orgSlug}/profile` and `/{orgSlug}/settings/notifications` are documented as the two
deliberate layering exceptions in `conventions.md` rather than getting their own spec — both
are single-form pages with no state machine worth a table of their own, and their notable
property is architectural (bypassing the service layer), which is a convention-level fact,
not a screen-level one.

## Reading order

Start with `conventions.md` — every screen spec assumes you already know what `PermissionGate`,
`visibleNav()`, `useOptimisticIssues` and the flag snapshot do, and none of them re-explain it.
Then read screens roughly in navigation order: `screen-org-home.md` is the landing page every
authenticated session reaches, `screen-projects.md` through `screen-issue-detail.md` cover the
core project/issue loop, and the remaining files cover the surfaces that sit beside it —
search, inbox, activity, and the two settings groupings.

## What a screen spec promises, and what it does not

Every file in this directory follows the shape defined in the brief this corpus was written
against: a metadata block (route, files, server/client split, permission, flag, data loaded,
components, actions, satisfies, design), prose describing the screen top to bottom, and a state
table. The metadata block is a lookup table, not prose — if you need the exact permission
resource shape a screen builds, read the screen's own page file directly (the path is always
given); the spec names the check but does not always reproduce the full `PermissionResource`
literal, since that would duplicate the source rather than explain it.

What these specs deliberately do **not** do: they do not describe visual design (colors,
spacing, exact Tailwind classes) beyond what is necessary to explain layout structure — that is
`s.duarte`'s design-system territory and belongs in Figma, not in an engineering corpus. They do
not describe the service or repository layer beyond what a screen's own behavior depends on —
`design/service-*.md` and `design/repository-*.md` are the authoritative source for that, and
this directory cites specific `DES-###` ids rather than re-explaining the services those ids
already document. And they do not attempt to be a test plan: `docs/test/` is where acceptance
criteria and test IDs live; this directory's state tables describe what a screen *does* render
in each state, which a test plan can then assert against, but they are not themselves assertions.

## Cross-reference density and how to extend this directory

Every REQ/DES id cited in these twelve files is a reference, never a definition — this
directory defines no REQ, DES or ADR ids of its own, only the informal `SCR-###` screen ids used
as heading prefixes within each file, which exist purely so a screen can be pointed at from
outside this directory (a test plan, a design review, an incident writeup) without ambiguity.
`SCR-###` numbering is sequential across the whole directory in the order screens are introduced
in `index.md`'s route map, starting at `SCR-001` for the organization overview; a screen spec
that documents more than one route (as most of the multi-route files in this directory do)
allocates one `SCR-###` per route, not per file.

If a new dashboard route is added to the corpus in the future, the update sequence is: add a row
to the route map above, allocate the next unused `SCR-###`, add or extend the relevant screen
spec file with the full metadata block and state table, and update `conventions.md` only if the
new route introduces a genuinely new shared pattern (a new kind of gate, a new class of
optimistic update) rather than reusing one already documented there. A route that merely reuses
existing conventions does not need `conventions.md` touched at all.

## Team ownership

Screen specs carry an `owners:` front-matter field naming the engineer whose area the screen
falls under, following the same roster `brief-common.md` defines for the whole corpus. As a
rough map: `m.lindqvist` (tech lead, issues & projects) owns the project and issue screens;
`r.saito` (billing & plans) and `k.ferreira` (search & webhooks) jointly own the two billing/
flags/webhooks and search-adjacent specs; `t.abara` (notifications & jobs) owns the inbox and
activity screens; `d.okafor` (staff engineer, platform) co-owns the organization-and-members
settings screens together with `r.saito`, reflecting that seat and billing quotas intersect with
membership management on that screen. `s.duarte` (design) is listed as a co-owner on
`conventions.md` and the activity screen specifically because both documents make explicit
design-intent claims (skeleton shapes, the permission-vs-flag rendering contrast) that a design
review should be able to hold the engineering team to.

## State-table conventions used across every spec

The seven columns every screen spec's state table draws from — empty, loading, error,
permission denied, flag off, plan limit reached — are not equally applicable to every screen,
and a spec marks a column "not applicable" or "n/a" rather than inventing a state that does not
exist for that route. A reader scanning across all twelve files will notice that "loading" is
almost always answered the same way (the nearest `loading.tsx` ancestor in the route segment
tree, per Next.js 16's file-based loading convention), while "error" varies more, since only a
handful of routes define a segment-scoped `error.tsx` of their own — the issue-detail page is
the one screen in this directory with a dedicated `error.tsx`, everything else falls back to the
tenant-level `[orgSlug]/error.tsx`. This pattern (most screens share the tenant boundary's error
handling, one screen has its own) is itself a fact worth knowing before reading the individual
specs, since it means a defect specific to, say, the members page will surface through the exact
same generic boundary as a defect on the billing page, with no members-specific error copy to
distinguish them.

"Permission denied" across this directory resolves almost universally to a bare `notFound()` —
Taskflow's dashboard deliberately does not render "you don't have access" messaging inline on
most screens, preferring the router-level 404 so a caller without a permission cannot even infer
that a route exists. The handful of exceptions where a screen renders read-only content instead
of 404ing (general organization settings, labels) are always ones where *viewing* requires a
lower-ranked permission than *editing* — `org:read` versus `org:update` — so the page can satisfy
the lower bar for everyone and gate only the mutating controls.

## Verification

Before this directory is considered complete, every file in it must pass three checks, run from
`corpus/taskflow/docs`: every source path backticked anywhere in this directory's files must appear
verbatim in the real file list; every REQ/DES/ADR id referenced must exist in the authoritative
catalogues and must never appear as the first token of a heading (which would incorrectly claim
to define it); and the aggregate word count across all twelve files, measured with `wc -w`, must
exceed the directory-level minimum this corpus's brief sets. These are the same three checks
every other documentation area in this corpus runs against its own output, so a reviewer
auditing more than one directory can reuse the identical verification script rather than writing
a bespoke one per area.
