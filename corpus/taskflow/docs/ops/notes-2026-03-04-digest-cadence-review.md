---
title: Notes — digest cadence review
id: OPS-NOTES-2026-03-04
status: approved
owners: [t.abara]
last_updated: 2026-03-04
related: [ADR-005, ADR-016, REQ-119, REQ-121, DES-129]
---

**Date:** 2026-03-04
**Attendees:** t.abara (chair), j.novak, m.lindqvist, d.okafor

## Agenda

1. Post-incident review of the digest storm from two days ago
   (`postmortem-2026-03-02-digest-storm.md`).
2. Decide whether `ADR-005`'s original cadence framing needs revision.
3. Draft the cadence policy that will become `ADR-016`.

## Discussion

Tomas opened by walking the group through the incident timeline once more, focusing on
the two-factor root cause: the scheduler's in-memory `lastRunAt` resetting on restart,
and `markRead` failures not undoing an already-sent digest. He posed the central
question directly: does fixing this mean making scheduler state durable, or does it mean
something else?

Jan argued strongly against durable scheduler state as the fix, walking through the
counterfactual: even with a persisted `lastRunAt`, the storm's actual repeat-send
mechanism — unread notifications re-qualifying for inclusion on every subsequent
eligible window because `markRead` never completed — would have fired regardless of
whether the restart happened. He was blunt that "we got unlucky with timing on a
restart, but the bug was already there and would have surfaced eventually from ordinary
lock contention alone." Deji agreed and raised a related point: even setting aside this
specific bug, treating the scheduler's cadence table as a *correctness* guarantee rather
than a *dispatch throttle* was itself a category error baked into how `ADR-005`
described the job system originally. `ADR-005` said jobs would run "hourly by default,"
which reads as a promise about frequency, but says nothing about what a job is
responsible for guaranteeing about its own idempotence between runs.

Mira pushed the group to be precise about what the new policy should actually say, since
"be more idempotent" is not an actionable engineering statement on its own. The group
worked through a concrete rule: every job kind's cadence entry in `CADENCE_MINUTES`
governs when the job is *eligible* to be dispatched, and is explicitly not a guarantee
against the job running more than once within that window — restarts, manual triggers
(see `runbook-scheduler-and-queue.md`'s procedures), and legitimate overlapping windows
can all cause more-frequent-than-cadence execution, and every job body must be written
assuming that can happen. For `digest-email` specifically, the group agreed the
send-then-markRead sequence needed to move from "best effort, log and move on" to
"retry the markRead on the very next eligible tick if it failed," narrowing but not
eliminating the duplicate-send window.

This is the meeting where the group explicitly revised the framing `ADR-005` had set:
`ADR-005`'s cadence language is being narrowed by what becomes `ADR-016`, and everyone
in the room agreed this should be recorded plainly in `ADR-016`'s Context section as a
correction, not just a new idea layered on top without acknowledging the earlier
document said something looser. Tomas volunteered to draft `ADR-016` with this framing
and circulate it the next day.

## Decisions

1. Scheduler cadence (`CADENCE_MINUTES`) is reframed as a *dispatch throttle*, not a
   correctness guarantee — this narrows the framing `ADR-005` originally used and will
   be recorded as such in `ADR-016`.
2. Durable scheduler state (persisting `lastRunAt`) is explicitly rejected as the fix for
   this incident class; job bodies must be idempotent under more-frequent-than-cadence
   execution instead.
3. `digest-email-job`'s `markRead` failure path will retry on the next eligible tick
   rather than only logging and waiting for the notification to fall out of its natural
   window.
4. `ADR-016` will be drafted to formally supersede this portion of `ADR-005`'s framing.

One more thread came up near the end that Tomas wanted on the record even though it did
not change the outcome: should the digest job move to a per-recipient lock, so two
overlapping runs literally cannot process the same recipient concurrently, rather than
relying on `markRead` idempotence alone? Deji was skeptical — introducing locking into a
job system that has deliberately stayed lock-free (`queue.ts` has no concept of a
mutex, only sequential draining within one process) would be a meaningfully bigger
change than the retry-on-next-tick fix the group already agreed on, and he was not
convinced the digest storm's actual failure mode required it: the overlapping runs in
this incident were sequential ticks, not truly concurrent execution within the same
process, since `drain()` processes jobs one at a time in a single event loop. Jan
confirmed this matches his understanding of the queue's execution model — there is no
parallelism to race against within one process, only the *appearance* of overlap across
separate ticks. The group closed this thread by agreeing locking is unnecessary given
that understanding, and that the retry-on-next-tick fix directly addresses the actual
mechanism at fault.

## Follow-ups

- Tomas to draft `ADR-016` and circulate for review before end of week.
- Jan to add the queue-depth and duplicate-send alerting items from the postmortem's
  action list in parallel with the ADR draft, since they do not depend on the ADR being
  finalized first.
- Mira to review every other job kind's body against the "must tolerate
  more-frequent-than-cadence execution" rule once `ADR-016` lands, not just
  `digest-email`.
