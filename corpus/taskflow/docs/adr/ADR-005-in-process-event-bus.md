---
title: An in-process typed event bus instead of a queue
id: ADR-005
status: accepted
owners: [platform-team, d.okafor]
last_updated: 2025-12-02
related: [REQ-053, REQ-065, REQ-111, ADR-016, ADR-018, ADR-022]
---

# ADR-005 — An in-process typed event bus instead of a queue

## Status

Accepted, with two later decisions narrowing and superseding parts of the
original sketch: ADR-016 gives the scheduled side of this design its own
per-kind cadence policy rather than the single implicit cadence this ADR
originally assumed, and ADR-018 replaces the inline-delivery approach this
ADR sketches for webhooks with an explicit queue and retry job. Both are
documented in Consequences below.

## Context

By early December 2025, four features needed to react to the same domain
actions without the service that performed the action knowing about all of
them: creating an issue needs to notify the assignee (REQ-113), update the
search index (REQ-172), append an audit-log row (REQ-220), and — eventually
— fan out to any configured webhook (REQ-160). Writing all four side effects
directly inside `createIssue()` would have coupled the issue service to
notification delivery, search indexing, activity logging, and webhook
dispatch, none of which are its concern, and would have meant every new
reactive feature touching every existing service that produces relevant
events.

The environment ruled out the obvious production answer. Taskflow builds and
runs fully offline, single-writer, with no external services — no message
broker, no Redis, no managed queue. Whatever "publish, then react" mechanism
the team chose had to live entirely inside the one Node process. The team
also wanted the event vocabulary itself to be a compile-time artifact:
Tomas Abara, who owns notifications and jobs, had been burned before by a
string-keyed event system where a typo in an event name silently created a
handler that never fired, discovered only by a customer noticing they never
got a notification.

## Decision

`src/lib/event-bus.ts` is an in-process, typed publish/subscribe bus.
`TaskflowEventMap` in `src/types/event.ts` is the closed catalogue — 21 event
keys as of this writing (`project.created`, `issue.status_changed`,
`comment.created`, `member.role_changed`, `billing.plan_changed`,
`webhook.delivery_requested`, and so on) — and it is the *only* way to
introduce a new event: `emit()` and `subscribe()` are both generic over
`keyof TaskflowEventMap`, so an event key that is not in the map is a
compile error, not a silent no-op. Every payload extends `EventEnvelope`
(`orgId`, `actorId`, `occurredAt`), stamped consistently regardless of which
service emits it.

`subscribe(type, handler)` registers a handler and returns an `Unsubscribe`
function; `subscribeOnce()` is the self-detaching variant. `emit()` awaits
every registered handler via `Promise.allSettled` and reports rejected
handlers to registered error sinks (`onHandlerError()`) rather than
rethrowing — the module's own documentation states the design intent
explicitly: "one throwing handler never fails the emit or the sibling
handlers." `emitAndForget()` exists for call sites that must not await
delivery. Handlers are registered once, at module init, by
`src/server/services/event-registry.ts`, which is the map from "a domain
event happened" to "these services care": `ActivityService`'s
`registerActivityListeners()` (ADR-022), the notification fan-out service,
the search indexer's `search.reindex_requested` handler (ADR-017), and the
webhook dispatcher's `webhook.delivery_requested` handler (ADR-018) are all
registered there, not wired into the emitting service directly.

## Consequences

**What this buys the team.** `IssueService.createIssue()` (and its
counterparts across projects, comments, members, and billing) emits an event
and returns; it has zero knowledge of notifications, search, activity, or
webhooks. Adding a new reactive concern — the search indexer was added in
January 2026, three months after the bus itself — was purely additive: one
new `subscribe()` call in `event-registry.ts`, no change to any emitting
service. The type-level closure of `TaskflowEventMap` has caught real
mistakes at compile time rather than in production: Kaya Ferreira's search
indexing work initially subscribed to a `"comment.updated"` event that does
not exist (comments are only ever `created` or soft-deleted, never
event-tracked as "updated"), and the compiler rejected it before the branch
was even opened for review. Handler isolation via `Promise.allSettled` means
a bug in, say, the webhook dispatcher's handler cannot take down issue
creation — this was tested deliberately in
`tests/lib/event-bus.test.ts`-adjacent coverage and has held in
practice: a webhook-handler exception in March 2026 (a null endpoint
dereference, since fixed) never once blocked an issue from being created.

**What it costs, and what it revised.** The bus is in-process and
synchronous-in-effect: `emit()` awaits all handlers before returning, which
means an emitting service's request latency includes every subscriber's
work, however slow. This was fine for activity logging (a single insert) and
search indexing (a single upsert), but it was the wrong shape for two
features that were originally sketched as "just another event handler" on
this same bus, in the design notes preceding this ADR:

- **Scheduled digest and sweep work** (digest emails, the overdue-issue
  sweep, usage rollups) was originally imagined as events with implicit
  timers. ADR-016 replaces that sketch with an explicit interval scheduler
  and a fixed `CADENCE_MINUTES` table per job kind — the event bus still
  carries `digest.due` (REQ-123) as the signal that rendering should start,
  but *when* that signal fires is owned by the scheduler in
  `src/server/jobs/scheduler.ts`, not by a handler timer living inside a bus
  subscriber. ADR-016's own Context section documents this narrowing
  explicitly.
- **Webhook delivery** was originally sketched as a bus handler that would
  attempt the HTTP call inline, inside `emit()`'s awaited handler set — which
  would have meant a slow or unreachable external endpoint stalling the
  request that triggered the originating domain event (an issue status
  change, for instance) until the delivery attempt timed out. ADR-018
  supersedes that approach: `webhook.delivery_requested` handlers now only
  *enqueue* a delivery row via `webhookRepo.enqueueDelivery()`; the actual
  attempt, retry, and backoff happen later, in the dedicated
  `runWebhookDeliveryJob` drained by the same interval scheduler ADR-016
  introduced. The bus is still how the webhook service learns an event
  happened; it is no longer where the delivery attempt happens.

The bus also has no persistence and no replay: `resetEventBus()` exists for
tests, and a process restart between `emit()` and a handler completing loses
that in-flight delivery, with no durable queue behind it to recover from
that loss. This is an accepted risk given the offline, single-process,
modest-scale target this corpus's constraints describe, not a decision the
team considers safe to carry into a genuinely distributed deployment.

## Alternatives considered

**A managed message queue or broker** (the obvious production-grade answer).
Ruled out immediately by the offline, no-external-services constraint that
governs the whole corpus — there is nothing to point a broker client at.

**Direct method calls between services** (issue service calls notification
service, activity service, and search service directly). Rejected as the
tight coupling this ADR exists to avoid: every new reactive feature would
require editing every emitting service, and the dependency graph between
services would stop being a simple layered one.

**A durable, file- or SQLite-backed outbox table**, polled by a background
loop, giving at-least-once delivery across process restarts. Seriously
considered for the webhook case specifically and effectively adopted in
spirit by ADR-018's delivery-row-plus-scheduler design — the difference is
that ADR-018 treats this as a property of webhook delivery specifically,
backed by the real `webhook_deliveries` table and `MAX_ATTEMPTS` retry
ceiling, rather than generalizing it to every event on the bus, which the
team judged unnecessary overhead for events like `comment.created` that have
no retry semantics of their own.

## References

- REQ-053 (project creation emits `project.created`), REQ-065 (issue creation
  emits `issue.created`), REQ-111 (notification fan-out is driven by domain
  events), REQ-123 (digest sends emit `digest.due` before rendering), REQ-160
  (webhook payloads carry the event type and envelope)
- ADR-016 (narrows the cadence policy sketched here into an explicit
  scheduler with per-kind `CADENCE_MINUTES`)
- ADR-018 (supersedes the inline webhook-delivery approach sketched here with
  a queued, retried delivery job)
- ADR-022 (the activity service is the bus's most complete subscriber,
  deriving the entire audit trail from it)
- Code: `src/lib/event-bus.ts` (`emit`, `subscribe`, `subscribeOnce`,
  `emitAndForget`, `onHandlerError`, `subscriberCount`, `resetEventBus`),
  `src/types/event.ts` (`TaskflowEventMap`, `EventEnvelope`),
  `src/server/services/event-registry.ts`
