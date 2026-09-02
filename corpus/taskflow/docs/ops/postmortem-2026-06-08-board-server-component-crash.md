---
title: Postmortem — board and settings pages crash on render
id: OPS-PM-2026-06-08
status: approved
owners: [m.lindqvist, d.okafor]
last_updated: 2026-06-11
related: [DES-005, DES-007, DES-020, ADR-001, ADR-021]
---

## Summary

A deploy on 2026-06-08 made the project board page and the billing settings page
completely unrenderable for every organization. Both routes threw a React error at
render time — an event handler prop (`onClick`) passed to a DOM element from inside a
Server Component — because two Client Components used by both routes,
`src/components/domain/issue/issue-row.tsx` and
`src/components/domain/billing/billing-plan-card.tsx`, were missing the `"use client"`
directive at the top of the file. Next.js 16's React Server Components model treats a
component without that directive as server-rendered by default regardless of where it
is imported from; both components genuinely need to run on the client because they
attach `onClick` handlers directly to `<button>` elements, and a function value passed
as a prop to a DOM element from server-rendered output is a hard render error, not a
warning. The break affected 28 distinct error occurrences across the two routes before
rollback, captured by Next.js's error boundary and reported via `onRequestError` in
`src/instrumentation.ts`.

## Impact

- Two routes fully broken for all organizations: the project board
  (`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/board/page.tsx`, which renders
  `IssueRow` inside its columns) and the billing settings page
  (`src/app/(dashboard)/[orgSlug]/settings/billing/page.tsx`, which renders
  `BillingPlanCard`).
- 28 error occurrences logged via `onRequestError` before the rollback, spanning both
  routes across multiple organizations that happened to load either page during the
  affected window.
- No data was written incorrectly and no security boundary was crossed — this was a
  pure rendering failure. Every affected user saw Next.js's error boundary
  (`src/app/(dashboard)/[orgSlug]/error.tsx` for the board route's ancestor layout, or
  the more specific `.../issues/[issueNumber]/error.tsx` boundary structure for
  adjacent routes) rather than a blank page or stale content.
- Window of impact: approximately 40 minutes from deploy to rollback.

## Timeline

| time (UTC) | event |
|---|---|
| 2026-06-08 14:02 | A refactor PR touching `IssueRow` and `BillingPlanCard` merges; the diff extracted shared formatting helpers into `src/lib/format.ts` and, in the process, the top-of-file `"use client"` directive was dropped from both components during a file-move step in the same commit |
| 2026-06-08 14:15 | Deploy completes; `pnpm build` had succeeded, because a missing `"use client"` directive is not by itself a type error or a build-time failure — the component still compiles as a valid Server Component, it simply behaves incorrectly the moment it renders a DOM `onClick` |
| 2026-06-08 14:18 | First error captured via `onRequestError` for the board route |
| 2026-06-08 14:19 | First error captured for the billing settings route |
| 2026-06-08 14:22 | On-call notices error rate spike scoped to exactly these two routes |
| 2026-06-08 14:30 | `m.lindqvist` reproduces locally with `pnpm build && pnpm start`, confirms the stack trace points at `onClick` being passed from a Server Component context, and identifies both files as missing `"use client"` |
| 2026-06-08 14:38 | Fix prepared: `"use client"` restored as the first line of both files |
| 2026-06-08 14:42 | Deploy of the fix begins |
| 2026-06-08 14:52 | Deploy completes; error rate returns to zero |
| 2026-06-08 15:10 | Total of 28 error occurrences confirmed across both routes for the incident window |
| 2026-06-11 | Postmortem published; action items filed |

## Root cause

`DES-007` and the file-level doc comments on both components explain exactly why each
one must be a Client Component: `issue-row.tsx`'s comment states plainly that "the
inline arrow is still a function on a DOM element" even when the callback prop itself is
absent, and `billing-plan-card.tsx`'s comment explains the tile owns a click handler so
it has to cross the server/client boundary explicitly via `"use client"`, with
`onSelect` as the page's inline Server Action crossing back legally. Next.js 16's
compiler has no static check that catches a Client Component's directive being dropped
during a refactor — a component missing `"use client"` is not invalid TypeScript and not
an invalid React tree in the abstract; it is only wrong once React actually tries to
serialize a function value (the `onClick` handler) as part of server-rendered output,
which happens at request time, not build time. `pnpm build` genuinely cannot catch this
class of mistake with the toolchain currently in place, because Next.js does not fail
the build when a component that would need client rendering lacks the directive — it
only fails when that component is *actually rendered* in a context requiring the
client boundary, and neither `pnpm build` nor `pnpm typecheck` renders every component
tree with representative props.

The refactor that caused this moved both files as part of a broader reorganization
alongside the extraction of `src/lib/format.ts`'s `formatCents`/`formatLimit` helpers
(used by `BillingPlanCard`) and `formatRelative`/`isOverdue`/`humanizePriority`/
`humanizeStatus` (used by `IssueRow`). The file-move tooling used for that refactor
preserved import statements correctly but did not preserve the leading directive
comment, because directive-preservation was not something the tooling was built to
guarantee — it treats a leading string literal like ordinary dead code that a formatter
is free to reposition, and in this case it was dropped rather than repositioned.

## Detection

Detection was fast and automated: `onRequestError` in `src/instrumentation.ts` logs
every render-time error with the route path and method, and the on-call engineer's
dashboard aggregates these by route. The error rate spike on exactly two routes,
starting within three minutes of the deploy, was an unambiguous signal, and time to
diagnosis was itself fast (twelve minutes) once someone opened the actual stack trace,
which named the offending component directly.

## Resolution

The fix was a two-line change — restoring `"use client"` as the literal first line of
each file, above the file's own doc comment, matching Next.js's requirement that the
directive be the first statement in the module. No other change was required; both
components' logic was otherwise correct, and neither `formatCents`/`formatLimit` nor the
issue-row formatting helpers needed any change. The rollback-then-fix cycle took about
24 minutes end to end from first error to error rate returning to zero.

## What went well / what did not

**What went well:**
- Automated error capture via `onRequestError` caught the problem within minutes with no
  reliance on customer reports.
- The fix was small, well-understood, and low-risk to redeploy quickly once identified —
  there was no ambiguity about what the correct fix was, because both files' own doc
  comments already explained why they needed to be Client Components.
- No data integrity or security impact meant the incident response could focus entirely
  on restoring the two routes, with no parallel data-cleanup workstream.

**What did not go well:**
- `pnpm build` and `pnpm typecheck` both passed on the broken commit; the toolchain has
  no automated check for a Client Component silently losing its `"use client"`
  directive during a refactor, which is exactly the kind of mechanical mistake automated
  refactor tooling should be expected to introduce occasionally.
- The refactor's own code review did not catch the dropped directive, likely because
  the diff view for a file move plus a trivial one-line removal at the top of the file
  is easy to skim past when the bulk of the diff is import-path churn.
- There is no local or CI smoke test that renders the board or billing settings routes
  end to end before deploy; the first real render of either route with the broken
  components was in production.

## Action items

| action | owner | status |
|---|---|---|
| Add an ESLint rule (or a custom check) that flags a component file containing a JSX element with an `onClick`/`onChange`/etc. handler prop but no `"use client"` directive | d.okafor | done |
| Add a lightweight render smoke test for the board and billing settings routes to the test suite so a missing client boundary fails `pnpm test`, not only production | h.iqbal | done |
| Audit file-move refactor tooling used elsewhere in the codebase for the same directive-dropping risk | d.okafor | done |
| Add a code review checklist reminder for any diff touching a file with a `"use client"` directive: confirm the directive survives the diff | m.lindqvist | done |

## Follow-up: the broader pattern this incident revealed

This was not the first time a missing `"use client"` directive had been discussed as a
risk in this codebase — both affected files' own doc comments predate this incident and
were written specifically because an earlier reviewer had flagged how easy it is to miss
during a refactor. What changed after 2026-06-08 was moving from "document the risk in a
comment" to "make the risk mechanically detectable," which is why the ESLint rule listed
as an action item was prioritized over further documentation. The team also used this
incident to catalogue every other Client Component in src/components/domain/ that
attaches a DOM event handler, confirming none of the others had been affected by the
same refactor tooling, and cross-checked that the render smoke test added as a follow-up
action item would actually have caught this specific regression had it existed before
2026-06-08 — it was written against the pre-incident commit as a validation step and
confirmed to fail exactly as expected before being merged alongside the fix for the
underlying `"use client"` regression itself.

A secondary discussion during the retro concerned whether the five deliberate layering
exceptions documented in `DES-008` and `DES-017` (routes and actions that call
repositories directly, bypassing the service layer) had any bearing on this incident.
They did not — this was a pure Server/Client Component boundary issue, unrelated to the
service-layer bypass pattern those ids describe — but the adjacency of the two topics
(both are cases where a convention the codebase depends on is enforced by review rather
than the compiler) fed directly into the later decision to review all such
review-enforced-only conventions together, which is what
`notes-2026-07-30-layering-exception-amnesty.md` eventually took up as its own agenda
item.

## Related

- Code: `src/components/domain/issue/issue-row.tsx`,
  `src/components/domain/billing/billing-plan-card.tsx`, `src/lib/format.ts`,
  `src/instrumentation.ts`,
  `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/board/page.tsx`,
  `src/app/(dashboard)/[orgSlug]/settings/billing/page.tsx`
- Ids: `DES-001`, `DES-005`, `DES-007`, `DES-020`, `ADR-001`, `ADR-021`
- See also: `runbook-seeding-and-local-setup.md` (unrelated incident, cited for the
  contrast between a build-time-invisible bug and a data-fixture bug)
