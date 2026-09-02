---
title: Build on Next.js 16 App Router with Server Actions
id: ADR-001
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2025-11-06
related: [REQ-001, REQ-211, ADR-007, ADR-009, ADR-013]
---

# ADR-001 — Build on Next.js 16 App Router with Server Actions

## Status

Accepted. This decision predates the first line of domain code and every
subsequent architectural decision in this corpus assumes it. It has not been
revisited since November 2025 and there is no open proposal to change it.

## Context

Taskflow started as a two-person spike in October 2025: a multi-tenant issue
tracker that had to ship a usable dashboard, a REST-shaped API surface for a
future public API, and a marketing site, all from one deployable, with no
budget for a separate frontend team or a second runtime. The constraints that
mattered when Deji Okafor and the founding engineers picked a framework were:

- **No external services.** The whole system, including the build, has to run
  offline against a bundled SQLite database. Anything that assumes a managed
  edge runtime, a hosted image CDN, or an external session store was out.
- **One codebase, one language.** TypeScript end to end, so the same `Actor`,
  `PermissionAction`, and Zod schema types could be shared between the forms
  that collect input and the code that validates it, instead of maintaining a
  duplicate API contract.
- **Mutations needed to be boring.** The team had watched a previous project
  drown in hand-rolled REST endpoints, `fetch` wrappers, and client-side
  optimistic-update plumbing that quietly drifted from the server's validation
  rules. They wanted the form and the server-side handler to be, as close as
  possible, the same function.
- **Server-rendered by default.** Taskflow's dashboard is read-heavy — issue
  lists, project boards, activity feeds — and a fully client-rendered SPA
  would have meant a second round trip for data that the server already has
  by the time it renders the shell.

Next.js 16 had just shipped the App Router as the default project shape, with
Server Actions promoted out of the experimental flag, and a set of breaking
changes (`params`/`searchParams` as Promises, async `cookies()`/`headers()`,
`middleware.ts` renamed to `proxy.ts`) that made clear the framework's authors
intended Server Actions and server-first data fetching to be the primary way
to build a CRUD-heavy app like this one, not an add-on to a REST API. The
alternative frameworks evaluated — a plain Express API behind a separate
Vite/React client, and remaining on the Next.js Pages Router — are covered
below.

## Decision

Taskflow is a single Next.js 16 application using the App Router exclusively.
Route segments live under src/app/, with the authenticated dashboard nested
under the `(dashboard)` route group and further scoped by `[orgSlug]` so every
URL carries its tenant. Mutations are Server Actions under src/actions/,
organized by domain (`src/actions/issues/create-issue.ts`, `src/actions/projects/create-project.ts`,
`src/actions/webhooks/create-webhook.ts`, and so on), each one a thin wrapper — built with the
`withAction` helper in `src/actions/_lib/with-action.ts` — around a call into
the corresponding service in src/server/services/. Every Server Action
returns an `ActionResult<T>` discriminated union rather than throwing across
the client/server boundary; `toActionResult()` in `src/lib/errors.ts` is what
turns a caught domain error into that shape.

Because `params` and `searchParams` are Promises in this version of Next.js,
every page and layout that reads a route segment — `[orgSlug]`,
`[projectSlug]`, `[issueNumber]` — awaits them before use; this is enforced by
convention and by the fact that the compiler complains loudly the moment it is
forgotten. `cookies()` and `headers()` are likewise async, which is why
`src/lib/session.ts` is written with every exported function returning a
`Promise`, even the ones that look like they could be synchronous. Parallel
route slots that exist for the dashboard shell declare a `default.tsx`
alongside their `page.tsx`, per the App Router's requirement that a slot
render something even when no more specific segment matches.

There is deliberately no separate API server. Where an actual HTTP surface is
required — the webhook receiver stub and health check under
src/app/api/ — those are Next.js Route Handlers in the same application,
not a second service.

## Consequences

**What this buys the team.** A single deployable, a single TypeScript
compiler pass (`next typegen && tsc --noEmit`, the project's `typecheck`
script), and — the thing that mattered most in practice — the Zod schemas in
src/schemas/ are shared unmodified between the client-side form validation
and the Server Action that re-validates on the server (see ADR-009). There is
no serialization boundary to keep in sync by hand: a `CreateIssueInput` type
means the same thing in the browser and on the server, because it is the same
type. `REQ-211`'s requirement that unauthenticated dashboard requests redirect
to login is satisfiable at two layers — a fast, database-free check in
`src/proxy.ts` (ADR-007) and the authoritative check inside each layout via
`getSessionPrincipal()` — without maintaining two different session models.

**What it costs.** The App Router's server-first model means every dashboard
page is, by default, a server component that fetches data during render; the
few places that need real client interactivity — the optimistic issue board
(ADR-021), the command palette, drag-and-drop — have to be deliberately
carved out as `"use client"` boundaries, and that boundary has to be drawn
correctly or the bundle balloons. The team's second-worst incident in this
period (December 2025) was a settings page that imported a server-only
repository module from a client component; the build failed opaquely until
someone traced it to a missing `"use client"` directive three files up the
import chain. There is also a real coupling cost: because Server Actions
double as the client-facing "API," any future decision to expose issues over
a genuine external REST or GraphQL API means either wrapping the same
services a second time or accepting that the Server Actions become the public
contract — a decision this ADR does not make and that ADR-013's service-layer
boundary is partly designed to keep open.

Framework version upgrades are also now an all-or-nothing affair for the
whole product, marketing pages included: there is no independent frontend
deploy to stage a Next.js major version bump against. The `middleware.ts` →
`proxy.ts` rename that shipped in this exact version is the running example
of that cost — every engineer who joined the project after November 2025 has
at some point written a `middleware.ts` file out of habit and watched it be
silently ignored, because Next 16 does not error on the old filename, it just
does nothing with it.

## Alternatives considered

**Express (or Fastify) API + separate Vite/React SPA.** This was the shape of
the team's previous project and the default the team reached for out of habit.
It was rejected primarily because it duplicates the validation contract: the
SPA needs its own copy of "what does a valid issue creation payload look
like," and keeping that copy in sync with the server's Zod schemas by hand had
already caused two production bugs at the previous company. It also means
running and deploying two processes in an offline, single-writer environment
that has no orchestration layer to keep them coordinated.

**Next.js Pages Router with `getServerSideProps` and API routes.** Familiar to
the whole team and a smaller conceptual jump, but it pushes every mutation
through a hand-written `pages/api/*.ts` handler that has to parse the request
body, call the service, and shape the JSON response — exactly the
boilerplate Server Actions remove. It also does not get the App Router's
route-group and parallel-slot layout composition, which the dashboard shell
(with its persistent sidebar and org switcher) leans on.

**Remix.** Considered briefly for its loader/action model, which is
philosophically close to Server Actions. Rejected mainly for team familiarity
— nobody on the founding team had shipped a production Remix app — and
because the App Router's React Server Components model let the team avoid
sending list-rendering logic to the client at all for the read-heavy pages,
where Remix's loaders still return data to a client-rendered tree.

## References

- REQ-001 (organization as tenant boundary — every route is scoped by
  `orgSlug`), REQ-211 (unauthenticated dashboard requests redirect to login)
- ADR-007 (the `src/proxy.ts` request hook that replaces `middleware.ts`)
- ADR-009 (Zod schemas shared between client forms and Server Actions)
- ADR-013 (services own authorization; Server Actions stay thin)
- Code: `src/actions/_lib/with-action.ts`, `src/lib/session.ts`,
  `src/lib/errors.ts`, `src/app/api/health/route.ts`, `package.json` (`next`
  16.3.4)
