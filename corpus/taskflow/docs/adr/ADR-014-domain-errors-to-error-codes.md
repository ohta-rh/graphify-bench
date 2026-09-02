---
title: Map domain error classes onto a closed error code union
id: ADR-014
status: accepted
owners: [platform-team]
last_updated: 2026-02-19
related: [REQ-138, ADR-003, ADR-004, ADR-009, ADR-012]
---

# ADR-014 — Map domain error classes onto a closed error code union

## Status

Accepted, and treated as the mandatory error-handling contract for every
Server Action and Route Handler in the product — no mutation path is exempt.

## Context

Before this ADR, in December 2025 and January 2026, error handling in
Server Actions was ad hoc: some caught specific error classes and returned a
tailored message, some let errors propagate raw (which, in the App Router,
meant a generic Next.js error boundary rendering "something went wrong" with
no field-level detail), and none agreed on an HTTP-status-equivalent code the
client could branch on. This became a concrete product problem once REQ-138
was written — "exceeding a quota produces `plan_limit_exceeded`, not a
crash" — because at the time there was no `plan_limit_exceeded` concept
anywhere in the code; a quota breach was just a thrown `Error` with a plain
string message, indistinguishable, from the client's point of view, from any
other unexpected failure.

By that point the domain layer already had several purpose-built error
classes serving different concerns — `PermissionDeniedError` from ADR-003,
`TenantScopeError` from ADR-006, `AlreadyArchivedError` from ADR-004, plus
`FeatureDisabledError` (ADR-012) and `InvalidSlugError` (slug validation) —
each thrown from its own module, each carrying different, useful metadata
(`PermissionDeniedError` carries the denied `action` and the `reason` code
from `explain()`; `TenantScopeError` carries the expected and actual
`orgId`). The team needed a single place that turned any of these, plus
Zod's own `ZodError` from ADR-009, into one closed, predictable client-facing
shape, without each Server Action re-implementing that translation.

## Decision

`src/lib/errors.ts` defines `HTTP_STATUS_BY_CODE`, a
`Readonly<Record<ErrorCode, number>>` covering exactly nine codes:
`unauthorized` (401), `forbidden` (403), `not_found` (404),
`validation_failed` (422), `conflict` (409), `rate_limited` (429),
`plan_limit_exceeded` (402), `tenant_scope_violation` (403), and
`internal_error` (500). This is a closed union — `ErrorCode` in
`src/types/api.ts` — and every domain error the service layer is permitted to
throw maps onto exactly one of these codes, never a raw string.

`isDomainError(error)` recognizes the known, deliberately-thrown classes:
`PermissionDeniedError`, `TenantScopeError`, `FeatureDisabledError`,
`AlreadyArchivedError`, `InvalidSlugError`, and `ZodError` — the module's own
documentation states these are the error classes "this module knows how to
translate faithfully," implying, correctly, that anything else is treated as
an unexpected internal failure. `toAppError(error)` is the actual mapping
function: `ZodError` becomes `validation_failed` with `fieldErrorsFromZod()`
populating per-field messages; `PermissionDeniedError` becomes `forbidden`
with `meta` carrying the denied action, resource kind, and `explain()`
reason code (`denied_cross_tenant`, `denied_by_role`, and so on) so a client
that wants to log or display *why* access was denied can, without
re-deriving it; `TenantScopeError` becomes `tenant_scope_violation` with the
expected and actual org ids in `meta`; `FeatureDisabledError` becomes
`forbidden` with the flag key; `AlreadyArchivedError` becomes `conflict` with
the entity and id; `InvalidSlugError` becomes `validation_failed` with a
`slug` field error. Anything not recognized by `isDomainError()` falls
through to `internal_error`, with the raw `Error.message` surfaced only if
the thrown value actually was an `Error` instance, otherwise a fixed generic
string — deliberately not leaking arbitrary thrown values (a string, an
object, whatever a third-party dependency might throw) to the client
verbatim.

`toActionResult(error)` wraps `toAppError()`'s output into the failure half of
the `ActionResult<T>` discriminated union every Server Action returns
(`{ ok: false, error, submittedAt }`), which is what `withAction()`
(`src/actions/_lib/with-action.ts`, ADR-013) calls in its catch block, so an
individual Server Action's own code never needs a try/catch around its
service call at all — the wrapper is where errors become results.

## Consequences

**What this buys the team.** REQ-138 is now trivially true by construction:
a billing quota check throws a plain `Error` today (there is no
`PlanLimitExceededError` class yet — a known gap, see below), but every
*other* domain concern already has a precise code, and the pattern this ADR
establishes is exactly what a future `PlanLimitExceededError` would slot
into. Every client-facing error the product produces now has a stable,
finite vocabulary of nine codes, which makes client-side error handling
(toast messages, inline field errors, redirect-to-login on `unauthorized`)
a matter of switching on `code`, not on parsing message strings. The `meta`
payloads turned into a real debugging and support tool — Jan Novak's SRE
runbooks reference `TenantScopeError`'s `meta.expectedOrgId` /
`meta.actualOrgId` fields directly when triaging a reported cross-tenant
access attempt, because the error itself carries the two org ids that
matter rather than requiring a log correlation exercise.

**What it costs, and what remains a gap.** The mapping function has to be
extended every time a new domain error class is introduced, and forgetting
to do so means the new error class falls through to `internal_error` — safe
in the sense that it does not leak detail, but unhelpful in the sense that a
genuinely expected, recoverable condition (a plan-limit breach, today) gets
treated identically to a genuine bug. This is the concrete, currently-live
gap: `wouldExceedLimit()` (ADR-010) is called by billing-adjacent code, but
nothing yet throws a dedicated `PlanLimitExceededError` that `toAppError()`
recognizes — REQ-139's requirement that quota breaches emit
`billing.limit_exceeded` is satisfied at the event-bus level (ADR-005), but
the *error* a blocked mutation returns to the client today is a generic
`Error`, mapped to `internal_error`, not the `plan_limit_exceeded` code this
ADR's own status table already reserves for it. The platform team has this
tracked as follow-up work, not disputed as a design question — the code and
the HTTP status already exist in `HTTP_STATUS_BY_CODE`, waiting for the
corresponding error class.

## Alternatives considered

**Let each Server Action catch and translate errors itself.** This is what
the codebase had before, and it produced exactly the inconsistency (some
actions detailed, some generic, none agreeing on codes) that motivated this
ADR. Rejected for the same "one place to look, one place to change" reasoning
behind ADR-003 and ADR-010.

**An open-ended error code space** (any string the throwing code chooses,
rather than a closed nine-value union). Rejected because it removes the
guarantee that `HTTP_STATUS_BY_CODE` is exhaustive — a client branching on
`error.code` would have no compile-time assurance it had handled every
possible value, and a new ad hoc code introduced by one Server Action could
silently have no corresponding HTTP status mapping anywhere.

**Encode the error code inside the HTTP status alone**, without a separate
`ErrorCode` string, relying on the numeric status for client branching.
Rejected because two of the nine codes intentionally share an HTTP status
(`forbidden` and `tenant_scope_violation` are both 403) but mean genuinely
different things to the client — a tenant-scope violation should probably
never be retried or reported the same way a permission denial is, even
though both are "403" at the transport level.

## References

- REQ-138 (exceeding a quota produces `plan_limit_exceeded`, not a crash —
  the currently-incomplete case this ADR documents honestly)
- ADR-003 (`PermissionDeniedError`, mapped here to `forbidden`), ADR-004
  (`AlreadyArchivedError`, mapped here to `conflict`), ADR-009 (`ZodError`,
  mapped here to `validation_failed`), ADR-012 (`FeatureDisabledError`,
  mapped here to `forbidden`)
- Code: `src/lib/errors.ts` (`HTTP_STATUS_BY_CODE`, `isDomainError`,
  `toAppError`, `fieldErrorsFromZod`, `toActionResult`), `src/types/api.ts`
  (`ErrorCode`, `ActionResult`, `AppErrorShape`),
  `src/actions/_lib/with-action.ts`
