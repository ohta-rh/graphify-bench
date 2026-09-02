---
title: Soft delete with archived_at instead of hard delete
id: ADR-004
status: accepted
owners: [platform-team]
last_updated: 2025-11-24
related: [REQ-044, REQ-046, REQ-071, REQ-098, ADR-002, ADR-006]
---

# ADR-004 — Soft delete with archived_at instead of hard delete

## Status

Accepted, and in practice one of the least controversial decisions in this
document — nobody has proposed reopening it. It has, however, produced more
"wait, why is this row still here" support questions internally than any
other single decision, which is why this ADR exists as a reference.

## Context

By the second month of the project, three separate features needed some
notion of "this thing is gone but the data should not disappear": archiving a
project (REQ-045, REQ-046), archiving an issue (REQ-071), and deleting a
comment (REQ-098). A fourth pressure came from the billing model itself:
REQ-044 requires that archived projects still count against the plan's
project quota, which only makes sense if the row still exists to be counted.

The team considered simply deleting rows with `DELETE FROM` and accepted the
consequences, but three concrete scenarios made hard deletion the wrong
default:

- **Restore.** REQ-047 requires that a project can be restored without losing
  its issues. A hard-deleted project's issues are unrecoverable without a
  cascading soft-delete-then-restore of their own, which is strictly more
  complex than never deleting in the first place.
- **Audit trail integrity.** ADR-022 derives the activity feed from the event
  bus and stores `subjectId` references to issues, projects, and comments.
  An activity row pointing at a hard-deleted issue is a dangling reference
  the moment someone opens the audit log; a soft-deleted issue can still be
  loaded (with `includeArchived: true`) to render "Issue #142 (archived):
  Fix login redirect" instead of a broken link.
- **Accidental deletion is common, and expensive to reverse without it.**
  Hana Iqbal's QA notes from December 2025 flag project archival as one of
  the most-clicked-by-mistake actions in early usability sessions, precisely
  because it sits next to project settings. A model where the "undo" is
  "call restore" rather than "file a database recovery ticket" was judged
  worth the storage and query cost.

Genuinely permanent deletion still exists — REQ-048 says project deletion is
permanent and owner-only — but it is a distinct, rarer, explicitly-guarded
operation, not the default outcome of the everyday archive action a member or
admin reaches for.

## Decision

Issues, projects, and comments carry an `archived_at` column (declared once,
in the shared schema helpers `src/server/db/schema/_shared.ts`, and composed
into each table's Drizzle schema per ADR-002) and are never physically
removed by the ordinary archive/delete flows a member interacts with.
`src/lib/soft-delete.ts` is the single place this convention is expressed in
code:

- `isArchived(row)` / `isLive(row)` read `row.archivedAt !== null` /
  `=== null`.
- `applyArchiveScope(rows, scope)` filters an in-memory collection according
  to an `ArchiveScope`, defaulting to live rows only.
- `shouldFilterArchived(scope)` is what a repository calls to decide whether
  to add the `archived_at IS NULL` predicate to a query — repositories must
  express "live rows only" through this helper, per the module's own
  documentation, rather than writing `isNull(table.archivedAt)` inline at
  each call site, which is exactly the kind of predicate drift the module
  exists to prevent.
- `archivePatch(now)` returns the `{ archivedAt, updatedAt }` column patch an
  archive operation writes; `restorePatch(now)` returns the corresponding
  `{ archivedAt: null, updatedAt }` patch a restore writes.
- `assertNotArchived(entity, id, row)` guards an archive action so that
  archiving an already-archived row throws `AlreadyArchivedError` (mapped by
  `src/lib/errors.ts` to the `conflict` code, HTTP 409) rather than silently
  succeeding a second time or double-counting an `issuesArchived` count.

Default listings (project lists, issue lists, comment threads) filter to live
rows; REQ-046 and REQ-101 are both satisfied by callers simply not passing
`includeArchived: true` in the `ArchiveScope` they build. Comment deletion
(REQ-098) reuses this exact mechanism rather than a separate
`deleted_at`/`is_deleted` column — a deleted comment is an archived comment,
which keeps the vocabulary the audit trail and the UI need to reason about
down to one concept instead of two subtly different ones.

## Consequences

**What this buys the team.** Restore is a one-column write, not a
resurrection job. The activity feed (ADR-022) can always resolve a
`subjectId` to a real, renderable row, archived or not. Quota accounting
(REQ-044) is a straightforward `COUNT(*)` over all rows regardless of
archive state, with no separate "how many were ever created" ledger to keep
in sync. `AlreadyArchivedError` gives a precise, typed conflict instead of a
silent no-op, which has made at least one real bug (a double-submit on the
archive-project button) visible as a 409 in the network tab rather than an
invisible non-event.

**What it costs.** Every query that should only see live data has to
remember to filter, and forgetting is a correctness bug that does not fail
loudly — a forgotten `shouldFilterArchived()` check shows archived issues in
a board view instead of throwing. This has happened: a project-restore
regression in January 2026 briefly caused restored projects' previously
archived issues to reappear in the live issue count used for REQ-135's
quota check, because a new repository function queried the table directly
instead of going through the shared helper. The fix was a fifteen-minute
patch; the review-process fix (a checklist item: "does this new repository
function filter archived rows?") is the more durable one. Storage also grows
monotonically for archived data — nothing is ever compacted by the ordinary
product flows — which is part of why REQ-231's scheduled cleanup job exists
for retention-window enforcement, and why retention-window length is itself
a plan-tier quota (`retentionDays` in `PlanLimits`) rather than an
unconditional promise to keep everything forever. Table scans over
soft-deleted history also grow the working set of every table that uses this
pattern, which is a cost the team accepted given SQLite's modest data volumes
in this product's expected scale, but would need revisiting if issue volume
per organization grew by an order of magnitude.

## Alternatives considered

**Hard delete with a separate `deleted_issues` audit table**, copying a row's
data before removing it. Rejected because it doubles the schema surface for
every soft-deletable entity and still leaves the restore path
(REQ-047) reconstructing a row from an audit copy rather than simply
flipping a column — strictly more code for a worse experience.

**A generic `status` enum column** (`active` / `archived` / `deleted`) instead
of a nullable timestamp. Considered, and rejected specifically because
`archived_at` carries "when," which the UI already wants to show ("archived 3
days ago") and which a bare status enum would require a second column to
express anyway. A nullable timestamp collapses "is it archived" and "when was
it archived" into one column.

**Database-level `ON DELETE CASCADE`** relying on a genuine hard delete of a
project to cascade-remove its issues, comments, and activity. Rejected
outright: it directly contradicts REQ-047 (restore without losing issues) and
would have made the audit trail's dangling-reference problem structural
rather than avoidable.

## References

- REQ-044 (archived projects still count against quota), REQ-046 (archived
  projects hidden from default listings), REQ-047 (restore without losing
  issues), REQ-071 (issues archived, not deleted, by default), REQ-098
  (comment deletion is a soft delete)
- ADR-002 (Drizzle schema layout this pattern is composed into via
  `_shared.ts`), ADR-006 (`org_id` on every tenant table, the sibling
  convention in the same shared schema helpers), ADR-022 (activity feed
  relies on soft-deleted rows staying resolvable)
- Code: `src/lib/soft-delete.ts` (`isArchived`, `isLive`,
  `applyArchiveScope`, `shouldFilterArchived`, `archivePatch`,
  `restorePatch`, `AlreadyArchivedError`, `assertNotArchived`),
  `src/server/db/schema/_shared.ts`, `src/lib/errors.ts`
