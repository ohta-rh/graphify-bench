---
title: Server Actions — shared machinery
id: API-ACTIONS-OVERVIEW
status: approved
owners: [platform-team, d.okafor]
last_updated: 2026-05-22
related: [DES-220, DES-221, DES-222, DES-223, ADR-009, ADR-014, ADR-019, ADR-015]
---

# Server Actions — shared machinery

Every mutation in Taskflow that a browser can trigger from inside the authenticated
dashboard goes through one of the 38 Server Action files under src/actions/. This
document is the map of what they have in common before you read the per-domain pages
(`actions-auth.md`, `actions-issues.md`, and so on): the `withAction()` wrapper, how the
acting principal is resolved, how a Zod parse failure or a thrown domain error turns into
the shape a form actually renders, how cache tags get invalidated, and the handful of
actions that opt out of all of this because there is no tenant yet to opt into.

If you are about to write action number 39, read this file end to end first. Nearly every
review comment on a new action in this codebase — "why isn't this going through
`withAction()`", "why are you calling `revalidatePath` here" — traces back to something
documented on this page.

## The `ActionResult` envelope

`src/actions/_lib/with-action.ts` and every hand-rolled action agree on one return shape,
`ActionResult<T>`, defined in `src/types/api.ts`:

```ts
type ActionResult<T> =
  | { ok: true; data: T; submittedAt: IsoTimestamp }
  | { ok: false; error: AppErrorShape; submittedAt: IsoTimestamp };
```

No action throws across the server/client boundary. A `"use server"` function that threw
would surface as an opaque digest in the browser console and nothing else useful; instead,
every code path — successful parse, failed parse, thrown domain error — resolves to a
value of this shape, and the client form layer branches on `result.ok`. `submittedAt` is
not decorative: `useActionState` in React 19 needs some field that changes between two
calls to know a *second* submission produced a *new* result even when the payload and the
success/failure shape happen to be identical (submit the same invalid form twice in a row,
get "the same" error both times — without a changing field the hook would not re-render).
The function that stamps it, `stamp()`, lives at the bottom of `with-action.ts` and is
private to that module; every action that does not go through `withAction()` — the five
described in "Actions with no `Actor` yet" below — sets `submittedAt: new Date().toISOString()`
itself at the call site instead, which is the one piece of `withAction()`'s behavior those
actions have to reimplement rather than skip. This is DES-223.

## `withAction()`: the four responsibilities, in order

`withAction<TSchema, TData>(schema, handler, options)` returns the actual exported action
function. DES-220 names it the single funnel for validate, authenticate, translate,
revalidate, and the implementation performs exactly those four steps in exactly that
order:

```mermaid
sequenceDiagram
    participant Form as Client form
    participant Action as withAction() closure
    participant Schema as Zod schema
    participant Actor as getActor / requireActorFor
    participant Handler as action handler
    participant Service as service layer
    participant Cache as revalidateTagged()

    Form->>Action: runAction(raw)
    Action->>Schema: schema.safeParse(raw)
    alt parse fails
        Schema-->>Action: ZodError
        Action-->>Form: stamp(toActionResult(error))
    else parse succeeds
        Schema-->>Action: parsed.data
        Action->>Actor: resolveActorFor(parsed.data, requireOrg)
        alt no session / no active org
            Actor-->>Action: throws UnauthorizedActionError
            Action-->>Form: stamp(toActionResult(error))
        else actor resolved
            Actor-->>Action: Actor
            Action->>Handler: handler(parsed.data, actor)
            alt handler throws
                Handler-->>Action: domain error
                Action-->>Form: stamp(toActionResult(error))
            else handler resolves
                Handler->>Service: can() / service call(s)
                Service-->>Handler: result
                Handler-->>Action: data
                Action->>Cache: revalidateTagged(tags, cacheProfile)
                Action-->>Form: stamp({ ok: true, data })
            end
        end
    end
```

1. **Validate.** `schema.safeParse(raw)` runs first, before anything that could touch the
   database or the session. A malformed payload never reaches actor resolution, which
   matters because actor resolution can itself read `parsed.data` (see below) — an
   unvalidated `orgSlug` field is not a safe thing to hand to `getActor()`.
2. **Authenticate.** `resolveActorFor()` turns the validated input plus the session cookie
   into an `Actor`. This is where `UnauthorizedActionError` gets thrown for a missing or
   expired session, before the handler runs at all.
3. **Translate errors.** The handler runs inside a `try/catch`; whatever it throws —
   `ForbiddenActionError`, `PlanLimitError`, `RateLimitedError`, a service-layer
   `PermissionDeniedError`, a Zod error from a nested parse — is caught by the same
   `toActionResult()` used for the initial validation failure, so the client never has to
   special-case "the error came from parsing" versus "the error came from the handler."
4. **Revalidate.** Only after the handler resolves successfully does `withAction()` call
   `revalidateTagged(options.revalidate ?? [], options.cacheProfile ?? CACHE_PROFILES.minutes)`.
   A thrown error skips this step entirely — there is nothing to revalidate for a mutation
   that did not happen.

`ActionOptions` is deliberately small: `requireOrg` (default `true`), `revalidate` (a
static list of cache tags, distinct from the dynamic ones — `orgTag(id)`, `issueTag(id)` —
that the handler itself often calls `revalidateTagged()` with a second time, for the exact
row it touched), and `cacheProfile` (the named staleness budget from `CACHE_PROFILES`,
required because Next.js 16's `revalidateTag` takes a cache-life profile rather than an
implicit default). See `design/caching-and-revalidation.md` for what `CACHE_PROFILES` and
tag composition mean in practice (DES-070 through DES-077); this page only covers where
the call happens inside the action, not the tag vocabulary itself.

## Actor resolution: `requireOrg` and the two input shapes

`resolveActorFor(input, fromInput)` inside `with-action.ts` is short but easy to misread on
a first pass. When `options.requireOrg` is not explicitly `false` (the default is `true`),
it inspects the *already-parsed* input for an `orgSlug` or `orgId` field:

- If `orgSlug` is present, it calls `getActor(orgSlug)`, the same helper a Server Component
  under `[orgSlug]/` uses.
- Else if `orgId` is present, it calls `requireActorFor(orgId as OrgId)`.
- Otherwise — or when `requireOrg` is `false` — it falls back to
  `getSessionPrincipal()` and resolves the actor against the session's `activeOrgId`,
  throwing `UnauthorizedActionError` if there is no session or no active org.

This is DES-221: **actor resolution prefers the payload's own org identity over the
session default.** The reason is concrete, not stylistic. `changePlanAction` and
`updateOrganizationAction` both carry an `orgId` field in their schema — the org being
billed or renamed is named explicitly by the form, and if a user has two browser tabs open
on two different organizations, the session's "active" org (whichever tab switched last)
must not silently override which org the submitted form actually intended to mutate. Only
`updateProfileAction` sets `requireOrg: false`: a profile is a `User` row, not a tenant row,
its schema carries no `orgId` or `orgSlug` at all, and the wrapper has nothing to prefer
over the session default because there is nothing to prefer it to.

`getActor()` and `requireActorFor()` themselves — including what a resolved `Actor` looks
like and how `assertOrgScope()` fits in — are described in `design/tenant-isolation.md`
(DES-032). This page only covers how the action layer decides *which* of the two to call.

## Placeholder branded ids for not-yet-existing rows

`PermissionResource` (see `design/permission-model.md`, DES-045) is a closed discriminated
union keyed by resource kind, and every variant names an id — `issueId`, `projectId`,
`commentId`, `memberId`. That is fine when checking "may this actor archive issue X," but
awkward when checking "may this actor create an issue in this project," where no issue id
exists yet. `src/actions/_lib/permission-resources.ts` exports four placeholder branded
ids for exactly this — `PENDING_ISSUE_ID`, `PENDING_PROJECT_ID`, `PENDING_COMMENT_ID`,
`PENDING_MEMBER_ID`, each the empty string cast to the branded type — plus
`ANONYMOUS_ORG_ID`, used as the rate-limit bucket owner for the handful of actions that run
before any org exists (`loginAction`, `requestPasswordResetAction`,
`confirmPasswordResetAction`). This is DES-224: reusing the same `PermissionResource` shape
for create-time checks works because the ownership escalations inside `can()` compare ids
for equality, and an empty string never matches a real ULID, so a create check with a
pending id falls straight through to the role matrix — which is exactly the intended
behavior, since ownership cannot apply to a row that does not exist yet. You will see
`PENDING_PROJECT_ID` passed for `issue:assign`, `issue:update` (via `change-issue-status`
and `move-issue`), and `issue:update` in `update-issue.ts` too — all three ask about a
specific issue whose `projectId` the action has not fetched, and the role matrix does not
consult the project id for those actions, so the placeholder is safe there specifically
because the permission check never reads it.

## Action-layer error classes

`src/actions/_lib/action-errors.ts` declares six error classes that exist *only* in the
action layer — services throw their own domain errors (`PermissionDeniedError`,
`TenantScopeError`, `FeatureDisabledError`, `AlreadyArchivedError`, `InvalidSlugError`),
and repositories throw none at all:

| class | `code` | thrown when |
|---|---|---|
| `UnauthorizedActionError` | `unauthorized` | no session, or the session's active org no longer exists |
| `ForbiddenActionError` | `forbidden` | the action-layer `can()` pre-check returned `false` |
| `PlanLimitError` | `plan_limit_exceeded` | a count from `@/config/plan-limits` would be exceeded |
| `RateLimitedError` | `rate_limited` | `consumeRateLimit()` refused the request |
| `FeatureUnavailableError` | `forbidden` | a feature flag gating the whole action evaluates to off |
| `ActionNotFoundError` | `not_found` | the row the action addresses is not in the actor's tenant |

This is DES-222: these mirror the service-layer domain errors under one closed `ErrorCode`
union rather than inventing a second taxonomy the client would have to learn. Notice that
`ForbiddenActionError` (thrown by the action's own `can()` pre-check) and
`PermissionDeniedError` (thrown by `assertCan()` inside a service) both map to `forbidden`
— they exist as separate classes because the action layer already knows the action name at
the point of the check and does not need the full `PermissionDecision` object a service's
`assertCan()` carries, not because the client needs to tell them apart.

## Error translation: from thrown class to `AppErrorShape`

`toAppError()` in `src/lib/errors.ts` is the single function that turns any thrown value —
one of the six classes above, one of the five service-layer domain error classes, a
`ZodError`, or an unrecognized `Error` — into `AppErrorShape`, and `HTTP_STATUS_BY_CODE`
is the single mapping from the resulting `ErrorCode` to an HTTP status. Route Handlers use
the exact same two functions (see `route-handlers.md`), which is why an action and a route
handler that both fail with, say, a plan-limit breach, produce byte-for-byte the same error
shape.

| thrown class | `ErrorCode` | HTTP status | notes |
|---|---|---|---|
| `ZodError` | `validation_failed` | 422 | `fieldErrorsFromZod()` collapses issues into `field → messages[]`, keyed `_root` for a root-level refinement |
| `PermissionDeniedError` | `forbidden` | 403 | `meta` carries `action`, `resourceKind`, `reason` from the `PermissionDecision` |
| `TenantScopeError` | `tenant_scope_violation` | 403 | `meta` carries `expectedOrgId`/`actualOrgId` |
| `FeatureDisabledError` | `forbidden` | 403 | `meta` carries the flag key |
| `AlreadyArchivedError` | `conflict` | 409 | `meta` carries `entity`/`id` |
| `InvalidSlugError` | `validation_failed` | 422 | also populates `fieldErrors.slug` |
| `UnauthorizedActionError` | `unauthorized` | 401 | action-layer only |
| `ForbiddenActionError` | `forbidden` | 403 | action-layer only |
| `PlanLimitError` | `plan_limit_exceeded` | 402 | action-layer only |
| `RateLimitedError` | `rate_limited` | 429 | action-layer only |
| `FeatureUnavailableError` | `forbidden` | 403 | action-layer only |
| `ActionNotFoundError` | `not_found` | 404 | action-layer only |
| anything else (`Error` or not) | `internal_error` | 500 | message passed through only if it was an `Error` instance |

The nine `ErrorCode` values and their status codes are declared once, in
`HTTP_STATUS_BY_CODE`: `unauthorized` 401, `forbidden` 403, `not_found` 404,
`validation_failed` 422, `conflict` 409, `rate_limited` 429, `plan_limit_exceeded` 402,
`tenant_scope_violation` 403, `internal_error` 500. ADR-014 records why this is one closed
union rather than each layer inventing its own codes.

`isDomainError()` in the same module exists for callers — mostly tests — that want to
assert a failure was a recognized, translated error rather than a bug that happened to be
caught; it checks `instanceof` against the five service-layer classes plus `ZodError` and
deliberately does not include the six action-layer classes, since those already carry their
own `code` field and never reach `toAppError()`'s fallback branch.

## Cache tags and the `revalidate` option

The `revalidate` array on `ActionOptions` and the `revalidateTagged()` calls scattered
through individual handlers look redundant at first glance and are not: `withAction()`'s
own call, if `options.revalidate` is non-empty, invalidates a *static* set of tags — think
`["issues", "board"]`, group-level tags that every list view for that entity subscribes to
— while a handler's own `revalidateTagged([issueTag(issue.id), projectTag(issue.projectId)], ...)`
invalidates the *specific* rows the mutation touched. `create-issue.ts` invalidates
`orgTag`, `projectTag` and `issueTag` for the one issue it created, on top of the static
`["issues"]` tag `withAction()` invalidates afterward — two calls, two different scopes,
both needed because a reader might be looking at "all issues in this project" (the static
tag) or "this one issue's detail page" (the dynamic tag). See DES-075, tag composition, in
`design/caching-and-revalidation.md`, for the general rule; the pattern above is that rule
applied consistently across every mutating action in this corpus. DES-077 is worth
repeating here because it explains a failure mode you might otherwise chase as a bug:
`withAction()`'s revalidation is best-effort, not transactional — if the underlying write
committed and the `revalidateTagged()` call itself threw, the mutation still succeeded and
the action still returns `{ ok: true }`; a stale cache is the cost of that ordering, and it
resolves itself on the profile's own staleness budget.

## Actions with no `Actor` yet

Five action files cannot go through `withAction()` at all, because the wrapper's very first
non-validation step is resolving an `Actor`, and these five run at a point where no `Actor`
can exist:

- `loginAction`, `requestPasswordResetAction`, `confirmPasswordResetAction` — nobody is
  signed in yet.
- `registerAction` — the user, their org and their membership do not exist until this call
  succeeds.
- `acceptInvitationAction` — the caller is signed in (so a `SessionPrincipal` exists) but
  is, by definition, not yet a member of the org the invitation targets, so there is no
  `Actor` inside that org until the membership row is written mid-handler.

Each of these hand-rolls the same four-step shape `withAction()` automates — parse, then a
`try/catch` around the real work, stamping `submittedAt` on every branch itself — because
step 2 (authenticate against an org) does not apply. `ANONYMOUS_ORG_ID` from
`permission-resources.ts` is what lets the three unauthenticated auth actions still charge
a rate-limit bucket despite having no tenant to charge it against; `consumeRateLimit()`
does not distinguish a real org id from the placeholder, it only needs *some* stable key to
bucket against, and a shared anonymous bucket is the point — it is what makes login
throttling apply per unauthenticated-traffic-source rather than per (nonexistent) tenant.
This is documented per-file in `design/action-auth-profile-search-webhooks.md` (DES-252
through DES-259) and in `actions-auth.md` and `actions-members.md` in this directory; this
page only flags the pattern so a reader is not surprised the first time they see an action
file with no `withAction()` call in it at all.

## The known layering exceptions inside the action directory

Four action files bypass the service layer entirely and call a repository directly, and
one service admits in its own doc comment that it cannot do something the architecture
would otherwise expect of it. `src/actions/profile/update-profile.ts` is the one under this
directory: it calls `updateUser()` in `src/server/repositories/user-repository.ts` directly
rather than routing through a `ProfileService` that does not exist, because — as its own
comment states — there is no tenant rule to enforce, no event to emit (`TaskflowEventMap`
has no profile-related key) and no quota to check, so a pass-through service would add a
layer with no work to do. This is DES-255 and is covered in full, along with the other four
deliberate exceptions across the whole codebase (three of which live under
src/app/(dashboard)/, outside this directory), in `design/module-map.md` (DES-017) and
`design/architecture-overview.md` (DES-008). `auth-service.ts`'s inability to emit any
domain event — `TaskflowEventMap` defines no authentication keys — is DES-164 and DES-259;
`actions-auth.md` covers what that means concretely for `loginAction` and `registerAction`.

Related: DES-020, DES-025, DES-032, DES-070, REQ-010, REQ-011, ADR-003, ADR-013.
