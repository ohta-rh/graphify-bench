---
title: Notes — permission matrix review
id: OPS-NOTES-2025-11-10
status: approved
owners: [m.lindqvist]
last_updated: 2025-11-10
related: [REQ-020, REQ-021, REQ-027, ADR-003]
---

**Date:** 2025-11-10
**Attendees:** m.lindqvist (chair), d.okafor, a.whitfield, h.iqbal

## Agenda

1. Confirm the four-role rank order and where it lives in code before `ADR-003` goes to
   final review.
2. Walk the `ROLE_MATRIX` draft action-by-action and flag anything that looks wrong or
   under-specified.
3. Decide how platform-staff bypass should be represented — a fifth rank, or a separate
   flag on the actor.
4. Decide whether ownership escalation belongs in the matrix itself or as a separate
   pass.

## Discussion

Mira opened by walking through the draft of `src/lib/permissions.ts` as it stood going
into this review: `ROLE_RANK` giving `owner > admin > member > viewer` as a strict total
order, and a `can()` / `explain()` / `assertCan()` entry point that every call site is
expected to use instead of hand-checking a role string. Deji pushed back early on one
point: should `viewer` really default-deny everything except reads, or should there be a
narrower "commenter" role for stakeholders who need to leave feedback without full
member access? The group discussed this for a while — Ada made the product case that a
fifth role multiplies the support burden of explaining role differences to customers,
and that a viewer who needs to comment can simply be invited as a member. Deji agreed
this was the pragmatic call for a first release and dropped the proposal, but asked that
it be written down as a considered-and-rejected alternative rather than silently
disappearing, since he expects the question to resurface once there are real enterprise
customers with a "read-only reviewer" persona in mind.

The larger discussion was around ownership escalation — the idea that an author or
assignee should be able to edit their own issue or comment even if their role rank alone
would not grant it. Hana raised a concrete QA scenario: a `viewer` who is somehow the
author of a comment (for example, demoted after posting it) — should the escalation
still apply? The group agreed escalation should be evaluated strictly after the role
matrix, not as a replacement for it, and specifically only for the five actions the
draft already listed: `issue:update`, `issue:archive`, `comment:update`,
`comment:delete`, `notification:manage`. Mira was firm that this list should stay short
and enumerated rather than becoming a general "authors can always edit" rule, because a
general rule invites accidental escalation on actions nobody has thought through (org
deletion, billing changes) where ownership should never override rank.

On platform-staff bypass: Deji argued strongly against a fifth rank above `owner`,
because rank is meant to represent an organization-scoped hierarchy and platform staff
are explicitly *not* part of any customer's organization — folding them into the same
rank axis would make `ROLE_RANK` lie about what it represents. The group settled on a
boolean `actor.isPlatformStaff` checked as a distinct decision step before the role
matrix is even consulted, which is reflected in the decision order: cross-tenant guard,
then platform-staff bypass, then role matrix, then ownership escalation. Ada asked
whether platform staff bypass should be logged more visibly than an ordinary permission
grant, given the support-access implications; the group agreed the `granted_by_staff`
reason code satisfies this for now, and audit logging of staff actions was noted as a
follow-up rather than blocking this review.

Hana walked the group through the draft `ROLE_MATRIX` action by action and flagged two
inconsistencies against the draft requirements: `webhook:manage` had been drafted at
`member` minimum, which contradicted the requirements draft's intent that webhook
configuration (holding a secret capable of representing the organization to external
systems) should require `admin`. The group corrected this on the spot. Similarly,
`activity:export` was initially drafted at `member`, and Ada made the case it should be
`admin` given that exported activity data can include information about actions by
users the exporter cannot otherwise see individually — the group agreed.

## Decisions

1. `ROLE_RANK` stands as `owner > admin > member > viewer`, a strict total order with no
   fifth role for this release (relates `REQ-020`).
2. Ownership escalation applies to exactly five actions — `issue:update`,
   `issue:archive`, `comment:update`, `comment:delete`, `notification:manage` — and is
   evaluated after the role matrix, never in place of it (relates `REQ-021`, `REQ-026`).
3. Platform-staff bypass is a boolean `actor.isPlatformStaff`, checked before the role
   matrix, not a rank value (relates `REQ-027`).
4. `webhook:manage` minimum role is corrected to `admin` (relates `REQ-151`).
5. `activity:export` minimum role is corrected to `admin` (relates `REQ-225`).
6. `ADR-003` proceeds to acceptance with the decision order: cross-tenant guard →
   platform-staff bypass → role matrix → ownership escalation.

## Follow-ups

- Deji to write up the rejected "commenter role" proposal as an appendix to the
  requirements doc so it is not lost, tagged for revisit once enterprise sales has a
  concrete customer ask.
- Ada to track platform-staff audit logging as a separate, lower-priority item; not
  blocking for this release.
- Hana to add explicit test cases for the corrected `webhook:manage` and
  `activity:export` minimum roles before the permission model design doc is finalized.
