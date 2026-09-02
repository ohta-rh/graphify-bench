---
title: Notes — event bus vs external queue
id: OPS-NOTES-2025-11-20
status: approved
owners: [d.okafor]
last_updated: 2025-11-20
related: [ADR-005, REQ-111, DES-024]
---

**Date:** 2025-11-20
**Attendees:** d.okafor (chair), m.lindqvist, t.abara, k.ferreira, j.novak

## Agenda

1. Decide the fan-out mechanism for domain events ahead of drafting `ADR-005`.
2. Weigh an external broker (Redis Streams was the concrete option on the table) against
   an in-process bus.
3. Discuss whether webhook delivery should be synchronous (inline, from inside the event
   handler) or asynchronous, and record the reasoning either way.

## Discussion

Deji framed the decision up front: Taskflow ships as a single process with a
file-backed SQLite database (already effectively decided by `ADR-002`), and the
question is whether the event fan-out mechanism should match that "one process, one
artifact" shape or introduce an external dependency. Jan, representing the operational
side, was blunt that adding Redis or any broker to the deployment story multiplies the
things that can go down independently of the app itself, and that for a corpus meant to
run standalone and offline, an external broker is close to a non-starter regardless of
its other merits.

Kaya raised the strongest argument for a broker anyway: durability. An in-process event
bus loses every unconsumed event the instant the process crashes between the event
firing and a handler completing — there is no persistence layer for the event itself,
only for whatever side effect a handler managed to commit before the crash. Tomas
agreed this was a real gap but pointed out that most of Taskflow's event consumers
(notification fan-out, search indexing, activity logging) are already designed to
re-derive their state from source tables rather than trusting the event payload blindly
— several service-layer functions discussed in earlier design work already planned to
re-read the row rather than trust the event, specifically because at-most-once delivery
was assumed from the start. Given that assumption was already baked into the consumer
designs, an in-process bus's actual guarantee (at-most-once, no durability across a
crash) was judged an acceptable fit rather than a late-discovered gap.

Mira asked the practical question: what does an in-process bus's API need to support? The
group sketched `emit()`/`subscribe()` with a typed event map, agreeing that types should
be enforced at the call site — a `subscribe("issue.created", handler)` call should not
typecheck if `handler` doesn't match the payload shape for that event. Deji proposed
`Promise.allSettled` semantics for dispatching to multiple subscribers of the same event
so that one handler throwing does not prevent sibling handlers on the same event from
running — the group agreed unanimously this was non-negotiable; a single broken listener
should never be able to take down notification delivery just because it happens to be
registered ahead of the notification handler in import order.

On the webhook-delivery-mode question, the group's initial instinct — deliberately
recorded here even though it did not survive later scrutiny — was that inline delivery
(calling the receiver's endpoint synchronously from inside the same handler that reacts
to the domain event) was simpler to reason about and avoided introducing a second async
hop. Kaya flagged a concern that a slow or hanging third-party endpoint would then stall
whatever request triggered the event, but the group's working assumption at this meeting
was that a short timeout on the outbound call would bound the damage acceptably. This
assumption is recorded here specifically because it did not hold up: `ADR-018`,
accepted several months later, revisits and reverses this call — see
`notes-2026-07-13-webhook-secret-rotation.md` for where that reversal is discussed
retrospectively, and `ADR-018`'s own Context section for the full reasoning.

## Decisions

1. Domain event fan-out uses an in-process, typed event bus — `emit()`/`subscribe()` —
   not an external broker (relates `ADR-005`, `REQ-111`).
2. Handler dispatch uses `Promise.allSettled` semantics so one subscriber's failure
   cannot block or crash delivery to other subscribers of the same event.
3. At-most-once, no-durability-across-crash delivery is an accepted trade-off given that
   consumers are expected to re-derive state from source tables rather than trust event
   payloads as the sole source of truth.
4. (Provisional, later revised) Webhook delivery will be attempted inline from the event
   handler with a bounded timeout, rather than queued — see the note in Discussion above
   about this decision's later reversal.

Mira closed the meeting by asking a forward-looking question worth recording even
though nobody could answer it definitively that day: if a future event handler needs to
guarantee its side effect happens even across a process crash mid-dispatch, what is the
supported pattern? Deji's answer was that no such pattern exists yet under this design,
and that any consumer with that requirement would need to build its own durability —
writing a row marking "work to do" before relying on the event, and reconciling missed
events via a periodic sweep, rather than treating the event bus itself as durable. Tomas
noted this is effectively the same shape the job queue already uses for the jobs that
matter most (`webhook-delivery`'s claim-based model tolerates a crash mid-delivery by
design), and the group agreed that pattern — event triggers a queued job, the job's own
state is the durable record, not the event — should be the standard answer whenever this
question comes up again in a future design review, rather than re-deriving it from
scratch each time.

## Follow-ups

- Deji to draft `ADR-005` capturing all of the above, including the provisional inline
  webhook decision, for review before end of month.
- Kaya to prototype the inline webhook delivery path and report back on real timeout
  behavior before the ADR is finalized — this prototype is what eventually surfaced the
  concern that led to reversing the decision.
- Tomas to confirm which planned event consumers genuinely re-read source rows versus
  which ones assume the payload is sufficient, so the durability trade-off is judged
  against reality rather than assumption.
