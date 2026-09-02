---
title: Notes — search syntax gating
id: OPS-NOTES-2026-05-05
status: approved
owners: [k.ferreira]
last_updated: 2026-05-05
related: [REQ-175, REQ-176, DES-154, DES-155]
---

**Date:** 2026-05-05
**Attendees:** k.ferreira (chair), a.whitfield, h.iqbal, m.lindqvist

## Agenda

1. Review a support escalation where a customer's field-scoped search query
   (`status:open assignee:me`) silently returned unfiltered results instead of an error.
2. Decide whether that is correct behavior or a bug.
3. Confirm the interaction between rate limiting and the `advanced_search` flag check is
   working as intended.

## Discussion

Kaya presented the escalation: a `starter`-plan customer (below the `enterprise`
threshold `advanced_search` requires) typed a field-scoped query expecting it to filter,
and instead got back results as if they had typed a plain substring query — the
`status:` and `assignee:` tokens were treated as literal text to search for, not parsed
as syntax. The customer's complaint was that this felt broken rather than gated: no
error, no upsell prompt, just wrong results that happened to still return something.

Mira asked whether this was actually the designed behavior or an oversight. Kaya
confirmed it was designed — `search()` in `search-service.ts` narrows which query
features are honored based on the flag rather than rejecting the whole query outright
when `advanced_search` is unavailable (`DES-256` describes the same narrowing pattern at
the action layer for a related surface). The reasoning at the time this was built was
that failing the whole query outright would be a harsher experience than silently
falling back to substring matching. Having now seen a real customer hit this, the group
revisited whether "harsher but honest" might actually be better than "softer but
confusing."

Ada argued for keeping the narrowing behavior but adding a response-level signal — not
an error, but a flag in the response indicating "some query syntax was not honored due
to plan" — so the client can render an upsell hint without treating the response as a
failure. Hana raised the QA angle: this would need explicit test coverage distinguishing
"a query with no special syntax on a low plan" from "a query with special syntax on a low
plan that got silently narrowed," which the current test suite does not clearly
separate. The group agreed this was worth doing but is a client-and-API contract change,
not a same-day fix — Kaya to write it up as a proper design proposal rather than
patching the response shape ad hoc.

Separately, the group confirmed the interaction between rate limiting and the flag check
is working as designed, not as a bug: `DES-155` establishes that rate limiting runs
*before* the `advanced_search` flag check, specifically so a throttled caller never
learns whether their plan includes advanced search at all — the 429 response looks
identical whether or not the plan would have supported the query. Kaya explained the
reasoning again for the group's benefit since it had come up in a recent code review as
looking backwards at first glance: checking the flag first would leak plan information
to a caller who is already being throttled, which is a minor but real information
disclosure the ordering deliberately avoids. Nobody proposed changing this.

## Decisions

1. Silent syntax narrowing for `advanced_search`-gated queries remains the underlying
   behavior for now, but the response shape should eventually signal that narrowing
   occurred rather than staying silent — tracked as a design proposal, not an immediate
   fix (relates `REQ-175`, `DES-154`).
2. Rate-limit-before-flag-check ordering (`DES-155`) is confirmed correct and will not
   change; the apparent "backwards" ordering is deliberate information-disclosure
   avoidance.
3. Test coverage should explicitly distinguish narrowed-syntax queries from plain
   queries on low plans, as a prerequisite for any future response-shape change.

Mira asked a final question that the group treated as worth recording even without a
firm answer: does the same "silent narrowing versus explicit signal" tension exist
anywhere else flags gate query or list behavior, or is search the only place this
pattern shows up? Kaya thought `activity_feed` might have a similar shape — a
plan-gated flag that, if disabled, could either hide the feature entirely or narrow what
it shows — but nobody in the room could confirm from memory how `listActivity` actually
behaves when the flag is off versus when the caller simply lacks `activity:read`
permission (`REQ-224`). The group agreed this was worth a quick audit rather than
guessing, since the same design-proposal work Kaya is taking on for search could
reasonably extend to any other surface with the same silent-narrowing shape, rather than
solving the problem once for search and leaving a sibling inconsistency elsewhere.

## Follow-ups

- Kaya to write a design proposal for signaling narrowed query syntax in the search
  response, including the client-side upsell hook.
- Hana to add the missing test distinction between narrowed and plain low-plan queries
  ahead of that design work landing.
- Ada to loop in support with revised guidance for this specific ticket pattern in the
  meantime, since the underlying behavior is not changing this quarter.
