---
title: Notes — retention policy
id: OPS-NOTES-2026-05-22
status: approved
owners: [j.novak]
last_updated: 2026-05-22
related: [REQ-227, REQ-231, DES-205, ADR-004]
---

**Date:** 2026-05-22
**Attendees:** j.novak (chair), d.okafor, r.saito, h.iqbal

## Agenda

1. Review how `cleanup-archived-job` actually enforces `retentionDays` and confirm it
   matches what the plan-limits table promises customers.
2. Discuss the asymmetry between what gets purged (search documents, activity rows) and
   what does not (the issue rows themselves).
3. Decide whether that asymmetry needs to be fixed or just documented clearly.

## Discussion

Jan opened by walking through `runCleanupArchivedJob` line by line for the group: for
every organization, it computes a cutoff from `retentionDays` and the current time, finds
archived issues past that cutoff, and calls `searchRepo.deleteSearchDocument` for each —
removing them from search — while separately purging activity rows older than the same
cutoff via `activityRepo.purgeActivityBefore`. He flagged the detail that stood out on
re-reading the job: **the issue row itself is never deleted.** Only its search
document and any activity rows referencing it (once old enough) are purged. The issue
stays in the database indefinitely, soft-deleted, forever.

Rin asked directly whether this contradicts what customers are told about retention —
does "30-day retention" on the free plan mean their data is gone after 30 days, or does
it not? Deji clarified this is a known and, in his view, correct design: `ADR-004`
established soft delete as the pattern for issues specifically because the audit log
(`activity` rows, before they age out) needs to be able to reference the issue by id
even after it is archived — hard-deleting the issue row would leave dangling references
in any activity row still inside its own retention window. Retention, as documented,
governs discoverability (search) and audit history (activity), not the literal existence
of the underlying row. Rin agreed this distinction was correct but flagged that the
customer-facing language around "retention" does not currently make this nuance clear,
and a customer reading "30-day retention" could reasonably assume their archived issues
are physically gone after 30 days, which is not true.

Hana raised a related question: is there ever a scenario where an archived issue's row
needs to be truly, permanently deleted — for a GDPR-style erasure request, for example,
rather than routine retention? The group agreed this is a real gap: nothing in the
current cleanup job or the repository layer performs a hard delete of an issue row, ever.
Jan noted this is out of scope for the retention policy specifically — it is a distinct
data-erasure feature that has not been built — but the group agreed it should be logged
as a known gap rather than left implicit, since it will eventually become a compliance
question, not just an engineering nicety.

Deji also flagged an asymmetry worth documenting explicitly: `retentionDays` is scoped
per-organization via `getPlanLimits(org.plan)`, meaning a `free` org's data ages out of
search after 30 days while an `enterprise` org's stays discoverable for 2555 days (seven
years) — but the *audit* purge uses the exact same cutoff for both search and activity,
even though the two data types arguably have different real-world retention
requirements (a customer might want to keep audit history longer than they want stale
issues showing up in search, or vice versa). Nobody proposed splitting these into two
separate configurable windows today — the group agreed the single shared cutoff is a
reasonable simplification for now, but wanted it written down as a deliberate choice
rather than an oversight, given how directly it interacts with what the docs promise.

## Decisions

1. Confirmed as correct, intentional behavior: `cleanup-archived-job` purges search
   documents and activity rows past the retention cutoff, but never deletes the
   underlying issue row itself (relates `REQ-227`, `REQ-231`, `DES-205`, `ADR-004`).
2. The gap between "retention" as implemented (discoverability and audit history) and
   "retention" as a customer might reasonably read it (data no longer existing) is a
   documentation problem to fix, not a code change — action item filed.
3. True hard-delete / data-erasure for compliance requests does not exist today and is
   logged as a known gap, out of scope for the retention job itself.
4. Search and activity purge share a single retention cutoff per plan; this is a
   deliberate simplification, not an oversight, and stays as-is for now.

Hana asked one closing question worth recording: does QA have a reliable way to test
retention behavior end to end without waiting real days or weeks for a cutoff to pass?
Jan confirmed `runCleanupArchivedJob` takes an explicit `now: Date` argument specifically
so tests (and manual verification, per `runbook-scheduler-and-queue.md`'s general
pattern of invoking job functions directly with a controlled clock) can simulate any
point in time without waiting for real time to pass — seed an archived issue with a
known `archivedAt`, then call the job with a `now` far enough in the future to cross the
plan's `retentionDays` cutoff, and assert the search document is gone while the issue
row remains. The group agreed this pattern should be the standard template for any
future retention-adjacent test, rather than each contributor reinventing a way to
simulate elapsed time.

## Follow-ups

- Rin to work with product/legal on rewriting customer-facing retention language to be
  precise about what "retention" actually governs.
- Deji to file the data-erasure gap as a tracked future feature rather than leaving it
  purely as meeting-notes context.
- Jan to add a comment directly in `cleanup-archived-job.ts` clarifying that the issue
  row is intentionally retained, since this is exactly the kind of thing a future
  contributor might "fix" without realizing it is deliberate.
