---
title: Search
id: UI-SEARCH
status: approved
owners: [k.ferreira]
last_updated: 2026-08-12
related: [REQ-170, REQ-175, REQ-176, DES-154, DES-155, ADR-011]
---

# Search

## SCR-011 — Full-page search

- **Route:** `/{orgSlug}/search`
- **Files:** `src/app/(dashboard)/[orgSlug]/search/page.tsx`
- **Server or client:** Server Component; the query box is a plain HTML `<form>` submitting a
  GET request to the same route, not a client-side controlled input
- **Permission required:** implicitly `issue:read` — `search()` itself authorizes at
  `issue:read` regardless of what subject kind matched (`DES-154`), so there is no separate
  page-level `can()` call before rendering; an actor who cannot read issues will find every
  search call fails inside the service, surfacing as an empty result set rather than a 404
- **Feature flag:** `advanced_search` (plan >= enterprise, overridable) narrows which kinds are
  searched
- **Data loaded:** `search(actor, { orgId, q, kinds, limit: 30 })` from
  `src/server/services/search-service.ts`, only once `searchQuerySchema.safeParse()` accepts the
  input
- **Components:** `EmptyState`; the results list is inlined directly in the page rather than
  using the shared `SearchResults` domain component (`src/components/domain/search/search-results.tsx`,
  which the command palette's `SearchDialog` uses instead — see below)
- **Actions invoked:** none — the query is a GET form submission, not a Server Action
- **Satisfies:** REQ-170, REQ-175, REQ-176, REQ-177, REQ-178, REQ-179
- **Design:** DES-154, DES-155, DES-156

### Layout

A header with the page title and a plain `<form action="/{orgSlug}/search">` containing a single
`<input name="q" type="search">` — this is a genuine full-page-navigation form, not an
intercepted client submission, so every search is its own URL (`?q=...`) and is trivially
shareable and back-button-friendly. Below the header, one of three states: an empty-query
placeholder (`query.length === 0`), a "no results" `EmptyState`, or a flat list of hits. Each hit
renders its `kind` as an uppercase label, its `title`, and a `snippet` — `DES-156` documents that
title and snippet are derived from stored content after the repository call, not lifted from
whatever the original row currently contains, so a search result can show text as it was
indexed even if the underlying row has since changed in a way that has not yet re-indexed (see
`REQ-172`/`REQ-173` on the indexing side, covered in the search *design* docs, not repeated
here).

### Advanced search narrows kinds, it does not reject the query

When `advanced` (from `isEnabled("advanced_search", ...)`) is false, `kinds` passed to
`searchQuerySchema` is `["issue"]` only; when true, it is `["issue", "comment", "project"]`.
`DES-256` — cited here because the command palette's action follows the identical pattern —
documents the principle both surfaces share: a caller without `advanced_search` still gets a
working, if narrower, search rather than a blocked one. This page makes the narrowing visible
with a one-line note under the search box when `!advanced`: "Comments and projects are
searchable on the growth plan and above" (note: the visible copy says "growth plan and above"
while the flag registry's actual gate is `plan >= enterprise` — this is a known content/config
drift the team has flagged for a copy fix rather than a functional bug, since the flag
evaluation itself is correct; see the ops decision log for the open ticket).

### Rate limiting runs before the flag check

`DES-155` is worth restating on this page specifically because it changes what a throttled user
experiences: the `search:query` rate-limit bucket (120 capacity / 60 refill-per-minute) is
consumed *before* the service checks `advanced_search`, so a caller who has exhausted their
search budget gets a `rate_limited` error without ever learning whether their plan would have
included advanced search for that same query. This page has no dedicated rate-limit UI; a
`rate_limited` result presently falls through the same `!parsed.success` branch as an invalid
query, rendering "That query is not valid" — a known rough edge, since the copy is technically
inaccurate for a throttled request, tracked in the same ops backlog item as the plan-copy drift
above.

### The command palette shares this exact service call

`SearchDialog` (`src/components/domain/search/search-dialog.tsx`), opened via the Ctrl+K
`CommandPalette` primitive and `useCommandPalette` (`src/hooks/use-command-palette.ts`), calls
the same `search()` action through the JSON route `src/app/api/search/route.ts` rather than this
page's server-rendered path — a Route Handler exists here specifically because a client-side
palette overlay cannot await a Server Component's render, one of the handful of cases documented
generally as "Route Handlers exist only where a Server Action structurally cannot reach"
(`DES-007`). Both call sites must therefore keep their flag-gating logic in step by hand: the
palette narrows what it asks the JSON endpoint for, and this page narrows what it asks the
Server Component read path for, and a change to `advanced_search`'s semantics has to be applied
in both places since neither imports the other's gating logic.

### The command palette's own screen, briefly

`SearchDialog` is not documented as its own numbered screen in this directory because it is not
a route — it is a Ctrl+K overlay that can open from anywhere inside the tenant subtree, invoked
through `useKeyboardShortcut` (`src/hooks/use-keyboard-shortcut.ts`) bound at the shell level
and toggled by `useCommandPalette`. Its groups are built from the actor's own permissions and
flags (`mustUse: can, isEnabled` per the hooks manifest), which means the palette's group list —
"Go to a project," "Create an issue," "Search," and so on — is itself a smaller, command-shaped
analogue of `visibleNav()`: an item the actor cannot act on is simply absent from the list rather
than present-but-disabled. `SearchResults` (`src/components/domain/search/search-results.tsx`,
`{ hits, query, onSelect }`) is the component the palette uses to render its own hit list, and it
is worth noting explicitly that this is the *only* place `SearchResults` is actually used in the
current build — the full-page search route documented above renders its hits with page-local
markup rather than importing `SearchResults`, even though both surfaces query the identical
`search()` function with the identical `SearchHit` shape. A future refactor unifying the two
result renderers into one shared component is plausible but has not happened; today they are two
independently maintained presentations of the same data shape.

`useDebouncedValue` (`src/hooks/use-debounced-value.ts`) is what the palette's input binds
through before firing a query against the JSON search route — the full-page search route
documented above has no equivalent debounce, because it is not a live-typing surface at all; its
`<input name="q">` only ever submits on `Enter` or a form submit event (a native browser
behavior, not a client-side keystroke handler), so there is nothing to debounce. This is a small
but real behavioral difference between the two search surfaces worth keeping straight: the
palette narrows as you type (with debouncing to avoid firing a request per keystroke), while the
full page only searches once, on submission.

### What "results carry a snippet around the match" means in practice

`REQ-177` requires results to carry a snippet around the match; `DES-156` is the design-layer
explanation of how that snippet is produced — derived from the indexed content stored at write
time (`DES-212`: search documents are upserted by subject identity, not by row id), using a
"deliberately simple substring scan" (`DES-213`) rather than any ranked-relevance algorithm. From
this page's point of view, that means the snippet shown beneath a hit's title is not a smart
excerpt chosen for relevance — it is whatever surrounding text the substring match happened to
sit inside, truncated to a fixed length. A query that matches a common word deep inside a long
issue description will show a snippet centered on that occurrence, which may or may not be the
most informative part of the issue for a reader trying to decide whether to click through. This
is a known, accepted simplicity tradeoff (`ADR-011`'s companion decision docs cover the in-process
architecture that makes a more sophisticated ranked search comparatively expensive to build), not
a defect this page's UI attempts to compensate for.

### Why this screen has no dedicated loading skeleton

Unlike almost every other route documented in this directory, `search/page.tsx` has no
meaningfully separable "loading" moment beyond the ordinary tenant-shell skeleton, because the
page is entirely driven by a GET form submission rather than a client-side fetch layered on top
of an already-rendered shell — each search is a full navigation, and Next.js's own route
transition (not a component-level loading state) is what a user perceives between submitting a
query and seeing results. This is functionally identical to why the billing and settings screens
in `screen-settings-billing-flags-webhooks.md` also lack dedicated `loading.tsx` files: none of
them layer client-side data fetching on top of an already-visible shell the way, say, the board's
drag interaction does — every navigation to any of these routes re-renders the whole page
server-side from scratch, and the shared `[orgSlug]/loading.tsx` skeleton is what covers the gap
while that render is in flight.

### States

| state | trigger | what the user sees |
|---|---|---|
| empty (no query) | `query.length === 0` | `EmptyState`: "Search this organization", description explaining what's searchable at the current plan tier. |
| empty (no matches) | a valid, non-empty query returns zero hits | `EmptyState`: `` Nothing matches "{query}" ``. |
| loading | this route is server-rendered per navigation; there is no client-side incremental loading state on this particular page | No dedicated `loading.tsx` under `search/`; the nearest ancestor skeleton is `[orgSlug]/loading.tsx`. |
| error | `searchQuerySchema.safeParse()` rejects the input, or the underlying rate-limit bucket is exhausted | "That query is not valid" `EmptyState` — both failure modes currently render identical copy (see rate-limiting note above). |
| permission denied | not directly reachable — `search()` authorizes internally and a caller lacking `issue:read` simply never matches anything | No distinct permission-denied UI; behaves identically to a query with no matches. |
| flag off | `advanced_search` unavailable for the org's plan | Search still works; results are narrowed to issues only, and a note under the search box explains the narrower plan-gated scope. |
| plan limit reached | not applicable — search has no quota of its own beyond the rate-limit bucket | — |
