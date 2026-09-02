---
title: Authentication and sessions requirements
id: REQ-AUTH
status: approved
owners: [product-team, d.okafor]
last_updated: 2026-06-09
related: [REQ-001, REQ-003, ADR-020, DES-210]
---

## Scope

This document defines the requirements for credential authentication, session lifecycle, the
request-hook gate, and how a request resolves into an organization-scoped `Actor`. It covers
login, registration, logout, password reset, session cookie handling, and multi-organization
membership from the session's point of view. It does not cover role or permission mechanics
once an `Actor` exists (`membership-and-roles.md`) or organization creation's business rules
beyond the registration flow that triggers it (`organizations.md`).

## Context

`auth-service.ts` owns credential login, registration and password reset; there is no
third-party identity provider anywhere in Taskflow — every account is email and password,
hashed with `node:crypto`'s scrypt through `src/lib/hash.ts`'s `hashPassword`/
`verifyPassword`, never stored or compared in plaintext. `register(input)` creates a `User`
and, in the same call, an `Organization` via `organization-service.ts#createOrganization`
(`REQ-003`), so registration and org creation are inseparable in Taskflow — there is no
"create an account first, decide on an organization later" path; a brand-new user always
lands with a first organization already provisioned.

Sessions are opaque tokens (`ADR-020`), not JWTs: `createSessionToken(userId)` in
`session-service.ts` generates a random token, stores only its hash
(`session-repository.ts#createSession`, using `hashToken`), and returns the plaintext token
to the caller once, for the cookie. `resolveSession(token)` hashes the incoming cookie value
and looks up the hash, so a database compromise never exposes usable session tokens
directly — the same defensive pattern invitation tokens use (`REQ-029`). Sessions expire
after `SESSION_TTL_DAYS = 14`, defined in `session-service.ts` itself rather than in
`src/config/constants.ts`, since it is specifically a session concern, not a general
cross-cutting constant.

`src/lib/session.ts` is the one module permitted to read or write the session cookie
(`REQ-206`); every other module that needs the session goes through
`getSessionPrincipal()`, which returns a `SessionPrincipal` — the pre-organization identity —
distinct from an `Actor`, which is always resolved for one specific organization
(`REQ-210`). `src/lib/actor.ts#getActor(orgSlug)` is the bridge: it calls
`getSessionPrincipal()`, then `resolveActorForOrg(principal, orgSlug)` in
`session-service.ts`, which itself calls `member-service.ts#resolveActor` to look up the
caller's membership and role in that specific organization. A `SessionPrincipal` with no
membership in the requested org yields `null` from `resolveActorForOrg`, and `getActor`
turns that into a thrown `unauthorized`/`forbidden` for the caller.

The cookie itself is `httpOnly`, `sameSite: 'lax'`, and `secure` in production, named by
`SESSION_COOKIE_NAME` declared in `src/schemas/session.ts` — not `src/config/constants.ts`,
because the cookie name is validated as part of the session schema rather than treated as an
unrelated constant. In Next.js 16, `cookies()` is async, which is why every function in
`src/lib/session.ts` is async even where the underlying operation feels like it should be
synchronous — this is a framework fact worth stating plainly since it is easy to miss in a
quick read of the module and write a synchronous caller that then fails to compile.

There is no `middleware.ts` in this codebase; the request-hook gate is `src/proxy.ts`,
exporting `proxy` (`ADR-007`, `REQ-212`), Next 16's renamed middleware concept — every
request to a dashboard route passes through it before any page component runs, and it is
where an unauthenticated request to a protected route is redirected to login (`REQ-211`).

## Open questions

1. `src/server/services/auth-service.ts` documents in its own comments that it must call
   `emit()` on login and registration but cannot, because `TaskflowEventMap` has no auth
   events — meaning login and registration currently produce no activity-feed row and no
   webhook-eligible event, an intentional gap noted in the brief rather than something this
   document can resolve.
2. `REQ-204`'s fixed 30-day session lifetime has no "remember me" variant or shorter-lived
   option; whether sensitive actions (billing changes, org deletion) should require a
   freshly re-verified session rather than relying on the same 30-day token is unspecified.
3. `REQ-213` establishes a user can belong to several organizations, but there is no
   requirement here describing what happens to a user's sessions when their last
   organization membership is removed — whether the session simply resolves no actor for
   any org slug thereafter, or is explicitly revoked.

### REQ-200 — Users authenticate with email and password

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-201, REQ-209
- **Implemented by:** `src/server/services/auth-service.ts` — `login`, `src/server/repositories/user-repository.ts` — `findUserByEmail`
- **Verified by:** `tests/schemas/auth.schema.test.ts`

There is no OAuth, SSO or magic-link path in Taskflow; `login(input)` in `auth-service.ts`
takes an email and password, looks up the user by email
(`user-repository.ts#findUserByEmail`), and verifies the password against the stored hash.
This is a deliberate scope limitation for a product aimed at small-to-mid teams that do not
require enterprise identity federation on day one.

**Acceptance criteria**

1. `loginSchema` requires both an email and a password field; there is no alternate
   credential type accepted.
2. A login attempt against a non-existent email fails with the same generic error a wrong
   password would, avoiding user enumeration through differing error messages.
3. `findUserByEmail` is case-normalized so `User@Example.com` and `user@example.com` resolve
   to the same account.

### REQ-201 — Passwords are stored only as hashes

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-020, REQ-200
- **Implemented by:** `src/lib/hash.ts` — `hashPassword`, `verifyPassword`
- **Verified by:** `tests/lib/hash.test.ts`

`hashPassword`/`verifyPassword` in `src/lib/hash.ts` use `node:crypto`'s scrypt, with no
external hashing dependency. `insertUser` never receives a plaintext password parameter — its
input type is `{ email: string; name: string; passwordHash: string }`, so a plaintext
password literally cannot reach the repository layer through the type system.

**Acceptance criteria**

1. No repository or schema type includes a plaintext `password` field alongside a stored
   user record; only `passwordHash`.
2. `verifyPassword` performs a comparison resistant to short-circuit timing differences (the
   underlying scrypt-based comparison, not a naive string equality check).
3. `hashPassword`'s output differs between two calls with the same input password, since a
   fresh salt is used each time.

### REQ-202 — Login issues an opaque session token

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-203, ADR-020
- **Implemented by:** `src/server/services/session-service.ts` — `createSessionToken`, `src/server/services/auth-service.ts` — `login`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`login` calls `createSessionToken(user.id)` and returns both the `User` and the plaintext
`token` to the caller (`loginAction`), which is the only point in the whole flow where the
plaintext token exists outside the browser — `setSessionCookie` writes it into the cookie
immediately, and from then on only its hash is ever referenced.

**Acceptance criteria**

1. `login`'s returned token is a high-entropy random value, not derived from any
   user-guessable input like the user id or email.
2. The token is never logged in plaintext by `src/lib/logger.ts`'s structured logger.
3. A successful login always produces exactly one new session row, not zero and not more
   than one.

### REQ-203 — Session tokens are stored hashed

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-029, ADR-020
- **Implemented by:** `src/server/repositories/session-repository.ts` — `createSession`, `findSessionByTokenHash`, `src/lib/hash.ts` — `hashToken`
- **Verified by:** `tests/lib/hash.test.ts`

`createSession(userId, tokenHash, expiresAt)` in `session-repository.ts` never receives a
plaintext token; `hashToken` in `src/lib/hash.ts` is applied before the value reaches the
repository, mirroring the invitation-token pattern (`REQ-029`) exactly, since both are
"a database leak should not hand out usable bearer credentials" problems solved the same
way.

**Acceptance criteria**

1. `findSessionByTokenHash` is the only lookup function; there is no lookup by plaintext
   token anywhere in the repository.
2. A leaked database backup does not, by itself, contain any value usable to authenticate as
   an existing session.
3. `hashToken` is deterministic for a given input, so the same plaintext token always
   resolves to the same session row on subsequent requests within its lifetime.

### REQ-204 — Sessions expire after a fixed lifetime

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-207, ADR-020
- **Implemented by:** `src/server/services/session-service.ts` — `createSessionToken`, `resolveSession`, `src/server/repositories/session-repository.ts` — `purgeExpiredSessions`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`SESSION_TTL_DAYS = 30` in `session-service.ts`. `createSessionToken` computes `expiresAt`
from this constant at creation time; there is no sliding-window renewal that extends a
session's life on activity — a session created today expires in exactly 30 days regardless
of how often it is used in between.

**Acceptance criteria**

1. `resolveSession` returns `null` for a token whose stored `expiresAt` has passed, even if
   the session row has not yet been purged.
2. `purgeExpiredSessions(now)` in `session-repository.ts` removes expired rows in bulk,
   called from a cleanup path rather than on every request.
3. `SESSION_TTL_DAYS` is a single named constant, not a value duplicated at both the
   creation site and the expiry-check site.

### REQ-205 — The session cookie is httpOnly and same-site lax

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-206, ADR-020
- **Implemented by:** `src/lib/session.ts` — `setSessionCookie`, `src/config/env.ts` — `env`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`setSessionCookie` sets `httpOnly: true` (unreadable from client-side JavaScript, mitigating
XSS-based token theft), `sameSite: 'lax'` (sent on top-level navigation but not on
cross-site subresource requests, mitigating CSRF while still allowing a user to click a
link from an email into the app and remain logged in), and `secure: true` only in
production, since local development over plain HTTP would otherwise refuse to set the
cookie at all.

**Acceptance criteria**

1. The cookie is never set with `httpOnly: false`.
2. `sameSite` is `'lax'`, not `'none'` or `'strict'` — `'strict'` would break the
   click-through-from-email login case the product relies on for invitation and
   password-reset links.
3. `secure` is conditioned on `env.nodeEnv === 'production'`, read through
   `src/config/env.ts`, not a hardcoded boolean.

### REQ-206 — Only one module reads or writes the session cookie

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-205, DES-210
- **Implemented by:** `src/lib/session.ts` — `getSessionToken`, `getSessionPrincipal`, `setSessionCookie`, `clearSessionCookie`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`src/lib/session.ts` is the sole module calling Next's `cookies()` API for session purposes;
`getSessionToken`, `getSessionPrincipal`, `setSessionCookie` and `clearSessionCookie` are
its complete surface, and every other module — including `auth-service.ts` and
`session-service.ts` — calls through this module rather than touching the cookie API
directly. This centralization is what makes it possible to reason about cookie security
properties (`REQ-205`) in one place rather than auditing every call site independently.

**Acceptance criteria**

1. No file outside `src/lib/session.ts` imports Next's `cookies()` function for
   session-cookie purposes.
2. A change to the cookie's name, flags, or encoding requires editing exactly one file.
3. `getSessionPrincipal` is the only function that turns a raw cookie value into a resolved
   `SessionPrincipal`; no caller re-implements token hashing and lookup itself.

### REQ-207 — Logout destroys the session server-side

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-204, DES-210
- **Implemented by:** `src/server/services/auth-service.ts` — `logout`, `src/server/services/session-service.ts` — `destroySession`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`logout(sessionId)` in `auth-service.ts` calls `destroySession` in `session-service.ts`,
which calls `revokeSession` in the repository — the session row is actually removed (or
marked revoked), not merely forgotten client-side. `logoutAction` also clears the cookie
(`clearSessionCookie`), but the server-side revocation is what actually prevents the same
token from being reused even if the browser's cookie clear failed or the token was captured
before logout.

**Acceptance criteria**

1. After logout, `resolveSession` for the same token returns `null`, not merely a stale but
   technically valid session.
2. `logoutAction` clears the client-side cookie in addition to server-side revocation, so
   the browser does not keep sending a now-invalid token.
3. Logging out does not affect the user's other active sessions on other devices; only the
   session tied to the current cookie is destroyed.

### REQ-208 — Password reset is rate limited

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-011, REQ-096
- **Implemented by:** `src/lib/rate-limit.ts` — `consumeRateLimit`, `getBucketConfig`, `src/server/services/auth-service.ts` — `requestPasswordReset`
- **Verified by:** `tests/lib/rate-limit.test.ts`

The `auth:password-reset` rate-limit bucket (capacity 5, refill 1/minute — the tightest
bucket in the whole rate-limit configuration) bounds `requestPasswordReset`, since password
reset requests are both a common target for enumeration and abuse attempts and, unlike most
other rate-limited actions, are available to unauthenticated callers.

**Acceptance criteria**

1. `consumeRateLimit(orgId-equivalent-or-global-key, 'auth:password-reset', 1)` runs before
   any reset token is minted or any reset email is sent.
2. Exceeding the bucket does not reveal whether the target email exists, consistent with
   `REQ-200`'s enumeration-resistance principle.
3. `getBucketConfig('auth:password-reset')` returns capacity 5, refill 1 per minute.

### REQ-209 — Registration creates a user and an organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-003, REQ-014
- **Implemented by:** `src/server/services/auth-service.ts` — `register`, `src/server/services/organization-service.ts` — `createOrganization`
- **Verified by:** `tests/schemas/auth.schema.test.ts`

`register(input)` in `auth-service.ts` is the entry point that produces both a new `User`
row and, through `organization-service.ts`, a new `Organization` with the registrant as
owner (`REQ-003`) and a seeded first project (`REQ-014`), all in one logical operation
triggered by `registerAction`.

**Acceptance criteria**

1. `register` never returns a `User` without also having created an `Organization` for
   them.
2. Registration with an email already in use fails with a validation error distinct from a
   generic server error.
3. `registerAction` sets the session cookie on success, so the new user lands
   already-authenticated on their new organization's dashboard.

### REQ-210 — An actor is resolved per organization, not globally

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-213, REQ-009
- **Implemented by:** `src/lib/actor.ts` — `getActor`, `requireActorFor`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

There is no global "current user" concept with a single role; every authorization decision
resolves an `Actor` scoped to one `orgSlug` via `getActor(orgSlug)`, which internally
resolves the `SessionPrincipal` first, then that principal's role in the specific
organization named by the slug. A user who is `owner` of one organization and `viewer` of
another gets a correctly different `Actor.role` depending on which org's URL they are
currently on.

**Acceptance criteria**

1. `getActor` always requires an `orgSlug` argument; there is no zero-argument variant that
   returns some notion of a default-org actor.
2. `Actor.role` for the same user differs correctly across two different organizations they
   belong to with different roles.
3. `requireActorFor(orgId)` in `src/lib/actor.ts` provides the id-based equivalent for
   internal callers that already have an `orgId` rather than a slug.

### REQ-211 — Unauthenticated dashboard requests redirect to login

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-007, REQ-212
- **Implemented by:** `src/proxy.ts` — `proxy`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`src/proxy.ts`'s `proxy` function checks for a valid session before a request reaches any
dashboard route; a request with no cookie, an expired session, or an
unresolvable token is redirected to `/login`, so no dashboard page component ever needs to
implement its own "am I logged in" guard.

**Acceptance criteria**

1. A request to any dashboard route without a valid session cookie results in a redirect to
   the login page, not a rendered (even if empty) dashboard page.
2. Routes such as `src/app/(auth)/login/page.tsx` and the rest of the auth route group are
   explicitly excluded from this redirect, since they are the login/register/reset flow
   itself.
3. The redirect preserves the originally requested path so login can return the user to
   where they were headed, where the login form supports it.

### REQ-212 — The request hook rejects requests for unknown organizations

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-002, ADR-007
- **Implemented by:** `src/proxy.ts` — `proxy`, `src/lib/actor.ts` — `getActor`
- **Verified by:** `tests/lib/tenant.test.ts`

Beyond the session check, the proxy (or the page-level `getActor` call it precedes) rejects
requests naming an `orgSlug` that does not resolve to any organization, or that resolves to
one the session's user is not a member of — this is the practical enforcement point for
`REQ-011`'s cross-tenant guard at the routing layer, before any page-specific data fetching
even begins.

**Acceptance criteria**

1. A request to `/nonexistent-slug/...` does not render a dashboard shell before failing;
   it fails at resolution.
2. A request to a real `orgSlug` the current user does not belong to is treated the same as
   a nonexistent slug from the requester's point of view — no information about the
   organization's existence is leaked.
3. This check runs on every dashboard request, not only on the first request after login.

### REQ-213 — A user may belong to several organizations

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-009, REQ-210, DES-041
- **Implemented by:** `src/server/repositories/organization-repository.ts` — `listOrgsForUser`, `src/server/services/organization-service.ts` — `listOrganizationsForUser`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`listOrgsForUser(userId)` returns every organization a user is an active member of; there is
no limit on how many organizations one `User` row can belong to, and `user-repository.ts` is
deliberately the one repository not scoped by `orgId`, since a user's identity is global
even though every role they hold is per-organization.

**Acceptance criteria**

1. `listOrganizationsForUser` reflects membership across every organization, including ones
   where the user's role is `viewer`.
2. A user removed from one organization (`REQ-033`) retains full access to their other
   organizations, unaffected.
3. The organization switcher UI is populated from `listOrgsForUser`, not from any cached or
   session-embedded list that could go stale as memberships change.
