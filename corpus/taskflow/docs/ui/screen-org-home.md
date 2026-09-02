---
title: Organization overview
id: UI-ORG-HOME
status: approved
owners: [m.lindqvist]
last_updated: 2026-08-11
related: [DES-020, DES-022, REQ-008, REQ-211, ADR-021]
---

# Organization overview

## SCR-001 — Organization overview

- **Route:** `/{orgSlug}`
- **Files:** `src/app/(dashboard)/[orgSlug]/page.tsx`, shell in
  `src/app/(dashboard)/[orgSlug]/layout.tsx`
- **Server or client:** Server Component throughout; no client boundary on this page itself
  (the shell it renders inside has client pieces — see below)
- **Permission required:** `org:read` implicitly (anyone who resolved an `Actor` for this org
  can read the overview); `org:manage_billing` gates whether the usage section renders
- **Feature flag:** none directly, though the shell around it (`DashboardShell`) reads
  `command_palette` to decide whether the search link in the sub-header shows
- **Data loaded:** `listIssues(actor, { orgId, assigneeId: actor.userId, status: ["todo",
  "in_progress", "in_review"], limit: 8 })` and `listProjects(actor, { orgId, limit: 6 })` from
  `src/server/services/issue-service.ts` and `src/server/services/project-service.ts`, run in
  parallel with `getBillingSummary(actor, org.id)` from
  `src/server/services/billing-service.ts` — but only when `can(actor, "org:manage_billing",
  { kind: "billing", orgId: org.id })` is true; otherwise the third promise resolves to `null`
  without ever calling the service
- **Components:** `IssueCard` (`src/components/domain/issue/issue-card.tsx`), `ProjectCard`
  (`src/components/domain/project/project-card.tsx`), `UsagePanel`
  (`src/components/domain/billing/usage-panel.tsx`), `EmptyState`
  (`src/components/ui/empty-state.tsx`)
- **Actions invoked:** none — this page is read-only; every interactive element is a `Link`
- **Satisfies:** REQ-008, REQ-211
- **Design:** DES-020, DES-022

### Layout

The page sits inside the tenant shell built by `[orgSlug]/layout.tsx`
(`DashboardShell` — see `conventions.md`), so what appears above the content column — the
sidebar filtered by `visibleNav()`, the top bar with search and the notification bell, and the
"New project" shortcut when `project:create` allows it — is identical to every other screen in
this directory and is not repeated here.

The page body itself is three stacked sections, none of which paginate:

1. **Header.** The organization's display name as an `h1`, and a one-line summary combining
   the project count and the number of issues assigned to the current actor
   (`{projects.total} projects · {issues.total} issues assigned to you`). Both counts come from
   the `total` field of the page objects returned by `listProjects`/`listIssues`, not from
   `.length` on the truncated `.items` array — the summary line is always accurate even though
   only 6 projects and 8 issues actually render below it.
2. **"Assigned to you."** A capped list (limit 8) of the actor's own open-status issues
   (`todo`, `in_progress`, `in_review` — explicitly excluding `done`, `cancelled` and any
   archived issue, since `listIssues` defaults `includeArchived` to false). Each row is an
   `IssueCard` in `compact` mode, linking to `/{orgSlug}/issues?issue={id}` — a link into the
   cross-project issue list rather than directly into the issue detail route, because the
   overview does not know which project the issue belongs to without an extra join the page
   deliberately avoids. A "All issues" link beside the section heading goes to
   `/{orgSlug}/issues`.
3. **"Projects."** A responsive grid (1/2/3 columns) of up to 6 `ProjectCard`s, each carrying
   its own `ProjectStats` (open/closed/overdue counts) fetched as part of the same
   `listProjects` call — no per-card fetch. A "All projects" link goes to `/{orgSlug}/projects`.
4. **"Usage"** (conditional). Only rendered when `billing !== null`, i.e. only for an actor
   who can manage billing. `UsagePanel` renders every quota meter in the `BillingSummary` at
   once — seats, projects, issues, storage, API requests, webhooks — each one a `UsageMeter`
   wrapping the shared `Progress` primitive with a tone derived from how close usage sits to
   the plan's ceiling.

The section ordering — assigned issues, then projects, then usage — is deliberate: the page
answers "what do I need to look at" before "what exists" before "what am I spending", and the
billing section sitting last (and being entirely absent for most actors) keeps a viewer or
member's landing page from being dominated by numbers they cannot act on.

### The mayReadBilling short-circuit

The most important single line on this page is:

```
mayReadBilling ? getBillingSummary(actor, org.id) : Promise.resolve<BillingSummary | null>(null)
```

`getBillingSummary` is not merely hidden behind a conditional render — the service call itself
is skipped for an actor who cannot see it, inside the same `Promise.all` that fetches issues
and projects. This matters for two reasons the spec is worth stating explicitly: first, it
means a viewer or member never causes a billing-service invocation on every visit to their own
org's home page, which keeps the read path cheap for the large majority of dashboard traffic
that has no reason to touch billing at all. Second, it is a small illustration of the same
principle `DES-153` documents at the service layer — `getOrganizationSummary` and
`listOrganizationsForUser` deliberately have different authorization shapes depending on who is
asking — carried one layer up into the page component itself.

### Card rendering: what `IssueCard` and `ProjectCard` do and don't show

`IssueCard` (`src/components/domain/issue/issue-card.tsx`) takes `{ issue, assignee?, labels?,
href, compact? }`. This page always passes `compact` (both in the "Assigned to you" list and
implicitly wherever it is reused elsewhere), which trims the card down to title, key, status
badge and assignee avatar — the full label chip row and description preview that a non-compact
`IssueCard` would show on a dedicated issue list are omitted here deliberately, since the
overview's job is to let an actor recognize an issue at a glance and click through, not to
substitute for the issue detail page. Notably, this page does not pass `labels` at all — the
`listIssues` call powering the "Assigned to you" section returns bare `Issue` rows, not the
`IssueWithRelations` shape `getIssue` would produce, so there is no label data available to
pass even if the compact card rendered it. This is a deliberate cost tradeoff: fetching full
relations for up to 8 rows on every visit to the org home page would mean 8 additional
`getIssue`-equivalent calls beyond the one `listIssues` query, for a card that would not display
the extra data anyway.

`ProjectCard` (`src/components/domain/project/project-card.tsx`) takes `{ project, stats, href,
actor }` — passing `actor` is what lets the card itself decide, via an internal `can()` check,
whether to render any per-card action affordance (an archive shortcut, for instance) without the
overview page needing to compute that per row. This is the same "the page does authorization
once, the leaf component decides its own micro-affordances" pattern documented for `IssueList`'s
`IssueRow` in `screen-project-issues.md`.

### Caching and the constants that bound this page's cost

Two module-level constants cap what this page ever fetches: `RECENT_ISSUE_LIMIT = 8` and
`PROJECT_LIMIT = 6`. Neither is sourced from `PlanLimits` or any other config table — they are
fixed UI-layer constants chosen for layout reasons (a 3-column project grid reads awkwardly with
anything that does not divide cleanly into rows of three, and 6 gives two full rows on the
common breakpoint), not because of a data-volume concern. This is worth calling out because it
differs from every quota-driven limit elsewhere in this directory (`issuesPerProject`,
`limits.seats`, `limits.webhooks`): those numbers come from the org's plan and change the actor's
capabilities, while `RECENT_ISSUE_LIMIT` and `PROJECT_LIMIT` only change how much of an
otherwise-larger result set this one page chooses to show, with "All issues" and "All projects"
links as the intended path to the rest.

The page is marked `export const dynamic = "force-dynamic"`, matching every other route
documented in this directory — Taskflow's dashboard routes do not rely on Next.js's static or
ISR rendering modes for authenticated, per-actor content, since every one of them depends on the
resolved `Actor` and would otherwise risk serving one organization's cached HTML to another. Cache
freshness for the *data* this page reads (issues, projects, billing) is instead governed by the
cache-tag vocabulary documented in `DES-070` through `DES-077` — a mutation elsewhere in the app
(creating an issue, for instance) calls `revalidateTagged()` against the relevant `issueTag`/
`projectTag`, which is what causes this page's next render to reflect the change, not any
timer-based revalidation on the page itself.

### States

| state | trigger | what the user sees |
|---|---|---|
| empty (no assigned issues) | actor has zero open issues assigned to them | `EmptyState` titled "Nothing on your plate", description "Issues assigned to you show up here as soon as somebody picks you." The Projects and (if visible) Usage sections still render normally — this is a per-section empty state, not a whole-page one. |
| empty (no projects) | `projects.total === 0`, which can only happen immediately after `REQ-014`'s onboarding seed was somehow skipped or the seeded project was archived and excluded | The grid renders zero `ProjectCard`s with no explicit empty-state copy for this section — the page does not special-case it, since a brand-new org's onboarding flow (`REQ-014`) is expected to have already created one project before this page is ever reached in practice. |
| loading | client-side navigation to `/{orgSlug}` while the layout's own data (org, actor, flags, projects for the sidebar, unread count) is still resolving | `[orgSlug]/loading.tsx`'s skeleton: a fixed-width sidebar skeleton plus a page-title skeleton and eight rectangular row skeletons in the content column, `aria-busy="true"` on the wrapper. |
| error | any thrown error while loading tenant context or the three parallel queries — most commonly `TenantScopeError` from `assertOrgScope()` inside `loadTenantContext()` | `[orgSlug]/error.tsx`, a client error boundary matching on `error.name`: `TenantScopeError` renders "Wrong organization" with guidance to switch orgs; anything unrecognized falls back to a generic "Something went wrong" with a retry button (`reset()`). |
| permission denied | not directly reachable — every actor who can resolve as a member of the org can view the overview; there is no permission that gates the page itself | n/a — the overview has no not-found or permission-denied branch of its own. The nearest analogue is the conditional billing section, which is not a denial state, just an absent section. |
| flag off | none apply to this page directly | — |
| plan limit reached | the overview does not enforce any quota; it only reports them via `UsagePanel` | A meter approaching or exceeding a limit renders in `warning` or `danger` tone via `Progress`'s `tone` prop, but nothing on this page blocks an action — quota enforcement happens on the pages that create the resource (`projects/new`, `issues/new`, `settings/members`). |
