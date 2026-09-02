---
title: Notes — webhook secret rotation
id: OPS-NOTES-2026-07-13
status: approved
owners: [k.ferreira]
last_updated: 2026-07-13
related: [REQ-153, DES-159, DES-160, ADR-005, ADR-018]
---

**Date:** 2026-07-13
**Attendees:** k.ferreira (chair), j.novak, d.okafor, a.whitfield

## Agenda

1. Respond to a customer request for the ability to rotate a webhook endpoint's signing
   secret without deleting and recreating the endpoint.
2. Revisit the delivery architecture decision behind webhooks generally, since it came
   up naturally while discussing this request.
3. Decide whether to build rotation now or explicitly defer it.

## Discussion

Kaya opened with the request itself: a customer's security team flagged that
`DES-159` states endpoint secrets are minted once, at creation, and never regenerated —
their internal policy requires periodic credential rotation for any system holding a
shared secret, and Taskflow currently offers no way to rotate a webhook secret short of
deleting the endpoint and recreating it, which loses delivery history for that endpoint
(`DES-214`, endpoint deletion cascades its own delivery history in the same call).

Deji framed the two possible designs: (a) an in-place rotation that replaces the secret
on the existing endpoint row, or (b) a "grace period" rotation where both the old and new
secret are valid for a window, so the customer's receiver can be updated to verify the
new secret before the old one stops working. He noted (b) is meaningfully more complex —
it requires the endpoint to hold two secrets simultaneously and `signPayload`'s
comparison logic to accept either during the window, which does not exist today and
would touch `DES-160`'s "pure HMAC wrapper" characterization, since the wrapper would
need to know about rotation state rather than staying a stateless function of secret and
payload.

Jan raised the operational angle: how often would this actually be used? He argued that
without evidence of real rotation demand beyond this one customer's compliance
checkbox, building the more complex grace-period design specifically is premature. The
group discussed the in-place-only design (a) as a smaller, still-useful step, but Kaya
pointed out that in-place rotation without a grace period means the customer's receiver
*will* reject deliveries during the window between rotating the secret in Taskflow and
updating their own verification code — which is arguably worse than the current
workaround of deleting and recreating the endpoint at a planned time, since at least
that failure mode is obvious and instantaneous rather than a period of silently-failing
signature checks.

Given that neither design was clearly better than "tell the customer to schedule a
delete-and-recreate during a maintenance window," the group decided to explicitly defer
building rotation for now, but wanted this decision recorded as a considered rejection,
not a silent gap — this note **revises** the assumption implicit in `DES-159`'s current
framing ("minted once and never regenerated") from being simply a fact about the system
to being an explicit, reasoned product decision that the team is not currently planning
to change, pending real demand signal beyond one request.

This discussion pulled the group into revisiting the delivery architecture decision
more broadly, since Ada asked how webhook delivery got to its current queued design in
the first place. Kaya recapped: the original thinking in
`notes-2025-11-20-event-bus-vs-queue.md` had assumed inline, synchronous delivery from
the event handler with a bounded timeout would be simple and sufficient. A prototype
of that approach surfaced the concern that a slow or hanging receiver would stall the
request path that triggered the event — not a hypothetical, but something the prototype
demonstrated directly — and `ADR-018` was written specifically to reverse that earlier
assumption in favor of queued delivery with capped exponential backoff, which is what
ships today (`DES-064`). The group noted this history is worth keeping visible precisely
because it is easy, reading only `ADR-005`, to assume inline delivery was the shipped
design; `ADR-018`'s Context section documents the reversal, but this meeting's discussion
is the first time the *reason* — the prototype's demonstrated stalling behavior, not just
an abstract worry — was captured in the ops decision log rather than only in the ADR
itself.

## Decisions

1. Webhook secret rotation (in-place or grace-period) is explicitly deferred, not
   built, pending stronger demand signal beyond a single customer request. `DES-159`'s
   "minted once, never regenerated" behavior is reaffirmed as a deliberate product
   decision, not an oversight — this revises the framing from implicit fact to explicit,
   documented choice (relates `REQ-153`, `DES-159`).
2. If rotation is built in the future, the grace-period design (b) is preferred over
   in-place-only rotation (a), because in-place-only introduces a silent failure window
   that is arguably worse than the current delete-and-recreate workaround.
3. The reasoning behind `ADR-018`'s reversal of the original inline-delivery assumption
   from `ADR-005` is recorded here in narrative form, supplementing the ADR's own
   Context section with the specific prototype-driven trigger for the reversal.

## Follow-ups

- Kaya to respond to the requesting customer with the delete-and-recreate workaround and
  an honest "not currently planned" status, rather than an open-ended "we'll consider
  it."
- Ada to log rotation as a backlog item to revisit if additional customers request it
  independently, to build the demand signal the group agreed was currently missing.
- Deji to sketch the grace-period design at a conceptual level (not implement it) so it
  is ready to reference quickly if demand does materialize.
