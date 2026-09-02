---
title: Notes — quarterly architecture review
id: OPS-NOTES-2026-08-24
status: approved
owners: [d.okafor]
last_updated: 2026-08-24
related: [DES-001, DES-016, ADR-016, ADR-018]
---

**Date:** 2026-08-24
**Attendees:** d.okafor (chair), m.lindqvist, r.saito, t.abara, k.ferreira, j.novak,
a.whitfield, h.iqbal

## Agenda

1. Standing review: is the single-process, single-artifact architecture (`DES-001`)
   still the right call given the last two quarters of incidents and growth?
2. Review the four postmortems from the last two quarters as a set — is there a common
   thread the individual postmortems missed?
3. Set priorities for the next quarter.

## Discussion

Deji opened by restating the purpose of this recurring review, distinct from any single
incident retro: to periodically ask whether the accumulated weight of small decisions
still adds up to a coherent architecture, or whether it has quietly drifted. He walked
the room through `DES-001` and `DES-004` — one Next.js process, one file-backed SQLite
database — and asked directly whether anything from the last two quarters argues for
changing that.

Jan gave the operational read first: no incident in the last two quarters — the
cross-tenant leak, the digest storm, the webhook backlog, or the board crash — was
actually caused by the single-process architecture itself. The cross-tenant leak was a
scoping discipline failure; the digest storm was a job-idempotence gap; the webhook
backlog was a throughput-sizing gap; the board crash was a build-tooling gap around
`"use client"`. None of the four would have been prevented by splitting into multiple
services, and at least two (digest storm, webhook backlog) plausibly become *harder* to
reason about with an added network hop between event producer and consumer. The room
generally agreed the single-process architecture remains the right call, with Kaya
adding the caveat that the webhook backlog postmortem's still-open fairness action item
is worth watching — if webhook volume keeps growing, the single shared claim queue
(`DES-215`) could eventually become a real argument for some kind of partitioning, even
within the single-process model, well before it becomes an argument for splitting
processes.

Mira raised the common thread question directly, and the group spent real time on it: is
there a pattern across all four incidents beyond "different code, different root
cause"? Tomas offered one: three of the four (digest storm, webhook backlog, board
crash) all involve a gap between what the build/typecheck toolchain can verify and what
only shows up at runtime under real load or a real render — a missing directive, a
throughput assumption, a scheduler-restart interaction. Only the cross-tenant leak was a
pure logic/discipline failure rather than a toolchain-blind-spot failure. Hana agreed
this framing was useful and proposed it as an actual review criterion going forward:
for any new design decision, explicitly ask "would a build or type failure catch a
regression here, or does this rely entirely on someone remembering a convention?" —
and if the answer is the latter, treat that as a flag worth raising during design review,
not just accepting silently the way `command_palette`'s directive and the issue detail
page's layering exception both were accepted silently for a long time before eventually
surfacing as problems.

Ada shifted the discussion to the coming quarter's priorities, given everything the
group had reviewed: she proposed the webhook fairness mechanism (open since
`postmortem-2026-04-17-webhook-backlog.md`) and the response-shape change for narrowed
search syntax (open since `notes-2026-05-05-search-syntax-gating.md`) as the two most
customer-visible open threads, both still sitting as "in review" or "proposed" rather
than shipped. Deji agreed both should be prioritized, and separately flagged the
`auth-service.ts` event-map gap identified in the layering exception review
(`notes-2026-07-30-layering-exception-amnesty.md`) as worth a dedicated design session
next quarter rather than continuing to sit as an acknowledged-but-unaddressed gap.

The group closed by agreeing this quarterly cadence itself is working — four incidents
and roughly a dozen smaller decisions over two quarters is a manageable amount to review
in one sitting, and the practice of explicitly revisiting earlier ADRs and design docs
(as this and several recent meetings have done for `ADR-005`, `DES-008`, `DES-159`) is
preferred over letting design docs go stale silently.

## Decisions

1. The single-process, single-artifact architecture (`DES-001`, `DES-004`) is reaffirmed
   for another quarter; no incident from the review period argues for a structural
   change.
2. Adopt a standing design-review question: does a build/typecheck failure catch a
   regression here, or does correctness depend entirely on a remembered convention? Flag
   the latter explicitly during design review rather than accepting it silently.
3. Next quarter's top priorities: the webhook delivery fairness mechanism and the
   search-syntax-narrowing response-shape change, both already open action items being
   escalated in visibility, plus a dedicated design session on the `auth-service.ts`
   event-map gap.
4. The quarterly architecture review cadence itself is confirmed as working and will
   continue.

## Follow-ups

- Kaya to bring a concrete proposal for webhook delivery fairness to the next relevant
  design discussion, not wait for the next quarterly review.
- Hana to draft the "would a build failure catch this" question into the standard design
  review template.
- Jan to keep watching webhook queue depth trends and bring data to the next quarterly
  review on whether partitioning the claim queue is becoming necessary.
- Deji to schedule the dedicated `auth-service.ts` event-map design session before the
  next quarterly review.
