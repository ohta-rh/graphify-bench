---
title: Notes — pagination cutover
id: OPS-NOTES-2026-01-15
status: approved
owners: [d.okafor]
last_updated: 2026-01-15
related: [ADR-008, REQ-052, REQ-078]
---

**Date:** 2026-01-15
**Attendees:** d.okafor (chair), m.lindqvist, k.ferreira, h.iqbal

## Agenda

1. Confirm rollout plan for `ADR-008`'s keyset pagination now that it is accepted.
2. Identify every list endpoint still on offset pagination and sequence the migration.
3. Discuss what breaks for API consumers during the cutover, if anything.

## Discussion

Deji opened by restating why `ADR-008` was accepted the week prior: offset pagination
(`LIMIT`/`OFFSET`) degrades badly as a table grows and, worse, produces skipped or
duplicated rows whenever a row is inserted or deleted between two page requests — a
concrete problem for issue lists, where an issue frequently changes status mid-browse.
Keyset pagination, using a cursor built from a stable sort column plus id tiebreaker,
avoids both problems at the cost of not supporting "jump to page 7" directly.

Mira asked what the actual consumer-facing contract looks like — is the cursor opaque or
does the client need to understand its shape? The group agreed the cursor should be
treated as an opaque token by every caller, even though internally it is just an encoded
`(sortValue, id)` pair; this keeps the door open to changing the internal cursor
encoding later without breaking API consumers, as long as they only ever pass back a
cursor they were previously given rather than constructing one themselves.

Kaya raised the operational question: which endpoints are affected? The group inventoried
issue listings (`REQ-078`), project listings (`REQ-052`), and search results
(`REQ-179`) as the three list surfaces with the most traffic and the most acute offset
problems, given how frequently issues in particular are created and archived during
normal use. Notification listings and activity listings were flagged as lower priority
for this pass — both already page by a monotonically increasing timestamp in practice,
so the actual query pattern is closer to keyset already, even if the code had not been
formally documented that way.

Hana raised a QA concern specific to keyset pagination: how do you test "page 2 is
correct" when there is no numeric page to assert against? The group agreed the test
strategy should assert on cursor stability under concurrent mutation — seed a known set
of rows, capture a cursor after page 1, mutate an early row, fetch page 2 with the
captured cursor, and assert the previously-fetched row does not reappear and no row is
skipped. This became the template test pattern referenced later during implementation of
each affected repository's listing function.

Deji flagged one migration risk: any client-side code (including Taskflow's own
Server Components) currently constructing a page number in a URL query string would need
updating to pass a cursor instead. Mira confirmed the dashboard's own pagination
controls were straightforward to update since they are Server Components regenerating
links server-side, but cautioned that any external API consumer relying on offset-style
"give me page 3" would see a breaking change. The group agreed this was acceptable
because Taskflow's public API surface at this stage has no external consumers depending
on offset semantics yet — this cutover is happening early enough in the product's life
that there is no backward-compatibility burden to carry.

## Decisions

1. Keyset pagination replaces offset pagination for issue listings, project listings,
   and search results as the first wave (relates `REQ-052`, `REQ-078`, `REQ-179`).
2. The pagination cursor is treated as an opaque token by every caller, internal or
   external; no consumer may construct one by hand.
3. Notification and activity listings are deferred to a later pass since their existing
   query pattern already approximates keyset behavior.
4. Test coverage for keyset-paginated listings must include a concurrent-mutation
   scenario (capture cursor, mutate, fetch next page, assert no skip/duplicate), not
   just a happy-path multi-page walk.

One additional point came up during Q&A that is worth preserving: Kaya asked whether
keyset pagination changes how "total count" is displayed in the UI, since offset
pagination naturally supports a page-of-N-total display and keyset pagination does not
inherently know the total without a separate count query. Mira confirmed the dashboard's
issue list already runs a separate `countIssues` call alongside `listIssues` for exactly
this reason — the count and the paginated rows are two independent queries today, and
that does not change with the cutover, since the count query was never offset-based to
begin with. Deji noted this means the cutover's performance win is specifically about
the rows query, not the count query, and that a very large organization's issue count
query could itself become a bottleneck independent of pagination strategy — he flagged
this as worth watching but explicitly out of scope for this meeting, since no evidence
yet suggested it was a real problem rather than a theoretical one.

## Follow-ups

- Deji to sequence the three first-wave endpoints and assign implementation.
- Hana to write the shared test helper for the concurrent-mutation scenario so each
  repository's test suite can reuse it rather than reimplementing it three times.
- Kaya to audit whether any documentation or client code references offset-style page
  numbers and needs updating alongside the cutover.
