---
title: Opaque hashed session tokens instead of JWTs
id: ADR-020
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2026-04-23
related: [REQ-202, REQ-203, REQ-204, REQ-206, REQ-207, ADR-007]
---

# ADR-020 — Opaque hashed session tokens instead of JWTs

## Status

Accepted, and, alongside ADR-003's authorization entry point, treated as one
of the two "do not deviate from this without a security review" decisions
in the codebase.

## Context

Session design came up early, alongside the broader auth work, and the team
weighed two familiar shapes: a JSON Web Token (JWT) carrying signed claims
the server could verify statelessly, versus an opaque random token that
means nothing on its own and requires a server-side lookup to resolve.
JWTs are attractive specifically because they avoid a database round trip on
every request — the server verifies a signature and trusts the claims
inside. That property mattered less for Taskflow than it typically does:
`better-sqlite3` reads are synchronous, in-process, and fast (ADR-002), so
the "avoid a database hit" argument for JWTs carried much less weight here
than it would against a networked database.

What mattered more were two properties JWTs give up by design. First,
**revocation.** A signed JWT is valid until it expires, full stop — there is
no way to invalidate one early short of maintaining a denylist, which
defeats the statelessness JWTs are chosen for in the first place. REQ-207
requires logout destroy the session server-side, meaning a logged-out
session's token must stop working immediately, not merely stop being sent by
the one client that logged out — a genuine requirement a bare JWT cannot
satisfy without exactly the denylist-based statefulness the team wanted to
avoid reasoning about. Second, **role and membership changes.** REQ-034
requires role changes be audited with before-and-after values, and a role
change needs to take effect for a user's *next* request, not wait until
their JWT happens to expire and be reissued — a stateless JWT carrying
`role: "member"` as a claim would keep granting member-level access for the
lifetime of the token even after an admin demoted that user to viewer,
unless the JWT's claims were deliberately kept minimal and the role looked
up fresh anyway, at which point the "statelessness" benefit is already
partially given up.

## Decision

Sessions are opaque, random tokens, not JWTs, and are stored server-side as
hashes, never as plaintext. `src/server/services/session-service.ts`'s
`createSessionToken(userId)` generates a `TOKEN_BYTES`-length (32 bytes)
random token via `randomToken()`, computes `expiresAt` as `now +
SESSION_TTL_DAYS * MS_PER_DAY` with `SESSION_TTL_DAYS = 30`, and stores only
`hashToken(token)` — never the raw token — in the `sessions` table via
`sessionRepo.createSession()`. The raw token is returned to the caller
exactly once, to be set as the session cookie; from that point forward, the
only thing that exists anywhere that can be checked against the database is
its hash. The module's own comment states the security property directly:
"a dump of the `sessions` table cannot be replayed as a login" — an attacker
who somehow reads the database sees only hashes, which are useless without
the original random token, itself never persisted anywhere.

`resolveSession(token)` reverses this at lookup time: it hashes the
presented token and looks up `sessionRepo.findSessionByTokenHash()`,
returning a `SessionPrincipal` or `null`. Because a session's validity is a
database lookup, not a signature check, REQ-207's requirement is
satisfiable directly: `destroySession(token)` resolves the token, then calls
`sessionRepo.purgeExpiredSessions()` — the module's own comment explains why
this reads as indirect: `SessionPrincipal` carries no session id, so there
is no `deleteSessionById()` to call directly; the sweep is what actually
clears the row, with the cookie dropped by the caller (`clearSessionCookie()`
in `src/lib/session.ts`) regardless of the sweep's outcome. Role changes
similarly take effect immediately, not on next token refresh, because a
session token carries no role claim at all — `resolveActorForOrg()` looks up
the member's *current* role from the database on every single request,
which is the direct consequence of choosing a lookup-based model over a
claims-based one.

Exactly one module reads or writes the session cookie (REQ-206):
`src/lib/session.ts`. `getSessionToken()` reads `SESSION_COOKIE_NAME` (a
constant from `src/schemas/session.ts`, referenced by name rather than
duplicated as a string literal, the same discipline ADR-007's proxy follows)
off the async `cookies()` jar; `setSessionCookie(token, expiresAt)` sets it
`httpOnly`, `sameSite: "lax"`, and `secure` only in production (REQ-205);
`clearSessionCookie()` deletes it. `getSessionPrincipal()` composes
`getSessionToken()` and `resolveSession()`, additionally checking
`parseIso(principal.expiresAt).getTime() > Date.now()` so an
expired-but-not-yet-swept session is treated as absent (REQ-204) even before
the sweep gets to it.

## Consequences

**What this buys the team.** Logout is genuinely immediate and server-
enforced — REQ-207 holds exactly, with no "wait for the JWT to expire" caveat
anywhere in the product. Role and membership changes take effect on the very
next request, closing a real security gap a naive JWT design would have
left open (a demoted admin retaining admin-level claims until token expiry).
The "a database dump cannot be replayed as a login" property, stated
directly in the module's own comment, is a genuine defense-in-depth win: even
in the worst case of the SQLite database file itself being exfiltrated, the
`sessions` table's hashed tokens are not directly usable credentials.
REQ-206's single-module discipline also means the cookie's flags — `httpOnly`,
`sameSite: "lax"`, conditional `secure` — are guaranteed consistent across
every place a session cookie is touched in the whole application, because
there is only one place that touches it.

**What it costs.** Every authenticated request pays a database lookup to
resolve the session — acceptable given `better-sqlite3`'s synchronous,
in-process performance, but a real dependency the team would have to
reconsider if the database round trip ever stopped being effectively free
(a networked database, for instance, would reintroduce exactly the latency
argument for JWTs the team judged not to apply here). Session state is also
inherently tied to this one process and this one database — there is no
signature-verification path that would let a hypothetical second process
validate a session independently without sharing the same database, which
is consistent with, and part of, the single-writer deployment model this
whole corpus assumes, but is a real constraint on any future horizontal-
scaling design. `destroySession()`'s indirection through
`purgeExpiredSessions()` rather than a targeted delete is a minor
architectural wart the team has flagged (in `session-service.ts`'s own
comments) rather than fixed, because `SessionPrincipal` was designed
without a session id from the start; fixing it cleanly would mean adding a
session id to `SessionPrincipal` and touching every caller that constructs
one, judged not worth doing until the current sweep-based approach causes an
actual observed problem — logout still works correctly today, it is simply
implemented via a broader mechanism than the single-row delete a session id
would allow.

## Alternatives considered

**Signed, stateless JWTs.** The default choice at many companies for
exactly the "avoid a database round trip" reason that carries little weight
in this codebase's synchronous, in-process database context. Rejected
primarily for the immediate-revocation and immediate-role-change
requirements (REQ-207, REQ-034's practical effect) that a stateless token
cannot satisfy without reintroducing server-side state anyway, at which
point the statelessness argument is moot.

**JWTs with a short expiry and a refresh-token rotation scheme**, mitigating
the revocation problem by keeping the access token's validity window small.
Considered, and rejected as meaningfully more complex — two token types, a
refresh flow, refresh-token storage that itself needs the same
revocation properties a plain opaque session token already has — for no
net benefit once the database-lookup cost argument for avoiding a session
table in the first place had already been dismissed.

**Storing the raw session token, not a hash.** Simpler to implement — a
direct string comparison instead of a hash-then-compare — but rejected
immediately on security grounds: it would mean a database dump *could* be
replayed as a login, the exact property the module's design comment states
this ADR is built to avoid.

## References

- REQ-202 (login issues an opaque session token), REQ-203 (session tokens
  stored hashed), REQ-204 (sessions expire after a fixed lifetime), REQ-206
  (only one module reads or writes the session cookie), REQ-207 (logout
  destroys the session server-side)
- ADR-007 (`src/proxy.ts` reads the same `SESSION_COOKIE_NAME` constant for
  its lightweight presence check, deferring the authoritative lookup this
  ADR describes to the layout layer)
- Code: `src/server/services/session-service.ts` (`createSessionToken`,
  `resolveSession`, `resolveActorForOrg`, `switchActiveOrg`,
  `destroySession`, `SESSION_TTL_DAYS`, `TOKEN_BYTES`), `src/lib/session.ts`
  (`getSessionToken`, `getSessionPrincipal`, `setSessionCookie`,
  `clearSessionCookie`), `src/schemas/session.ts` (`SESSION_COOKIE_NAME`),
  `src/lib/hash.ts` (`hashToken`, `randomToken`)
