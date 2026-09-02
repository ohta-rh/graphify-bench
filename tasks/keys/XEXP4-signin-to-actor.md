# Rubric — from submitted credentials to an authorized actor on a tenant page

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **Sign-in cannot use the shared action wrapper.** `loginAction` in
   `src/actions/auth/login.ts` parses with `loginSchema` and handles its own
   errors through `toActionResult` instead of going through `withAction()`,
   because there is no tenant and therefore no `Actor` to resolve yet — the
   file's own header says so. The rate limit is charged against a sentinel
   anonymous org (`ANONYMOUS_ORG_ID` in the action, `ANONYMOUS_ORG` in
   `auth-service`) on the `auth:login` bucket. Award the point for the
   no-tenant-yet reason the login path is shaped differently.

2. **Credential verification is deliberately uninformative.** `login()` in
   `src/server/services/auth-service.ts` charges `consumeRateLimit` *before*
   checking the password, so a brute-force run is throttled whether or not it
   guesses correctly; an unknown email and a wrong password both throw the
   identical "Those credentials did not match". The stored value is compared
   with `verifyPassword` against `userRepository.findPasswordHash`. Award the
   point for the rate limit preceding the check and/or the two failure modes
   being indistinguishable.

3. **Minting the session, and what reaches the database.**
   `createSessionToken(userId)` in `src/server/services/session-service.ts`
   generates `randomToken(32)`, computes `expiresAt` as now +
   `SESSION_TTL_DAYS` (30) days, and stores only `hashToken(token)` via
   `sessionRepository.createSession` — a dump of the `sessions` table cannot be
   replayed as a login. The action then calls `resolveSession(token)` to get
   the `SessionPrincipal` and `setSessionCookie(token, principal.expiresAt)` in
   `src/lib/session.ts`, which is the only module that touches the cookie jar
   (`httpOnly`, `sameSite: "lax"`, `secure` in production). Award the point for
   the hash-only storage plus the cookie being written in exactly one module.

4. **Reading the cookie back, and where expiry is actually enforced.**
   `getSessionPrincipal()` in `src/lib/session.ts` reads the cookie, calls
   `resolveSession` (hash lookup) and then compares
   `parseIso(principal.expiresAt).getTime() > Date.now()`, returning `null`
   otherwise. Callers wanting a hard failure use `getActor()` in
   `src/lib/actor.ts` instead. Award the point for the per-request expiry
   comparison living on the read path rather than only in the database sweep.

5. **Principal → `Actor`, and the tenant page's fixed order of operations.**
   `loadTenantContext(orgSlug)` in
   `src/app/(dashboard)/[orgSlug]/_lib/tenant-context.ts` resolves the org
   (`resolveOrgBySlug`, `notFound()` when missing), resolves the caller with
   `getActor(orgSlug)`, asserts the two agree with `assertOrgScope`, and only
   then evaluates flags (`snapshotFlags(buildFlagContext(actor, org))`) — doing
   it in another order is how a page evaluates flags against somebody else's
   plan. The `Actor` itself is built by `resolveActorForOrg` /
   `memberService.resolveActor`, which require an **active** membership, and a
   missing org and an unreachable org are the same 404 so slugs cannot be
   enumerated. Award the point for the ordered org → actor → assert → flags
   sequence, or for membership being what turns a principal into an `Actor`.
