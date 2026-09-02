---
title: Optimistic UI for issue mutations
id: ADR-021
status: accepted
owners: [m.lindqvist]
last_updated: 2026-05-14
related: [REQ-066, REQ-067, REQ-068, ADR-001, ADR-009]
---

# ADR-021 — Optimistic UI for issue mutations

## Status

Accepted, applied specifically and only to issue status and assignee
changes as of this writing — the two mutations a user performs most
frequently and most casually while triaging, per Mira Lindqvist's usage
analysis from April 2026.

## Context

The issue board is Taskflow's highest-interaction surface: dragging a card
between status columns, reassigning an issue from a dropdown, both happen
dozens of times in a single triage session. Under ADR-001's Server Actions
model, the straightforward implementation is: user acts, the client calls
the Server Action, the Server Action calls the service, the service
persists the change and the route revalidates, and only then does the UI
show the new state. Mira Lindqvist's April 2026 session recordings showed
this round trip, even at `better-sqlite3`'s fast, synchronous, in-process
speeds, was perceptible: a dragged card visibly snapped back to its original
column for a beat before landing in the new one, and several test
participants described the board as feeling "laggy" even though the actual
server-side latency was under fifty milliseconds in every recorded case —
the perceived lag was almost entirely the round-trip-then-repaint sequence
itself, not raw compute time.

React's `useOptimistic` hook, available in the React version this Next.js 16
project depends on, offered a way to show the *intended* new state
immediately, client-side, while the real mutation is still in flight, and
let it be automatically discarded and replaced by the authoritative
server-confirmed state once the Server Action resolves and the route
revalidates. The team scoped this deliberately narrow rather than reaching
for optimistic updates everywhere: status and assignee changes are common,
low-risk to guess wrong about (worst case, a card visibly corrects itself a
moment later), and have an obvious, simple "intended new state" to render
immediately. Comment creation, issue creation, and archival were explicitly
left non-optimistic — creation needs a server-assigned issue number
(REQ-061) before there is anything coherent to render optimistically, and
archival's confirmation-dialog-gated nature already adds enough of a pause
that the round-trip latency is not the dominant part of the perceived delay.

## Decision

`src/hooks/use-optimistic-issues.ts` wraps `useOptimistic(issues,
optimisticIssuesReducer)` (the reducer lives in the sibling
`optimistic-issues-reducer` module) behind a small, purpose-built hook:
`useOptimisticIssues(issues: readonly Issue[])` returns the current
(possibly optimistic) `issues` array plus two callbacks,
`applyStatus(issueId, status)` and `applyAssignee(issueId, assigneeId)`, each
wrapped in `useCallback` and dispatching a typed reducer action (`{ kind:
"status", issueId, status }` or `{ kind: "assignee", issueId, assigneeId }`)
through `apply()`. The hook's own comment states the calling contract
explicitly: the caller renders `issues` and fires `applyStatus` /
`applyAssignee` "inside the same transition that invokes the action," which
is what makes React's discard-and-replace semantics work correctly — calling
`apply()` outside a transition that also calls the real Server Action would
leave the optimistic state applied with nothing to reconcile it against.

In practice, the board's drag handler and the assignee-dropdown's onChange
both call the relevant `applyX()` function and the corresponding Server
Action (`changeIssueStatus` in `src/actions/issues/change-issue-status.ts`,
`assignIssue` in `src/actions/issues/assign-issue.ts`) inside the same
`startTransition`. React renders the optimistic state (the card in its new
column, the new assignee's avatar) the instant the transition starts, with
no wait for a network round trip; once the Server Action resolves and
`revalidateTagged()` (ADR-019) invalidates the relevant `issueTag()` and
`projectTag()` cache entries, the page re-renders with server-confirmed data
and React discards the optimistic overlay automatically — the hook itself
has no explicit "clear the optimistic state" call, because `useOptimistic`'s
contract handles that once the underlying `issues` prop the hook was given
reflects the real, revalidated state.

The events this UI change ultimately triggers are unaffected: a status
change still results in the service emitting `issue.status_changed`
(REQ-066), an assignment still emits `issue.assigned` with the previous
assignee (REQ-067), both carrying the same payloads they would if the
mutation had been triggered without any client-side optimism at all — the
optimistic layer is purely a rendering-timing concern, with zero
representation in the event bus, the audit trail, or any persisted state.

## Consequences

**What this buys the team.** The perceived-lag problem the April 2026
session recordings surfaced is gone for the two mutations it targeted: a
dragged card lands in its new column the instant the drag completes, with no
visible snap-back, because the optimistic state renders before the network
round trip even starts. Because the reducer and the hook are narrowly scoped
to exactly the fields status and assignee changes touch, `Issue` objects
elsewhere in the tree (title, description, labels) are never subject to
optimistic reconciliation logic that would need to reason about more
complex, multi-field diffs — REQ-068's "only changed fields are reported on
`issue.updated`" requirement stays entirely a server-side, event-payload
concern, untouched by this client-side optimism, which kept the two
decisions cleanly independent of each other.

**What it costs.** If the real Server Action ultimately fails — a
permission check rejects it, a concurrent archival makes the target issue
no longer live, a validation error — the optimistic state was already shown
to the user before that failure was known, meaning the UI has to visibly
correct itself: the card snaps back to its true column, or the assignee
reverts, after briefly showing the wrong thing. This is by design (the
alternative is not showing anything until the round trip completes, which is
exactly the lag the feature exists to remove) but it does mean a denied
action is now, briefly, visually confusing rather than simply blocked
outright — Mira's team added a toast notification specifically to explain
"this change couldn't be saved" for the failure case, since a silent snap-
back alone tested poorly with users who assumed a stale rendering bug rather
than a rejected action. The `useOptimistic`-based approach also only works
correctly when every caller respects the "same transition" contract the
hook's own documentation states; a caller that invoked `applyStatus()`
outside a transition, or without also triggering the real mutation, would
leave a permanently-optimistic, never-reconciled UI state — this has not
happened in production, but it is an invariant enforced by convention and
by the hook's usage being centralized in the one board component that needs
it, not by anything the type system checks.

## Alternatives considered

**No client-side optimism; rely on faster server responses or a loading
spinner.** This was the pre-ADR baseline, and it is what the April 2026
session recordings identified as the actual UX problem — rejected once
measured, since the round-trip-then-repaint sequence itself, not raw server
latency, was shown to be the dominant contributor to perceived lag.

**Apply optimistic updates broadly**, to every issue-mutating action
(creation, title edits, archival, comments) rather than just status and
assignee. Rejected for the scoping reasons in Context: creation lacks a
coherent optimistic value before the server assigns an issue number, and the
lower-frequency, already-gated actions (archival behind a confirmation
dialog) did not show the same perceptible-lag problem in the session
recordings that motivated this work in the first place — broadening scope
without evidence of a corresponding UX problem was judged unnecessary
complexity.

**A generic, reusable optimistic-mutation framework** applicable to any
future entity, rather than an issue-specific hook. Considered, and
deliberately deferred: with exactly one entity (issues) and two mutation
kinds needing this pattern as of April 2026, Mira's team judged it premature
to design a general abstraction from a single concrete instance — the
narrow, purpose-built hook can be generalized later if a second entity
(projects, say) needs the same treatment, with the benefit of a second real
example to design the abstraction against.

## References

- REQ-066 (status transitions emit `issue.status_changed`), REQ-067
  (assignment emits `issue.assigned` with the previous assignee), REQ-068
  (only changed fields reported on `issue.updated`)
- ADR-001 (Server Actions as the mutation path this optimistic layer sits in
  front of), ADR-009 (the Zod-validated input shape the underlying Server
  Actions still enforce, unaffected by client-side optimism), ADR-019
  (cache tag revalidation is what triggers the optimistic state's discard
  once the real mutation resolves)
- Code: `src/hooks/use-optimistic-issues.ts` (`useOptimisticIssues`,
  `applyStatus`, `applyAssignee`), `src/hooks/optimistic-issues-reducer.ts`
  (`optimisticIssuesReducer`), `src/actions/issues/change-issue-status.ts`,
  `src/actions/issues/assign-issue.ts`
