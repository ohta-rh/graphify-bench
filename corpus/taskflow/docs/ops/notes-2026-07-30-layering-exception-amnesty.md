---
title: Notes — layering exception amnesty
id: OPS-NOTES-2026-07-30
status: approved
owners: [d.okafor]
last_updated: 2026-07-30
related: [DES-008, DES-016, DES-017, DES-026, ADR-013]
---

**Date:** 2026-07-30
**Attendees:** d.okafor (chair), m.lindqvist, j.novak, h.iqbal

## Agenda

1. Review the five deliberate layering exceptions catalogued in `DES-008`/`DES-017` and
   decide whether each is still deliberate, or has become an accepted-by-neglect
   pattern.
2. Decide whether to formally ratify the exception list as permanent, or set a
   deadline to eliminate each one.
3. Discuss whether new exceptions should be allowed to join the list going forward, and
   under what process.

## Discussion

Deji opened by reading the current list: `src/actions/profile/update-profile.ts`, the
profile page, the members invitations settings page, the notifications settings page,
and the issue detail page all call repositories directly, bypassing the service layer
that `ADR-013` establishes as owning authorization (`DES-012`, `DES-013`). Separately,
`auth-service.ts` is documented as needing to call `emit` but structurally cannot,
because `TaskflowEventMap` has no auth event keys. He framed the core question bluntly:
`DES-016` says import direction is "enforced by convention and review, not tooling" —
does that mean these five exceptions are a controlled, permanent decision, or are they
five instances of the convention already having failed once each, with nothing stopping
a sixth?

Mira walked through each of the five individually. `update-profile.ts` and the profile
page: both exist because profile data (name, avatar, timezone) genuinely has no
meaningful authorization surface beyond "is this the user themself" — there is no role
check, no ownership escalation, nothing a service layer would meaningfully add beyond
what a direct repository call already provides via the session's own identity. She argued
this exception is legitimately permanent, not a shortcut waiting to be cleaned up. The
members invitations page and the notifications settings page were murkier — both read
data for display purposes where the corresponding write paths do go through proper
services, and the direct-repository reads exist because the original implementers judged
a full service round-trip unnecessary for a read-only list rendering. Jan pushed back
mildly here, noting that "read-only so it's fine" is exactly the kind of reasoning that
stops being true the moment someone adds a filter or side effect to that code path later
without noticing it never went through authorization in the first place.

The issue detail page's direct repository call generated the most discussion. Deji noted
this one is different in kind from the others — it renders composed data from three
repositories (issue, comments, attachments implicitly) for a single page, and the
service-layer equivalent (`getIssue` in `issue-service.ts`, `DES-106`) already exists and
is used elsewhere. Why does this one page bypass it? Nobody in the room could give a
confident answer beyond "it predates a later service-layer addition and nobody
circled back." The group agreed this exception, unlike the profile one, looks like debt
rather than a deliberate permanent choice, and flagged it for actual remediation rather
than amnesty.

On `auth-service.ts`'s inability to emit events: the group agreed this is structurally
different from the other four — it is not a convention violation at all, but a real gap
in `TaskflowEventMap` (no login/logout/registration event keys exist). Extending the
event map to include auth events was discussed as the "real" fix, but Jan raised a
concern: auth events touch every session-related code path and adding them casually
risks scope creep into a redesign nobody had planned for this meeting. The group agreed
to log this as a legitimate future work item rather than something this meeting should
attempt to resolve.

The meeting's title, "amnesty," reflects its actual outcome: rather than trying to
eliminate every exception on a deadline, the group decided to formally re-classify each
one individually — some as permanent-and-intentional (profile), some as
debt-to-be-scheduled (issue detail page), one as a real design gap or Change (auth events)
— revising the flat, undifferentiated framing `DES-008` and `DES-017` currently give all
five exceptions as a single list with no distinction between them. This is the specific
revision this meeting makes: it does not change what the exceptions are, but it changes
how the design docs should describe them going forward — no longer "five exceptions,"
but a categorized list with different implications for each.

## Decisions

1. `update-profile.ts` and its associated profile page are reclassified as permanently
   acceptable, not debt — no remediation planned (relates `DES-008`).
2. The members invitations and notifications settings pages' direct repository reads
   are reclassified as acceptable for now but flagged as needing re-review if either
   page's logic grows beyond a simple read.
3. The issue detail page's direct repository call is reclassified as debt, with
   remediation (routing it through the existing `getIssue` service function) scheduled
   as real follow-up work, not left as a permanent exception.
4. `auth-service.ts`'s inability to emit events is reclassified as a genuine design gap
   in `TaskflowEventMap`, not a layering violation — future work to extend the event map
   is logged separately, out of scope for this meeting.
5. `DES-008`/`DES-017` will be revised to categorize each exception individually rather
   than presenting a flat undifferentiated list of five.

## Follow-ups

- Mira to file the issue detail page remediation as tracked implementation work.
- Deji to update `DES-008` and `DES-017` with the categorized framing agreed here.
- Jan to scope (not implement) what extending `TaskflowEventMap` with auth events would
  actually touch, as input to a future dedicated design discussion.
