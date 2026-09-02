---
title: Server Action wrapper, errors and permission resources
id: DES-ACTION-CORE
status: approved
owners: [platform-team, d.okafor]
last_updated: 2026-06-12
related: [REQ-200, REQ-210, REQ-211, ADR-001, ADR-003, ADR-009, ADR-014, DES-070, DES-100]
---

## Purpose

This document covers the three files under src/actions/_lib/: `with-action.ts`,
`action-errors.ts` and `permission-resources.ts`. Every Server Action in the corpus except
five deliberately documented exceptions funnels through `withAction()`. These three files
are the load-bearing plumbing of the entire mutation surface — the four responsibilities
the common brief lists for every mutation ("validate, authenticate, translate errors,
revalidate") are implemented exactly once, here, rather than being re-implemented by each
of the thirty-nine action files.

`with-action.ts`'s own header comment states this concentration of responsibility
explicitly: "Owner D. Every mutation in `src/actions/**` funnels through here so the four
things each one must do — validate, authenticate, translate errors, revalidate — happen in
exactly one place." That sentence is the design thesis of the whole action layer, and this
document is where it gets unpacked function by function.

## Public surface

| function | signature | tables touched | pagination | notes |
|---|---|---|---|---|
| `withAction` | `<TSchema, TData>(schema, handler, options?) => (raw) => Promise<ActionResult<TData>>` | none directly | — | the wrapper itself |
| `resolveActorFor` (private) | `(input, fromInput) => Promise<Actor>` | none directly | — | orgSlug/orgId-from-input, else session |
| `stamp` (private) | `<T>(result) => ActionResult<T>` | none | — | attaches `submittedAt` |
| `UnauthorizedActionError` | class, `code: "unauthorized"` | — | — | no session, or session with no active org |
| `ForbiddenActionError` | class, `code: "forbidden"`, carries `action: PermissionAction` | — | — | `can()` returned false |
| `PlanLimitError` | class, `code: "plan_limit_exceeded"`, carries `resource`, `limit`, `used` | — | — | a `LimitedResource` quota would be breached |
| `RateLimitedError` | class, `code: "rate_limited"`, carries `bucketKey`, `resetAt` | — | — | `consumeRateLimit` refused |
| `FeatureUnavailableError` | class, `code: "forbidden"`, carries `flag` | — | — | a gating flag is off |
| `ActionNotFoundError` | class, `code: "not_found"`, carries `what` | — | — | row not found inside the actor's tenant |
| `PENDING_ISSUE_ID` / `PENDING_PROJECT_ID` / `PENDING_COMMENT_ID` / `PENDING_MEMBER_ID` | branded empty strings | — | — | create-time `can()` placeholders |
| `ANONYMOUS_ORG_ID` | branded empty string | — | — | rate-limit bucket owner pre-session |

### DES-220 — `withAction` is the single funnel for validate, authenticate, translate, revalidate

- **Satisfies:** REQ-200, REQ-211
- **Decided in:** ADR-001, ADR-009
- **Code:** `src/actions/_lib/with-action.ts` — `withAction`

`withAction(schema, handler, options)` returns a closure — `runAction(raw)` — that a given
action file exports directly (or, more often, wraps in a one-line named export function so
the client-facing name matches the file, e.g. `archiveIssueAction`). Inside `runAction`,
the sequence is fixed: `schema.safeParse(raw)` first, returning a stamped failure
`ActionResult` immediately on a validation miss without ever calling the handler; then
`resolveActorFor()` to get an `Actor`; then the handler itself, wrapped in a `try/catch`
that routes every thrown error — domain errors from the service layer, the action-layer
error classes from `action-errors.ts`, or anything else — through `toActionResult()` (in
`src/lib/errors.ts`, described in the repository documents' cross-references as
ADR-014's error-code mapping). On success, `options.revalidate` tags are passed to
`revalidateTagged()` with `options.cacheProfile ?? CACHE_PROFILES.minutes` as the
cache-life profile Next 16 requires as `revalidateTag`'s second argument. This ordering —
validate before authenticate, authenticate before handle, handle before revalidate — is
uniform across all thirty-four actions that use `withAction`, which is what lets ADR-009's
shared-schema design (the same Zod schema validating both a client form and the action
input) actually hold: the schema is always the first gate, never bypassed by a handler that
might otherwise be tempted to read a raw field before validation completes.

### DES-221 — Actor resolution prefers the payload's own org identity over the session default

- **Satisfies:** REQ-210, REQ-211
- **Decided in:** ADR-001, ADR-006
- **Code:** `src/actions/_lib/with-action.ts` — `resolveActorFor`, `ActionOptions.requireOrg`

`resolveActorFor(input, fromInput)` checks, when `fromInput` is true (the default, since
`ActionOptions.requireOrg` defaults to `true` when not explicitly set to `false`), whether
the already-Zod-parsed input object carries a non-empty `orgSlug` string or `orgId` string
field. If `orgSlug` is present it calls `getActor(orgSlug)`; if only `orgId` is present it
calls `requireActorFor(orgId as OrgId)`. Only when neither is present — or when
`options.requireOrg === false`, the path `updateProfileAction` uses — does it fall back to
`getSessionPrincipal()` and resolve against `principal.activeOrgId`, throwing
`UnauthorizedActionError` if there is no session or no active org. The doc comment on the
function explains the split in practical terms: "`getActor(orgSlug)` is the primary path
because most mutations are dispatched from a `[orgSlug]` route; actions whose payload
carries the branded `orgId` instead resolve through `requireActorFor()`." This preference
for the payload's own org identity over whatever happens to be the session's active org is
what makes it possible for a single browser session to have two tabs open on two different
organizations and mutate the correct one in each — the active-org fallback exists only for
the minority of actions, like `updateProfileAction`, that genuinely have no org-bearing
field in their payload to resolve against.

### DES-222 — Action-layer error classes mirror service-layer domain errors under one closed `ErrorCode` union

- **Satisfies:** REQ-138, REQ-193
- **Decided in:** ADR-014
- **Code:** `src/actions/_lib/action-errors.ts`

`action-errors.ts`'s header comment is explicit that these six classes exist at this layer
specifically: "these live in src/actions/_lib because only the action layer produces
them — services throw their own domain errors, and repositories throw none." Each class
carries a `readonly code` matching one of the nine `ErrorCode` values `HTTP_STATUS_BY_CODE`
in `src/lib/errors.ts` maps to an HTTP status: `UnauthorizedActionError` →
`"unauthorized"` (401), `ForbiddenActionError` → `"forbidden"` (403, also shared with
`FeatureUnavailableError`), `PlanLimitError` → `"plan_limit_exceeded"` (402),
`RateLimitedError` → `"rate_limited"` (429), `ActionNotFoundError` → `"not_found"` (404).
This mirrors, rather than duplicates, the convention `PermissionDeniedError` and
`TenantScopeError` already establish at the service layer — both layers independently throw
typed errors that `toAppError()` translates by `instanceof` check, and `isDomainError()` in
`src/lib/errors.ts` recognizes the service-layer set but not this action-layer set by name,
because `toActionResult`'s catch-all branch (returning `{ code: "internal_error", ... }`)
is only reached for errors *neither* layer recognizes — the action-layer classes are
recognized through their own `readonly code` field being read directly in some call sites
and through structural equivalence with the service-layer mapping pattern in others. The
practical effect for a form author: whichever layer detects the problem first, the shape of
what reaches the browser is identical.

### DES-223 — `stamp()` attaches `submittedAt` so `useActionState` can distinguish two results

- **Satisfies:** REQ-200
- **Decided in:** ADR-001
- **Code:** `src/actions/_lib/with-action.ts` — `stamp`

`stamp<T>(result)` is a tiny function — it takes an `ActionResult<T>` that is either `{ ok:
true, data }` or `{ ok: false, error }` and returns the same shape with a
`submittedAt: new Date().toISOString()` field added. Every return path inside `runAction`
passes through `stamp()`, including the early validation-failure return. The reason this
matters at all, rather than being pure overhead, is React's `useActionState` hook (the
client-side counterpart every form in src/components/domain/ built against a Server
Action uses): two consecutive submissions of the same form that both fail with an
identical error shape would otherwise be indistinguishable to a `useEffect` watching the
action's result for changes, since object identity is not guaranteed to differ and the
error payload could be byte-for-byte the same. A monotonically fresh `submittedAt` on every
single result — success or failure, validation or handler-thrown — guarantees the client
always has a new value to key off, even when everything else about two results is
identical.

### DES-224 — Placeholder branded ids let create-time permission checks reuse the same `PermissionResource` shape

- **Satisfies:** REQ-023
- **Decided in:** ADR-003, ADR-015
- **Code:** `src/actions/_lib/permission-resources.ts` — `PENDING_ISSUE_ID`, `PENDING_PROJECT_ID`, `PENDING_COMMENT_ID`, `PENDING_MEMBER_ID`

`can()`'s `PermissionResource` type is a closed discriminated union (`src/types/permission.ts`),
and every resource variant — `{ kind: "issue", issueId, ... }`, `{ kind: "project",
projectId, ... }`, and so on — requires an id field even for an action like "may this actor
create an issue," where no issue exists yet to have an id. The file's own comment explains
the resolution: "asking 'may this actor create an issue in this project?' still has to name
an `issueId`. The ownership escalations inside `can()` compare ids for equality, and an
empty string never matches a real ULID — so a create check falls through to the role
matrix, which is exactly the intent." `PENDING_ISSUE_ID`, `PENDING_PROJECT_ID`,
`PENDING_COMMENT_ID` and `PENDING_MEMBER_ID` are each just `"" as <BrandedId>` — a value
that satisfies the type system's requirement for a branded id string without corresponding
to any row `insertIssue`, `insertProject`, `insertComment` or `insertMember` will ever
actually produce, since `newId()` (`src/lib/id.ts`) never generates an empty string. This
is a narrow, deliberate use of the branded-id escape hatch ADR-015 otherwise closes off
everywhere else in the codebase — the one place branded ids are cast from a raw literal
rather than produced by `newId()` or read back off a database row.

### DES-225 — `ANONYMOUS_ORG_ID` and the deliberate layering exceptions this action layer accepts

- **Satisfies:** REQ-208, REQ-211
- **Decided in:** ADR-001, ADR-013
- **Code:** `src/actions/_lib/permission-resources.ts` — `ANONYMOUS_ORG_ID`; `src/actions/profile/update-profile.ts`

`ANONYMOUS_ORG_ID` is `"" as OrgId`, used exclusively as the first argument to
`consumeRateLimit()` inside `loginAction`, `requestPasswordResetAction` and
`confirmPasswordResetAction` — the three flows reachable before any session, hence any
`orgId`, exists. Because `consumeRateLimit`'s bucket key is `${orgId}:${bucketKey}`
(`src/lib/rate-limit.ts`), every unauthenticated caller sharing the same empty-string
`orgId` means the `auth:password-reset` and equivalent buckets are effectively global
rather than per-tenant for these three flows specifically — a deliberate trade documented
here rather than left implicit, since it is the one case in the whole rate-limiting design
where the bucket is not truly tenant-scoped.

This document is also the right place to name, plainly, the layering exception the common
brief calls out as the most significant one in the action layer: `update-profile.ts` does
not call any service function at all. Its own comment states the reasoning: "the profile is
the one write with no service in front of it: there is no tenant rule, no event and no
quota to apply, so the action talks to `UserRepository` directly rather than inventing a
pass-through service." `updateProfileAction` still runs through `withAction` — it still
validates with `updateProfileSchema`, still resolves an `Actor` (with `requireOrg: false`,
per DES-221), still maps errors through `toActionResult` — but its handler calls
`updateUser` from `src/server/repositories/user-repository.ts` directly rather than through
a `UserService` that does not exist. Four other files in the corpus carry the same kind of
exception at the page-component level rather than the action level —
`src/app/(dashboard)/[orgSlug]/profile/page.tsx`,
`src/app/(dashboard)/[orgSlug]/settings/members/invitations/page.tsx`,
`src/app/(dashboard)/[orgSlug]/settings/notifications/page.tsx`, and
`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx` — each
calling a repository function directly from a Server Component rather than through
src/server/services/. None of these five exceptions are accidents; they are documented in
the project's own commentary as intentional narrow bypasses of ADR-013's service-layer
boundary, made specifically for reads or writes with no permission rule, no event, and no
quota attached to them.

## Invariants

- `withAction`'s handler is never invoked before `schema.safeParse` has succeeded.
- Every `ActionResult` returned from `runAction` — success, validation failure, or
  handler-thrown error — carries a `submittedAt` stamp from the same call to `stamp()`.
- `resolveActorFor` never resolves an `Actor` for an organization the input did not name
  and the session's `activeOrgId` did not confirm.
- The four `PENDING_*` id constants are never equal to a real branded id produced by
  `newId()`.
- `update-profile.ts` is the only action file under src/actions/ that imports directly
  from src/server/repositories/ rather than from src/server/services/.

## Test coverage

`tests/lib/errors.test.ts` covers `toAppError`/`toActionResult`/`isDomainError` directly.
`tests/contract/permissions.test.ts` and `tests/server/permissions.test.ts` cover the
`can()` contract these action-layer checks call into, including the ownership-escalation
behavior `PENDING_*` ids are designed to fall through past. `tests/lib/rate-limit.test.ts`
covers `consumeRateLimit`'s bucket-key behavior, including the shared-bucket consequence of
`ANONYMOUS_ORG_ID`. There is no dedicated tests/actions/ directory in the corpus at all —
Server Action behavior is exercised indirectly through the service-layer tests
(`tests/services/*.test.ts`) that the actions' handlers ultimately delegate to, plus the
schema tests (`tests/schemas/*.test.ts`) that validate the Zod layer every `withAction` call
parses against before an actor is ever resolved.

## Control flow: a validation failure versus a handler-thrown domain error

```mermaid
flowchart TD
    A[raw input] --> B{schema.safeParse}
    B -- fail --> C[stamp(toActionResult(ZodError))]
    B -- success --> D[resolveActorFor]
    D -- no session/org --> E[throw UnauthorizedActionError]
    D -- resolved --> F[handler(parsed.data, actor)]
    F -- throws ForbiddenActionError/PlanLimitError/etc --> G[catch block]
    F -- throws service domain error --> G
    F -- resolves --> H[revalidateTagged(options.revalidate, profile)]
    E --> G
    G --> I[stamp(toActionResult(error))]
    H --> J[stamp({ ok: true, data })]
    C --> K[ActionResult returned to client]
    I --> K
    J --> K
```

Both the early validation exit and every downstream throw converge on the same
`stamp(toActionResult(...))` call, which is precisely the "exactly one place" claim
`with-action.ts`'s header comment makes — there is no second, differently-shaped failure
path anywhere in the thirty-four actions built on this wrapper.
