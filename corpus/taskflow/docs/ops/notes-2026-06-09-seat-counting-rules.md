---
title: Notes — seat counting rules
id: OPS-NOTES-2026-06-09
status: approved
owners: [r.saito]
last_updated: 2026-06-09
related: [REQ-032, REQ-133, DES-146]
---

**Date:** 2026-06-09
**Attendees:** r.saito (chair), m.lindqvist, a.whitfield, d.okafor

## Agenda

1. Resolve customer confusion about why a seat-quota check failed when the org's active
   member count was, by their own count, still under the limit.
2. Revisit whether pending invitations should count as provisional seats, and confirm
   the current behavior is the right one going forward.
3. Decide whether this needs a requirements change or just clearer product messaging.

## Discussion

Rin opened with the actual support ticket: an `owner@`-role customer on `starter` (seat
limit 10) had 8 active members and tried to send 3 more invitations in one batch,
expecting success since 8 + 3 = 11 exceeds 10 only slightly and they assumed the check
was against *active* members alone. The invite batch was rejected outright. Rin
explained this is because `invite-member`'s quota check, per `DES-146`, counts pending
invitations as provisional seats for the whole batch at once — the customer already had,
it turned out, 2 outstanding pending invitations from weeks earlier that they had
forgotten about, so the real count going into the check was 8 active + 2 pending + 3 new
= 13, well over 10.

Mira asked whether counting pending invitations as seats is actually the right model, or
whether it was an overcautious choice made early on that deserves revisiting now that
there is a real complaint about it. The group discussed both directions. Ada argued
strongly for keeping it: if pending invitations did **not** count against the seat quota,
an org could issue far more invitations than seats available, and a wave of simultaneous
acceptances could spike the org well over its paid seat count before any individual
acceptance-time check could catch up — `REQ-030` says accepting an invitation creates a
member and emits `member.joined`, but there is no atomic "check quota across all
in-flight acceptances at once" mechanism, so treating pending invitations as
already-provisionally-consumed seats at *invite* time is what actually prevents
overshoot, not a check at accept time alone.

Deji raised a related implementation detail worth recording: `accept-invitation`
(`DES-244`) runs with no `Actor` at all — the person accepting is not yet a member of
the org, so there is no actor to authorize against — and the seat quota is re-checked
*only after* the membership write completes, not before. This means the provisional-seat
counting at invite time is the *real* enforcement mechanism; the post-write check at
accept time is closer to a consistency backstop than a hard gate, since by the time it
runs, the membership row already exists. The group confirmed this is intentional and
consistent with treating invite-time counting as authoritative, but agreed this
distinction — invite time enforces, accept time reconciles — was not written down
anywhere before this meeting and should be, since a reader of `accept-invitation`'s code
alone might reasonably assume the accept-time check is what prevents overshoot.

Ada shifted the discussion to product messaging: the real problem in the support case
was not the counting rule itself, which the group reaffirmed as correct, but that the
error message the customer saw did not distinguish "you have 8 active members" from "you
have 8 active plus 2 pending, totaling 10 already committed." The group agreed the fix
here is entirely in the error message and the invitations settings UI — showing pending
invitations as consuming seats visibly, not just active members — rather than any change
to the underlying counting rule.

## Decisions

1. Reaffirmed: pending invitations count as provisional seats at invite time, and this
   is the real enforcement mechanism, not the post-acceptance check (relates `REQ-032`,
   `REQ-133`, `DES-146`). This revises the informal assumption some newer team members
   held — that active member count alone governs the seat check — by making the
   documented rule explicit and giving the reasoning a written record for the first time.
2. `accept-invitation`'s post-write seat check is a consistency backstop, not the primary
   gate; this asymmetry is intentional and will be documented in the design doc.
3. No requirements change. The fix is UI/messaging: the invitations settings page must
   visibly show pending invitations as consuming seats, and the quota-exceeded error
   should break down active versus pending counts.

Deji raised one further wrinkle before closing: what happens to the provisional seat
count when a pending invitation itself expires (per the 14-day window discussed in
`notes-2026-06-26-invitation-expiry.md`, held later that summer but referenced here for
completeness since the two topics are closely linked)? He confirmed an expired
invitation should stop counting as a provisional seat the moment it expires, freeing up
room for a new invite — otherwise a customer could get permanently stuck below their
nominal seat count by accumulating expired-but-not-cleaned-up invitations indefinitely.
The group agreed this needed explicit verification against the actual seat-counting
query rather than assumption, and Rin took an action item to confirm the query filters
on invitation status correctly rather than counting every invitation row regardless of
whether it has expired.

## Follow-ups

- Ada to write the UI change for the invitations settings page showing pending
  invitations against the seat count explicitly.
- Rin to update the quota-exceeded error message to break down active vs. pending counts
  rather than a single aggregate number.
- Mira to add a code comment on `DES-146`'s implementation clarifying invite-time
  enforcement vs. accept-time reconciliation, since this meeting is the first time the
  distinction was stated explicitly.
