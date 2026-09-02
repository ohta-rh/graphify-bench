---
title: Use src/proxy.ts as the request hook
id: ADR-007
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2025-12-15
related: [REQ-211, REQ-212, ADR-001, ADR-003, ADR-020]
---

# ADR-007 — Use src/proxy.ts as the request hook

## Status

Accepted. Follows directly from the Next.js 16 upgrade decided in ADR-001,
and has not changed since; the file has grown in scope slightly (the
`x-taskflow-authenticated` response header was added in January 2026) but its
shape and its deliberately narrow responsibility have not.

## Context

Next.js 16 renamed the framework-level request hook from `middleware.ts`,
exporting a `middleware` function, to `proxy.ts`, exporting a `proxy`
function — and, critically, the new version does not error or warn if a
project still ships a `middleware.ts` file; it is simply ignored, and every
route silently becomes unauthenticated. The team hit this directly: an early
scaffold of the project (carried over from a template built against Next 15)
had a `middleware.ts` doing exactly the "redirect unauthenticated dashboard
requests to login" job that REQ-211 requires, and during the framework
upgrade in December 2025 that protection silently stopped running. It was
caught in a manual QA pass before shipping, not by any automated check,
which the team considered a near-miss worth writing down.

Beyond the rename itself, the team had to decide how much authorization logic
this request hook should carry. The tempting answer — since it runs before
every request — was "all of it": check role, check org membership, check
resource ownership, right there, before a request ever reaches a page. That
temptation was rejected quickly once the constraints of what a request hook
can actually do were laid out:

- A proxy running at the edge of the request pipeline runs before routing has
  resolved dynamic segments in a way that gives it easy access to loaded
  domain data. It sees the URL and the cookies; it does not have a database
  connection or an ORM in Taskflow's architecture, and adding one would mean
  a second, parallel path to the data layer that bypasses src/server/db/
  entirely.
- REQ-212 requires that the request hook rejects requests for unknown
  organizations, which sounds like it needs a database lookup — but doing
  that lookup on every single request, including static assets and public
  marketing pages, would add latency to paths that do not need it.

The team settled on a narrow mandate for the proxy, matching what ADR-003
already says about where authorization decisions belong: the proxy answers
"is there any session at all," nothing more specific.

## Decision

`src/proxy.ts` exports `proxy`, a synchronous function operating on the
`NextRequest`. `PUBLIC_PREFIXES` is a fixed allowlist of paths that never
require a session — the marketing pages (`/`, `/pricing`, `/changelog`,
`/about`), the auth flows themselves (`/login`, `/register`,
`/reset-password`, `/invite`), and two API paths that must remain reachable
without a Taskflow session (`/api/health` and `/api/webhooks`, since an
external system delivering a webhook receipt does not carry a Taskflow
cookie). `isPublicPath()` checks exact match or prefix match against that
list.

For any other path, the proxy reads the session cookie by name —
`SESSION_COOKIE_NAME` from `src/schemas/session.ts`, never a hardcoded
string, so the cookie name stays defined in exactly one place per ADR-020 —
directly off `request.cookies`, without decoding, hashing, or looking it up
against the session table. If the cookie is absent, it redirects to
`/login`, preserving the original path and query string in a `next` search
parameter so login can return the user where they meant to go. If present,
it lets the request through and sets `x-taskflow-authenticated: 1` on the
response, a hint later logging and monitoring can use without themselves
touching the session store.

The `config.matcher` excludes `_next/static`, `_next/image`, and
`favicon.ico`, so the proxy does not run — and does not add latency — for the
framework's own asset requests.

Everything past "is there a cookie" is explicitly out of scope for this file,
and is instead handled by the dashboard layouts, which call
`getSessionPrincipal()` (`src/lib/session.ts`) to resolve the actual
principal, and `resolveActorForOrg()` (`src/server/services/session-service.ts`)
to resolve the actor for the specific `orgSlug` in the URL — including
REQ-212's "reject unknown organizations" check, which happens here, with a
real database lookup, not in the proxy.

## Consequences

**What this buys the team.** The proxy stays fast and dependency-free: it
never opens a database connection, never imports src/server/db, and adds a
single cookie read to the request path, which matters because — unlike a
layout, which only runs for the route it guards — the proxy runs for nearly
every request the application serves. The separation also means the
near-miss described in Context cannot recur silently: the proxy's own code
comments now state explicitly, as a warning to future maintainers, that
`middleware.ts` is the wrong filename and that Next 16 will not tell you if
you use it. REQ-211 (unauthenticated dashboard requests redirect to login)
is satisfied cheaply and early, while the harder, data-dependent parts of
authorization (REQ-212's per-org validity check, and everything ADR-003
governs) stay where they belong — with access to the database and the
service layer — rather than being awkwardly reimplemented in a context that
cannot reach either.

**What it costs.** Because the proxy only checks for cookie presence, a
request with a stale, expired, or otherwise invalid session token still
passes the proxy and only fails later, inside the layout that calls
`getSessionPrincipal()` — which means an expired-session user sees a
slightly slower "denied" (a full render pass into the layout before
redirecting) rather than an immediate one at the edge. The team accepted this
trade explicitly: verifying a session's validity, not just its presence,
requires the database lookup the proxy is deliberately built to avoid. It
also means two different code paths — the proxy's cookie check and the
layout's session resolution — both have to agree on the cookie name and both
have to be kept in sync if the session model changes, which is precisely why
`SESSION_COOKIE_NAME` lives in `src/schemas/session.ts` as a single exported
constant rather than being duplicated as a string literal in each place.

## Alternatives considered

**Do the full session and organization lookup inside the proxy**, giving it
database access. Rejected for the latency reason above (every request pays a
database round trip, including ones the public-prefix allowlist would
otherwise skip for free) and for architectural cleanliness — it would have
meant the request-hook layer importing src/server/db and duplicating logic
that already lives correctly in `session-service.ts`, doubling the surface
area that has to change together.

**Skip the request hook entirely and rely solely on layout-level checks.**
Considered, since the layouts already do the authoritative check regardless.
Rejected because it means an unauthenticated request renders further into the
tree before being redirected — more wasted server work per denied request —
and because the proxy's public-path allowlist is a convenient, single,
reviewable list of "these routes are intentionally public," which the team
wanted as a visible artifact rather than an implicit property of which pages
happen to skip the session check.

**Continue shipping `middleware.ts`** under the assumption that Next.js would
eventually warn or error on the old filename. Rejected once the team
confirmed, by testing directly against the installed `next` 16.3.4, that no
such warning exists — silent unauthenticated routes were judged too severe a
failure mode to leave to a framework behavior the team could not verify.

## References

- REQ-211 (unauthenticated dashboard requests redirect to login), REQ-212
  (the request hook rejects requests for unknown organizations)
- ADR-001 (the Next.js 16 App Router decision this rename is a direct
  consequence of), ADR-003 (why the proxy delegates fine-grained
  authorization rather than performing it), ADR-020 (opaque session tokens
  and the single-module cookie-handling convention `SESSION_COOKIE_NAME`
  serves)
- Code: `src/proxy.ts` (`proxy`, `isPublicPath`, `PUBLIC_PREFIXES`,
  `config.matcher`), `src/lib/session.ts`, `src/schemas/session.ts`
  (`SESSION_COOKIE_NAME`), `src/server/services/session-service.ts`
