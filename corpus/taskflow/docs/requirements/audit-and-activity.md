---
title: Audit and activity requirements
id: REQ-AUDIT
status: approved
owners: [product-team, h.iqbal]
last_updated: 2026-06-16
related: [REQ-034, REQ-139, ADR-022, DES-220]
---

## Scope

This document defines the requirements for the audit trail: how domain events become
activity rows, immutability, queryability, the permission gates on reading and exporting it,
its plan-tied retention window and the flag that gates the feed itself, and CSV export
correctness. It is the terminal consumer many other domains' events feed into, so it
cross-references almost every prior document in the corpus.

## Context

`activity-service.ts` subscribes to the entire event bus through
`registerActivityListeners`, not to a curated subset — every one of the 21 keys in
`TaskflowEventMap` produces exactly one `record()` call, which is what makes `REQ-220`'s
"every domain event is recorded" true by construction rather than by a maintained list of
"which events matter for audit" that could silently drift out of sync as new events are
added. `record(orgId, action, input)` writes one row through
`activity-repository.ts#insertActivity`; there is no `updateActivity` in the manifest,
because activity rows are append-only by design (`REQ-221`) — the audit trail would not be
trustworthy if its own entries could be edited after the fact.

`ActivityEvent` rows carry an actor (nullable — some system-triggered events like the
retention cleanup job itself have no human actor), a subject kind and id, an optional
project id for narrowing, a human-readable summary, and a metadata bag typed as
`Readonly<Record<string, string | number | boolean | null>>` — deliberately a flat,
JSON-serializable shape rather than an arbitrary object, so every activity row's metadata is
guaranteed exportable to CSV (`REQ-230`) without a custom serializer per event type.

Reading the feed (`listActivity`) requires `activity:read`, whose `ROLE_MATRIX` minimum is
`member` — one step above `viewer`, since the audit trail exposes information about other
members' actions that Taskflow does not consider appropriate for a pure viewer role to see
by default. Exporting it (`exportActivity`, producing a CSV via `toCsv`) requires
`activity:export`, `admin` minimum, a stricter gate than reading, matching the general
pattern in this product of "seeing it in the UI" and "getting a bulk machine-readable copy
of it" being different permission tiers (the same split exists between viewing an issue list
and CSV-exporting it, `REQ-079`).

The feed itself is additionally gated by the `activity_feed` flag (`growth` plan minimum,
overridable) — a `free` or `starter` org without an override has the `activity:read`
permission available in principle but the feature surface hidden behind the flag, which is
the same plan-gates-a-role-permitted-action pattern `REQ-050` describes for public projects.

Retention (`REQ-227`) ties directly into billing: `cleanup-archived-job.ts`'s
`runCleanupArchivedJob(now)` reads each organization's plan's `retentionDays` from
`PLAN_LIMITS` and purges activity (and other archived rows generally) older than that
window, on the `cleanup-archived` cadence — once daily, the same cadence as the search
reindex job, both being lower-urgency maintenance work compared to the per-minute webhook
delivery cadence.

## Open questions

1. `REQ-228` requires activity capture to never fail the originating write, but this
   document does not specify what observable signal exists when a capture failure does occur
   silently — whether it is only visible through `src/lib/logger.ts`'s structured logs or
   surfaces anywhere in-product is unspecified.
2. `REQ-227`'s retention window is keyed to the plan at cleanup time, not the plan at the
   time each activity row was recorded; an organization that downgrades loses access to
   older history sooner than a reader might expect, and no requirement here addresses
   whether that transition should be communicated to the org before data is purged.
3. Whether `REQ-223`'s per-subject query should itself be flag-gated the same way the general
   feed is, given it is used by the issue detail page's own history panel rather than the
   dedicated activity feed screen, is not addressed — the current implementation appears to
   treat per-subject activity as always available regardless of the `activity_feed` flag,
   which may be intentional or may be an oversight worth a follow-up requirement.

### REQ-220 — Every domain event is recorded as an activity row

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-022, ADR-005, REQ-111

`registerActivityListeners` subscribes to all 21 `TaskflowEventMap` keys and calls `record`
for each, which is the mechanism `ADR-022` names explicitly: deriving the audit trail from
the event bus rather than maintaining a parallel, hand-written audit-logging call at every
mutation site in every service.

**Acceptance criteria**

1. Every key in `TaskflowEventMap` has a registered activity listener.
2. Adding a new domain event without also adding it to the audit trail requires an explicit
   omission decision, not an accidental gap, since the subscription is total by default.
3. A subscriber's own failure (per the event bus's isolation guarantee) does not prevent
   other subscribers, including the activity listener, from still running for the same
   event.

**Implemented by:** `src/server/services/activity-service.ts`
**Verified by:** `tests/services/activity-service.test.ts`, `tests/server/domain-events.test.ts`

### REQ-221 — Activity rows are immutable

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-220, ADR-022
- **Implemented by:** `src/server/repositories/activity-repository.ts`
- **Verified by:** `tests/services/activity-service.test.ts`

There is no `updateActivity` function anywhere in `activity-repository.ts` or
`activity-service.ts`; once inserted, an activity row's fields never change. Even the
retention cleanup job only deletes whole rows past the window — it never edits a row's
content, which would compromise the trail's evidentiary value.

**Acceptance criteria**

1. No code path in the codebase calls an update-style statement against the activity table.
2. The only lifecycle transition an activity row undergoes is insertion and, eventually,
   deletion by retention cleanup.
3. `tests/services/activity-service.test.ts` does not exercise any mutation path because
   none exists to test.

### REQ-222 — Activity records the actor, subject and action

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-034, REQ-220
- **Implemented by:** `src/server/services/activity-service.ts` — `record`
- **Verified by:** `tests/services/activity-service.test.ts`

Every `ActivityEvent` names three things: who did it (`actorId`, nullable for system
actions), what it was done to (`subjectKind`, `subjectId`), and what happened
(`action: ActivityAction`), plus a `summary` string and the flat `metadata` bag for anything
event-specific — the role-change before/after values `REQ-034` describes are exactly the
kind of detail `metadata` exists to carry.

**Acceptance criteria**

1. Every recorded row has a non-empty `subjectKind`/`subjectId` pair.
2. `actorId` is `null` only for genuinely system-triggered events (scheduled job actions),
   never as a fallback for a missing but expected human actor.
3. `metadata` values are restricted to string, number, boolean or null — no nested objects —
   so every row remains flat enough for CSV export without a custom flattening step.

### REQ-223 — Activity is queryable by subject

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-222, DES-230
- **Implemented by:** `src/server/repositories/activity-repository.ts` — `listActivityForSubject`
- **Verified by:** `tests/services/activity-service.test.ts`

`listActivityForSubject(orgId, subjectKind, subjectId)` in `activity-repository.ts` powers
the "history" panel on an individual issue's detail page, distinct from
`listActivity`/`listActivityForOrg`'s org-wide feed used by the dedicated activity screen —
two different read patterns over the same underlying append-only table.

**Acceptance criteria**

1. `listActivityForSubject` returns rows in chronological order for one specific subject.
2. The function requires `orgId` alongside the subject identifiers, maintaining tenancy even
   for this narrower query shape.
3. A subject with no recorded activity returns an empty array, not an error.

### REQ-224 — Reading the activity feed requires member

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-022, REQ-023
- **Implemented by:** `src/lib/permissions.ts` — `ROLE_MATRIX`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`activity:read`'s `ROLE_MATRIX` minimum is `member`, one tier above the `viewer` floor most
`*:read` actions use — a deliberate exception reflecting that the activity feed surfaces
who-did-what across the whole organization, information Taskflow treats as appropriate for
contributors but not for the lowest-privilege observer role.

**Acceptance criteria**

1. A `viewer` calling `listActivity` is denied, unlike almost every other `*:read` action in
   the product.
2. A `member` or higher can read the feed without needing `admin`.
3. `tests/lib/permissions.matrix.test.ts` explicitly covers `activity:read`'s
   above-viewer minimum, since it is the exception to the general read-permission pattern.

### REQ-225 — Exporting activity requires admin

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-079, REQ-024
- **Implemented by:** `src/lib/permissions.ts` — `ROLE_MATRIX`, `src/server/services/activity-service.ts` — `exportActivity`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`activity:export`'s `ROLE_MATRIX` minimum is `admin`, stricter than `activity:read`'s
`member` floor, mirroring the read-versus-bulk-export permission split used elsewhere in the
product (`REQ-079`'s CSV export of issues has the same shape, gated by the flag rather than
role, since issue read access is already broad; activity export is gated by role because the
underlying read access is already restricted to `member`-and-above).

**Acceptance criteria**

1. A `member` who can read the feed cannot export it to CSV.
2. `exportActivity`'s permission check runs before `toCsv` is invoked, so a denied caller
   never triggers the (potentially large) query behind the export.
3. `activity:export`'s matrix entry is exercised independently from `activity:read`'s in the
   permission test suite.

### REQ-226 — The activity feed is gated by a feature flag

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-188, ADR-012
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/config/nav.ts` — `visibleNav`
- **Verified by:** `tests/lib/feature-flags.test.ts`, `tests/config/nav.test.ts`

`activity_feed` (`growth` plan minimum, overridable) gates the dedicated activity feed
screen; `free` and `starter` orgs without an override do not see the feature in navigation
(`visibleNav`'s flag check) even for members who technically hold `activity:read`.

**Acceptance criteria**

1. `isEnabled('activity_feed', context)` is checked by the feed's page component before
   rendering, independent of the `activity:read` permission check.
2. `visibleNav` hides the activity feed's sidebar entry for orgs without the flag.
3. An override can unlock the feed early for a `starter` org, consistent with the flag being
   marked overridable.

### REQ-227 — Activity retention follows the plan's retention window

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-231, ADR-010, DES-240
- **Implemented by:** `src/config/plan-limits.ts` — `getPlanLimits`, `src/server/jobs/cleanup-archived-job.ts` — `runCleanupArchivedJob`
- **Verified by:** `tests/config/plan-limits.test.ts`

`getPlanLimits(plan).retentionDays` — 30 for `free`, 90 for `starter`, 365 for `growth`, and
2555 (roughly seven years) for `enterprise` — bounds how far back activity (and other
archived data generally) persists before the cleanup job purges it, tying audit history
depth directly to the plan ladder the same way every other quota in the product does.

**Acceptance criteria**

1. `runCleanupArchivedJob` reads `retentionDays` from the organization's current plan, not a
   fixed global value.
2. `enterprise`'s 2555-day window is a large finite number, not `UNLIMITED`, matching the
   product facts precisely (retention is explicitly bounded even for the top plan, unlike
   seats or projects).
3. An organization's retention window changes immediately on plan change, per `REQ-140`.

### REQ-228 — Activity capture must not fail the originating write

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-220, ADR-005
- **Implemented by:** `src/server/services/activity-service.ts` — `registerActivityListeners`, `src/lib/event-bus.ts` — `subscribe`
- **Verified by:** `tests/lib/event-bus.test.ts`

Because activity recording happens through an event-bus subscriber, not inline inside
`issue-service.ts`/`comment-service.ts`/etc., a failure inside `record()` cannot roll back
or reject the domain mutation that triggered the event — the event bus's per-handler error
isolation, documented generally in `ADR-005`, is what makes this requirement true, not any
audit-specific defensive coding in `activity-service.ts` itself.

**Acceptance criteria**

1. A thrown error inside the activity listener does not propagate to the caller of the
   original Server Action.
2. The original domain write (issue creation, comment posting, and so on) completes and
   returns successfully even if activity recording for that same event fails.
3. A failed capture is observable through structured logging (`src/lib/logger.ts`), even
   though it is not surfaced to the end user, per the open question above.

### REQ-229 — Activity is paginated by occurrence time

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-052, REQ-078, ADR-008
- **Implemented by:** `src/server/services/activity-service.ts` — `listActivity`, `groupByDay`
- **Verified by:** `tests/services/activity-service.test.ts`

`listActivity(input)` returns a `Page<ActivityEvent>` using the same keyset-cursor pattern as
every other paginated listing in the product, ordered by occurrence time, most recent first —
consistent with how an audit feed is naturally read (what happened most recently), unlike
issue or project lists, which more often default to a different natural order.

**Acceptance criteria**

1. The feed's cursor is built from occurrence time plus id as a tiebreaker, ensuring a
   stable order even for events recorded in the same instant.
2. Paginating through the feed while new events continue to arrive does not produce
   duplicate or skipped rows in already-fetched pages.
3. `groupByDay(events)` in `activity-service.ts`, used by the feed UI to render day-grouped
   sections, operates on already-paginated results, not a separate unpaginated query.

### REQ-230 — CSV export escapes quotes and separators

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-079, DES-071

`toCsv`/`escapeCsvValue` in `src/lib/csv.ts` implement RFC-4180 quoting: any field
containing a comma, a double quote, or a newline is wrapped in double quotes with internal
quotes doubled, so an activity summary or metadata value containing any of those characters
does not corrupt the exported file's column structure when opened in a spreadsheet
application.

**Acceptance criteria**

1. A metadata value containing a comma round-trips correctly through export and re-import
   in a standard CSV parser.
2. A value containing an embedded double quote is escaped as two consecutive double quotes
   within a quoted field.
3. A value containing a newline remains within its own field's quoted boundary rather than
   creating a spurious new CSV row.

**Implemented by:** `src/lib/csv.ts`
**Verified by:** `tests/lib/csv.test.ts`

### REQ-231 — Cleanup removes activity beyond the retention window

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-227, ADR-016
- **Implemented by:** `src/server/repositories/activity-repository.ts` — `purgeActivityBefore`, `src/server/jobs/cleanup-archived-job.ts` — `runCleanupArchivedJob`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`purgeActivityBefore(orgId, before)` in `activity-repository.ts` is called by
`runCleanupArchivedJob(now)` for each organization, using `before = now - retentionDays`
computed from that organization's current plan. This is one of the few places in the
codebase where data is genuinely, permanently deleted rather than soft-deleted, since the
entire point of retention cleanup is to actually reclaim the space and reduce the audit
surface, not merely hide old rows from default listings the way `ADR-004`'s soft delete does
for user-facing content.

**Acceptance criteria**

1. `purgeActivityBefore` issues an actual `DELETE`, not an `archived_at` update.
2. Rows within the retention window are never purged, even on repeated job runs.
3. `runCleanupArchivedJob`'s `JobResult` reports the count of rows purged per organization
   for observability, consistent with every other job's `JobResult` shape.
