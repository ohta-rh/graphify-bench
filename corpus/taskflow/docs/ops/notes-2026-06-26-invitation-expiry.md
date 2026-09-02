---
title: Notes — invitation expiry
id: OPS-NOTES-2026-06-26
status: approved
owners: [m.lindqvist]
last_updated: 2026-06-26
related: [REQ-028, REQ-029, DES-148, DES-198]
---

**Date:** 2026-06-26
**Attendees:** m.lindqvist (chair), r.saito, h.iqbal, t.abara

## Agenda

1. Decide the actual expiry window for invitation tokens — it has never been formally
   set, only implied by whatever the initial implementation shipped with.
2. Review `resendInvitation`'s revoke-and-reissue behavior and confirm it is the right
   model.
3. Discuss `findInvitationByTokenHash`'s deliberately unscoped lookup and whether that is
   still safe.

## Discussion

Mira opened by noting an awkward gap: `REQ-029` states invitation tokens are single-use
and time-limited, but nobody in the room could immediately state the actual number of
days without checking the code, and there had never been a meeting that deliberately
chose it — it was set once, early, and never revisited. The group treated this meeting as
the first real decision point rather than a review of an established choice.

Rin argued for a relatively short window — 7 days — on the theory that a stale,
long-lived invitation link sitting in someone's inbox for weeks is a bigger security
surface than a legitimate friction of having to re-invite someone who missed the
original email. Tomas countered with a practical concern: onboarding flows, especially
for larger teams, sometimes involve an invited person being on leave or slow to respond,
and a 7-day window could mean a meaningful fraction of legitimate invitations expiring
before being accepted, generating "why didn't this work" support tickets. The group
landed on 14 days as a middle ground, with Hana noting this should be easy to test
precisely since the expiry check is a straightforward timestamp comparison, not anything
timezone-sensitive.

The group then reviewed `resendInvitation`'s behavior, which Mira described as
worth double-checking because it is easy to assume "resend" means "extend the existing
token's expiry," when the actual implementation revokes the original invitation
outright and issues a brand new one with a fresh token and a fresh 14-day clock
(`DES-148`). Rin confirmed this is correct and should stay this way — extending an
existing token's expiry rather than reissuing it would mean the *original* email link
(which may have already been forwarded, screenshotted, or otherwise exposed) stays
valid indefinitely across resends, which defeats the purpose of having an expiry at all.
A fresh token on resend means any previously-exposed link is dead the moment a resend
happens.

Mira flagged one detail in `resendInvitation` worth calling out explicitly in the design
docs: it silently downgrades an owner-role resend. If the original invitation was for
the `owner` role and someone resends it, the reissued invitation does not preserve
`owner` — it is downgraded to a lower role automatically. Tomas asked why this exists;
Mira explained the reasoning is that inviting a new owner is unusual enough, and
significant enough, that a routine "oh I'll just resend that" action should not silently
carry forward owner-level access without the inviter consciously re-confirming it. The
group agreed this behavior is correct and worth documenting prominently, since it is
exactly the kind of thing that looks like a bug to someone reading the code cold.

Finally, the group reviewed `findInvitationByTokenHash` — the one deliberately
unscoped repository read in the invitation flow, not filtered by `orgId` (`DES-198`).
Rin confirmed this is necessary and safe: the caller, someone clicking an emailed
invitation link, has no session and no known organization yet — the token itself is
what establishes which organization and invitation the accept flow is even about, so
scoping the lookup by org is structurally impossible at that point. The hash comparison
against the stored token hash is what stands in for authorization here, the same pattern
used for password reset tokens and session tokens.

## Decisions

1. Invitation token expiry is set to 14 days, replacing the previously unreviewed
   implicit value (relates `REQ-029`).
2. `resendInvitation`'s revoke-and-reissue model (fresh token, fresh clock) is confirmed
   correct and will not change (relates `DES-148`).
3. The owner-role downgrade on resend is confirmed correct and will be documented
   prominently rather than left as a surprising implementation detail.
4. `findInvitationByTokenHash`'s unscoped lookup is confirmed necessary and safe given
   the accept flow has no org context to scope by (relates `DES-198`).

Tomas raised one last edge case: what happens to a pending invitation if the inviting
admin is themselves removed from the org before the invitation is accepted? Mira
confirmed `REQ-033` (removing a member preserves their authored content) is about
content, not about invitations they issued, and that the invitation itself remains valid
independent of the inviter's continued membership — the accept flow checks the
invitation's own validity (token hash match, not expired, not already used) and the
target organization's state, not the inviter's current status. The group agreed this
was correct: revoking an invitation because its issuer left would be surprising and
would require additional bookkeeping (tracking issuer status alongside the invitation)
for a benefit nobody had actually asked for.

## Follow-ups

- Hana to add explicit test coverage asserting the 14-day expiry boundary precisely.
- Mira to add a prominent comment (not just a design doc mention) at the
  `resendInvitation` call site noting the owner-role downgrade behavior.
- Rin to confirm the 14-day window is reflected consistently in any customer-facing
  copy describing invitation links.
