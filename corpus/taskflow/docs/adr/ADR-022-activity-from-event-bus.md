---
title: Derive the audit trail from the event bus
id: ADR-022
status: accepted
owners: [platform-team]
last_updated: 2026-06-04
related: [REQ-220, REQ-221, REQ-222, REQ-228, ADR-005, ADR-004]
---

# ADR-022 — Derive the audit trail from the event bus

## Status

Accepted, and the most recently written ADR in this corpus. In production
since June 2026, closing out what the team considers the last major
architectural decision of the product's first two quarters.

## Context

REQ-220 requires every domain event be recorded as an activity row, and
REQ-221 requires those rows be immutable — an audit trail a support engineer
or a compliance-minded customer can trust has to be a faithful, unedited
record of what actually happened, not a reconstruction. By May 2026, the
event bus from ADR-005 already carried a well-typed, closed catalogue of
every domain action that mattered — the exact set of "things that happened"
an audit trail needs to capture — which made deriving activity from events,
rather than writing a separate audit-logging call into each service method
directly, the obvious design once the bus existed.

The harder design question was failure isolation. REQ-228 requires activity
capture must not fail the originating write — an audit-log insert failing
should never cause the issue creation, status change, or comment it was
trying to record to fail along with it. If `ActivityService` had been called
directly, inline, from inside `IssueService.createIssue()` (say, right after
the row insert, before the function returns), any exception in the
activity-insert path — a full disk, a constraint violation, anything —
would propagate up through the same call stack as the create-issue
operation itself, unless every single call site remembered to wrap the
audit-log call in its own try/catch and swallow the error correctly. The
team wanted that safety property to be structural, not a discipline every
service author has to remember to apply.

## Decision

`src/server/services/activity-service.ts`'s `registerActivityListeners()`
subscribes to the specific domain events the audit trail cares about —
`project.created`, `project.archived`, `issue.created`,
`issue.status_changed`, `issue.assigned`, `comment.created`,
`member.invited`, `member.role_changed`, `billing.plan_changed` — each
handler transforming that event's payload into an `ActivityRecordInput`
(actor, subject kind and id, project scope, a human-readable summary, and
optional structured metadata) and calling `record()`, which inserts one
immutable row via `activityRepo.insertActivity()`. Because these are
ordinary `subscribe()` registrations on the same bus ADR-005 defines, they
inherit that bus's handler-isolation guarantee automatically: `emit()`
awaits every handler via `Promise.allSettled` and reports a rejected
handler to error sinks rather than rethrowing into the emitting service's
call stack. REQ-228 is therefore satisfied structurally, by composition with
ADR-005's own design, rather than by activity-specific error-handling code —
an activity-insert failure surfaces as a reported handler error, logged and
observable, but the `issue.created` event's *other* subscribers (search
indexing, notifications) still run, and — critically — the
`IssueService.createIssue()` call that triggered the event has already
returned successfully by the time any subscriber runs at all, since
`emit()` is called after the issue row is committed, not before.

`record()` deliberately takes no `Actor` parameter, and the module's own
comment explains why: the writer is usually an event handler running
outside a request, with no authenticated principal of its own to check
permissions against — the row's `actorId` comes from the event payload
(itself stamped by whoever originally called `emit()`), not from a fresh
authorization check at write time. Reading is a different matter:
`listActivity(actor, input)` calls `assertOrgScope()` then
`assertCan(actor, "activity:read", ...)` (REQ-224 — reading requires
member) before querying, and `exportActivity(actor, input)` additionally
checks `assertCan(actor, "activity:export", ...)` (REQ-225 — admin) and, for
CSV specifically, the `csv_export` feature flag (ADR-012) — CSV export is
gated twice, once by role and once by plan, and rejects with a plain error
if the flag is off for the org's plan even though the role check passed.
`groupByDay()` buckets a feed page by calendar day for the UI, newest day
first; `exportActivity()`'s CSV path uses `toCsv()` over a fixed
`EXPORT_COLUMNS` tuple (`occurredAt`, `action`, `actorId`, `subjectKind`,
`subjectId`, `summary`) — REQ-230's requirement that CSV export escapes
quotes and separators is handled inside the shared `toCsv()` utility, not
reimplemented here.

Activity rows themselves rely on ADR-004's soft-delete convention elsewhere
in the schema for their referential integrity: an activity row's
`subjectId` can point at an issue, project, or comment that has since been
archived, and because archived rows are never physically deleted, the
activity feed can always resolve that reference to a real row rather than a
dangling one — this ADR's own correctness leans directly on that earlier
decision.

## Consequences

**What this buys the team.** REQ-220's "every domain event recorded" is
close to true by construction for the nine event types currently subscribed
— adding audit coverage for a tenth is a `subscribe()` call, not a change to
every service that might produce that kind of event. REQ-228's failure-
isolation requirement came essentially free, inherited from ADR-005's
handler isolation rather than requiring bespoke defensive code in
`activity-service.ts` itself, which the team considers a strong validation
of the original event-bus design — a property established for an entirely
different reason (decoupling reactive features from each other) turned out
to be exactly the property an audit-log writer most needed. Immutability
(REQ-221) holds trivially, since nothing in `activity-service.ts` exposes an
update or delete path for an activity row at all — the repository layer
simply has no `updateActivity()` function to misuse.

**What it costs.** Coverage is opt-in and enumerated by hand: the nine
event types `registerActivityListeners()` subscribes to are a deliberate
subset of `TaskflowEventMap`'s full twenty-one keys, not "everything," and
a new domain event added to the event map does not automatically gain audit
coverage — someone has to remember to add the corresponding `subscribe()`
call in this module. This is the same category of gap ADR-013's Consequences
section flags for `auth-service.ts`: login and logout currently have no
corresponding events in `TaskflowEventMap` at all, so they are invisible to
this audit trail regardless of `activity-service.ts`'s own subscription
list — a compounding gap across two ADRs that the platform team has not yet
scheduled to close. The audit trail's completeness is therefore a property
of "did every relevant `subscribe()` call get added," checked by code
review and by manually cross-referencing `TaskflowEventMap`'s full key list
against `registerActivityListeners()`'s subscriptions, not by any automated
exhaustiveness check the compiler can offer, since a subscription list
omission is not the kind of thing a `switch` over the event map would catch
— `subscribe()` accepts any key of `TaskflowEventMap`, so under-subscribing
is always syntactically valid. Retention (REQ-227) also depends on ADR-010's
plan-tier `retentionDays`, and REQ-231's scheduled cleanup job removes
activity beyond that window — meaning activity data is not kept forever by
default, a property that has to be understood alongside "immutable" (rows
are never edited) rather than confused with "permanent" (rows are eventually
pruned).

## Alternatives considered

**Direct calls to `ActivityService.record()` from inside each service
method**, rather than via the event bus. Rejected because it reintroduces
exactly the coupling ADR-005 exists to avoid — every service that should
produce an audit record would need to import and call the activity service
directly, and REQ-228's failure-isolation requirement would need to be
hand-implemented (a try/catch around the record call) at every one of those
call sites rather than inherited once from the bus's own design.

**A database trigger writing an activity row on insert/update to the
underlying tables.** Considered briefly given SQLite's trigger support, and
rejected because it would duplicate the event catalogue's semantic
information (a trigger sees a row change, not the meaningfully distinct
domain concepts of "issue created" versus "issue status changed" that make
the `TaskflowEventMap` catalogue useful) and because it would bypass the
application layer entirely, making the audit trail's content dependent on
raw SQL row changes rather than on the same typed event payloads every
other subscriber already relies on.

**A separate, dedicated event stream for audit purposes**, distinct from the
general-purpose domain event bus. Rejected as unnecessary duplication: the
existing bus already carries exactly the events an audit trail needs, with
the same envelope fields (`orgId`, `actorId`, `occurredAt`) an activity row
requires, and standing up a second, parallel event mechanism solely for
audit logging would mean every event-emitting service potentially needing to
publish to two places instead of one.

## References

- REQ-220 (every domain event recorded as an activity row), REQ-221
  (activity rows immutable), REQ-222 (activity records actor, subject,
  action), REQ-224 (reading requires member), REQ-225 (exporting requires
  admin), REQ-227 (retention follows plan's retention window), REQ-228
  (activity capture must not fail the originating write), REQ-230 (CSV
  export escapes quotes and separators), REQ-231 (cleanup removes activity
  beyond retention window)
- ADR-004 (soft delete — activity's `subjectId` references stay resolvable
  because archived rows are never physically removed), ADR-005 (the event
  bus this ADR's failure-isolation guarantee is inherited from), ADR-010
  (plan-tier `retentionDays` governing REQ-227), ADR-012 (`csv_export` flag
  gating CSV export alongside the role check), ADR-013 (the same
  auth-events gap noted in that ADR's Consequences recurs here for audit
  coverage)
- Code: `src/server/services/activity-service.ts` (`record`, `listActivity`,
  `groupByDay`, `exportActivity`, `registerActivityListeners`,
  `EXPORT_COLUMNS`), `src/lib/csv.ts` (`toCsv`), `src/server/repositories/activity-repository.ts`
