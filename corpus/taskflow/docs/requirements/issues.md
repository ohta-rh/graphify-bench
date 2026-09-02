---
title: Issue lifecycle requirements
id: REQ-ISSUES
status: approved
owners: [product-team, m.lindqvist]
last_updated: 2026-05-14
related: [REQ-040, REQ-060, ADR-008, DES-070]
---

## Scope

This document defines the requirements for issues: numbering, the status and priority
vocabularies, creation quota, the events issue mutations emit, due dates and overdue
detection, archiving, cross-project moves, listing and filtering, attachments, and CSV
export. It is the largest single domain in the requirements corpus because issues are the
object most of the rest of the product orbits — comments, notifications, search and activity
all key off issue events defined here.

## Context

`src/server/services/issue-service.ts` is the sole owner of issue business rules; every
mutation goes through it, with one deliberate exception the brief calls out explicitly: the
issue detail page at
`src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx` reads
directly from `issue-repository.ts` for its initial render rather than through the service,
a known layering exception kept for a fast first paint on the single highest-traffic page in
the app. Every mutation, by contrast, always goes through `issue-service.ts`, which composes
`assertCan()`, `assertOrgScope()`, `wouldExceedLimit()` and `assertNotArchived()` before
touching the repository.

Issue identity has two parts: a database `IssueId` (a branded ULID, `ADR-015`) and a
human-facing number that is unique only within its project, allocated by
`issue-repository.ts#nextIssueNumber` and never reused (`REQ-061`) — even after an issue is
archived or, in principle, deleted, its number is retired, so `ENG-142` always means the
same issue for the life of the project. `issueKey(projectKey, issueNumber)` in
`src/lib/format.ts` is what renders the two together as the identifier users actually see
and type.

Status and priority are closed vocabularies (`REQ-062`, `REQ-063`) defined in
`src/types/issue.ts` and mirrored in `src/schemas/issue.ts` for runtime validation — there
is no admin UI to add a fifth status, unlike labels, which are free-form per organization.
Every status transition and every assignment change emits its own event
(`issue.status_changed`, `issue.assigned`) distinct from the general `issue.updated`, which
itself only reports the fields that actually changed (`REQ-068`) rather than the whole
record, keeping downstream consumers — notifications, search reindexing, activity — from
doing needless work or producing noisy "issue updated" rows for a field nobody watches.

Overdue detection is not computed on read; `overdue-issue-job.ts` sweeps on a schedule
(`REQ-070`) and emits `issue.overdue`, because computing "is this overdue" per page view
across every list and board would mean every issue list query also needs `now()`-relative
logic duplicated across the board view, the list view and the notification fan-out, instead
of one job producing one event the rest of the system reacts to uniformly.

## Open questions

1. `REQ-076`'s renumbering on cross-project move means an issue's number is not stable
   across its own history if it is ever moved — whether the old `projectId`/`issueNumber`
   pair should redirect rather than 404 is unresolved.
2. `REQ-075` counts attachments against `storageMb`, but there is no requirement here for
   what happens to that count when an issue carrying attachments is permanently purged by
   the retention job (`REQ-231`) — see the corresponding gap noted in
   `billing-and-plan-limits.md`.
3. `REQ-079`'s CSV export flag-gates on plan, but does not additionally rate-limit large
   exports; a very large `issuesPerProject` on `enterprise` combined with unlimited export
   frequency is a known cost surface, not yet bounded by a requirement.

### REQ-060 — An issue belongs to exactly one project

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-040, REQ-010, DES-070
- **Implemented by:** `src/server/repositories/issue-repository.ts` — `findIssueById`, `insertIssue`
- **Verified by:** `tests/repositories/issue-repository.test.ts`

`issues` carries both `org_id` and `project_id`; every `issue-repository.ts` function takes
`orgId` first, and most also take or resolve a `projectId`. There is no cross-project issue
and no "backlog" issue unattached to a project — creating an issue always requires choosing
a project first.

**Acceptance criteria**

1. `createIssue` requires a valid, non-archived `projectId` within the actor's org.
2. `findIssueById` scoped to the wrong `projectId` for that issue returns `null`, not the
   issue from a different project.
3. There is no schema path that creates an issue without a `project_id`.

### REQ-061 — Issue numbers are allocated per project and never reused

- **Priority:** must
- **Status:** implemented
- **Related:** DES-070, ADR-008, REQ-042

`nextIssueNumber(orgId, projectId)` returns a monotonically increasing integer scoped to the
project; `insertIssue` is given that number explicitly rather than deriving it itself, so the
allocation and the insert are two distinct, testable steps. Numbers are never recycled: an
archived or moved-away issue's old number stays retired, because `ENG-142` having meant two
different things at different points in the project's history would break every saved link,
comment permalink and search result referencing it.

**Acceptance criteria**

1. `nextIssueNumber` never returns a value already used by a live or archived issue in that
   project.
2. Two concurrent `createIssue` calls for the same project never receive the same number.
3. Deleting the highest-numbered issue in a project does not cause the next created issue to
   reuse that number.

**Implemented by:** `src/server/repositories/issue-repository.ts` — `nextIssueNumber`, `insertIssue`
**Verified by:** `tests/repositories/issue-repository.test.ts`

### REQ-062 — Issue status is a closed vocabulary

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-066, REQ-077, DES-071
- **Implemented by:** `src/types/issue.ts`, `src/schemas/issue.ts`, `src/lib/format.ts` — `humanizeStatus`
- **Verified by:** `tests/schemas/issue.schema.test.ts`, `tests/lib/format.test.ts`

`IssueStatus` in `src/types/issue.ts` is a fixed union, mirrored by an enum in
`src/schemas/issue.ts` so a status value from an untrusted request is validated against the
same set the type system enforces at compile time. `humanizeStatus` in `src/lib/format.ts`
is the single place status values are turned into display labels, so a new status could not
be silently introduced by one screen without every other screen's board columns and filters
also knowing about it.

**Acceptance criteria**

1. `changeIssueStatusSchema` rejects any string not in the closed `IssueStatus` union.
2. The Kanban board (`getBoard`) derives its columns from the same status set the schema
   validates against, so no status can produce an issue with nowhere to render.
3. `humanizeStatus` has an exhaustive branch for every `IssueStatus` value; adding a status
   without updating it is a compile error, not a runtime fallback.

### REQ-063 — Issue priority is a closed vocabulary

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-062, DES-071
- **Implemented by:** `src/types/issue.ts`, `src/schemas/issue.ts`, `src/lib/format.ts` — `humanizePriority`
- **Verified by:** `tests/schemas/issue.schema.test.ts`, `tests/lib/format.test.ts`

Priority follows the same closed-union pattern as status: `IssuePriority` in
`src/types/issue.ts`, validated in `src/schemas/issue.ts`, humanized by
`humanizePriority`. Unlike status, priority has no transition rules of its own — any
priority can change to any other priority in one step, since priority reflects an ongoing
judgment call rather than a workflow stage.

**Acceptance criteria**

1. `createIssueSchema` and `updateIssueSchema` both validate priority against the same
   closed union.
2. There is no `changeIssuePriority`-specific event; a priority change flows through the
   general `issue.updated` event (`REQ-068`).
3. `humanizePriority` covers every `IssuePriority` value exhaustively.

### REQ-064 — Issue creation is subject to the per-project issue quota

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-135, REQ-138, ADR-010
- **Implemented by:** `src/server/services/issue-service.ts` — `createIssue`, `src/config/plan-limits.ts` — `wouldExceedLimit`
- **Verified by:** `tests/services/issue-service.test.ts`, `tests/contract/plan-limits.test.ts`

`createIssue` calls `wouldExceedLimit(plan, 'issuesPerProject', used)` scoped to the target
project, not to the organization as a whole — a `free`-plan org with two projects gets 100
issues per project, not 100 issues total, which is why the plan's `issuesPerProject` field is
independent from `projects` and `seats`.

**Acceptance criteria**

1. Issue creation past `issuesPerProject` for that specific project fails with
   `plan_limit_exceeded`, even if a sibling project in the same org is nowhere near its own
   limit.
2. The count used for the check excludes archived issues by default scope, matching how
   `countIssues` is called from `billing-service.ts`.
3. `enterprise`'s unlimited `issuesPerProject` never triggers this check.

### REQ-065 — Issue creation emits issue.created

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-053, REQ-111, REQ-172

`createIssue` emits `issue.created` after `insertIssue` succeeds, driving three independent
concerns off one event: notification fan-out to project members and any explicit
assignee (`REQ-113`), search indexing (`indexIssue`), and the activity row. None of those
three subscribers is referenced by name inside `issue-service.ts`.

**Acceptance criteria**

1. `issue.created`'s payload includes enough of the issue (id, projectId, title) for
   subscribers to act without an extra read, though `REQ-173` still has search re-read the
   row rather than trust the payload for content.
2. The event fires exactly once per successful `createIssue` call.
3. A subscriber throwing does not prevent `createIssue` from returning the created issue to
   its caller.

**Implemented by:** `src/server/services/issue-service.ts` — `createIssue`
**Verified by:** `tests/services/issue-service.test.ts`

### REQ-066 — Status transitions emit issue.status_changed

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-062, REQ-111, DES-070
- **Implemented by:** `src/server/services/issue-service.ts` — `changeIssueStatus`
- **Verified by:** `tests/services/issue-service.test.ts`

`changeIssueStatus` emits `issue.status_changed`, distinct from the general `issue.updated`
event a plain field edit would emit, because status transitions are the event most
notification preferences and most activity-feed filters specifically care about — a
recipient who mutes general issue-update notifications may still want status-change alerts,
which the two-event split makes possible without payload-level filtering.

**Acceptance criteria**

1. `issue.status_changed`'s payload includes both the previous and new status.
2. Calling `updateIssue` with an unchanged status does not additionally emit
   `issue.status_changed`; only `changeIssueStatus` emits it.
3. A no-op status "change" (new status equals current status) either short-circuits before
   emitting or is rejected by validation, not silently emitted as a real transition.

### REQ-067 — Assignment emits issue.assigned with the previous assignee

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-113, REQ-068
- **Implemented by:** `src/server/services/issue-service.ts` — `assignIssue`
- **Verified by:** `tests/services/issue-service.test.ts`

`assignIssue` emits `issue.assigned` carrying both the new assignee and the previous one
(which may be `null`), which is what lets the notification service decide whether to notify
the newly assigned person and, separately, whether the previous assignee needs to know they
were unassigned — two different notification semantics from one event.

**Acceptance criteria**

1. Unassigning an issue (setting assignee to `null`) still emits `issue.assigned` with the
   new value `null` and the prior assignee populated.
2. `issue.assigned`'s `actorId` is the person making the change, not the new assignee,
   unless they are the same person.
3. Self-assignment still emits the event; there is no special-cased suppression for
   assigning to oneself.

### REQ-068 — Only the changed fields are reported on issue.updated

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-066, REQ-067, DES-071
- **Implemented by:** `src/server/services/issue-service.ts` — `updateIssue`
- **Verified by:** `tests/services/issue-service.test.ts`

`updateIssue` diffs the incoming patch against the current row and includes only the fields
that actually changed in the `issue.updated` payload, rather than the full before/after
issue. This keeps activity-feed summaries specific ("changed description") instead of
generic ("issue updated"), and avoids the payload bloat of shipping an entire issue record
on every minor edit.

**Acceptance criteria**

1. Updating only the `description` field produces an `issue.updated` payload naming
   `description` and no other field.
2. A no-op update (patch identical to current values) either emits no event or an
   empty-changed-fields event that downstream consumers treat as a no-op; it must not appear
   as a substantive change in the activity feed.
3. Status and assignee changes routed through their dedicated events (`REQ-066`, `REQ-067`)
   are not also duplicated in `issue.updated`'s changed-field list when they arrive via
   `changeIssueStatus`/`assignIssue` rather than `updateIssue`.

### REQ-069 — Issues may carry a due date

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-070, REQ-012
- **Implemented by:** `src/schemas/issue.ts`, `src/lib/date.ts` — `isOverdue`
- **Verified by:** `tests/schemas/issue.schema.test.ts`, `tests/lib/date.test.ts`

`dueAt` is a nullable `IsoTimestamp` field on the issue, settable through `createIssue` or
`updateIssue`. It is the input `isOverdue()` in `src/lib/date.ts` and the overdue sweep job
both key off; an issue with no due date is by definition never overdue.

**Acceptance criteria**

1. `dueAt` is optional on creation and clearable (settable back to `null`) on update.
2. `dueAt` accepts any valid `IsoTimestamp`, past or future — Taskflow does not reject a due
   date in the past at write time, since backfilling overdue work is a legitimate use.
3. Clearing `dueAt` on an issue already flagged overdue removes it from future overdue
   sweeps.

### REQ-070 — Overdue issues are detected by a scheduled sweep

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-069, REQ-111, ADR-016

`runOverdueIssueJob(now)` in `src/server/jobs/overdue-issue-job.ts` calls
`listOverdueIssues(orgId, now)` per organization and emits `issue.overdue` for each newly
overdue issue, on the `overdue-issues` cadence (every 60 minutes per `CADENCE_MINUTES`).
Overdue status is not stored as a persistent flag on the issue row; it is a derived
computation the job repeats each tick, filtered through `shouldFilterArchived` so an archived
issue past its due date is never reported overdue.

**Acceptance criteria**

1. The job only considers non-archived issues with a non-null `dueAt` in the past relative
   to `now`.
2. Re-running the job within the same hour does not emit a duplicate `issue.overdue` for an
   issue already reported overdue in a prior tick within the same cadence window.
3. Archiving an issue removes it from subsequent overdue sweeps immediately.

**Implemented by:** `src/server/jobs/overdue-issue-job.ts`
**Verified by:** `tests/jobs/overdue-issue-job.test.ts`

### REQ-071 — Issues are archived, not deleted, by default

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-004, REQ-046, REQ-073
- **Implemented by:** `src/server/services/issue-service.ts` — `archiveIssue`, `src/lib/soft-delete.ts` — `shouldFilterArchived`
- **Verified by:** `tests/services/issue-service.test.ts`, `tests/lib/soft-delete.test.ts`

`archiveIssue` sets `archived_at` via `archivePatch()`; there is no `deleteIssue` in
`issue-service.ts` for interactive use, mirroring the project-level pattern (`REQ-048`).
`shouldFilterArchived` is applied by default across `listIssues`, `listBoardColumns` and
`countIssues`, so archived issues vanish from active work views while remaining fully
queryable with an explicit scope.

**Acceptance criteria**

1. `archiveIssue` never issues a `DELETE` statement.
2. `listIssues` without an explicit scope excludes archived issues.
3. `AlreadyArchivedError` is thrown, not silently ignored, when archiving an already-archived
   issue twice.

### REQ-072 — Authors and assignees may edit an issue they do not otherwise own

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-026, ADR-003
- **Implemented by:** `src/lib/permissions.ts` — `can`
- **Verified by:** `tests/lib/permissions.ownership.test.ts`

This is the issue-specific instance of the ownership-escalation rule defined generally in
`REQ-026`: `issue:update` and `issue:archive` are granted to the issue's author or its
current assignee even when their role rank alone would not clear the matrix minimum. It
means a `member` newly demoted to a role that could no longer create new issues still
retains control over issues already assigned to or authored by them, until an `admin`
explicitly reassigns that work.

**Acceptance criteria**

1. `can(actor, 'issue:update', issue)` is `true` when `actor.userId` equals `issue.authorId`
   or `issue.assigneeId`, regardless of role.
2. The same escalation applies to `issue:archive`.
3. Escalation does not extend to `issue:delete`, which stays admin-only (`REQ-073`)
   irrespective of authorship.

### REQ-073 — Issue deletion requires admin

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-024, REQ-072
- **Implemented by:** `src/lib/permissions.ts` — `ROLE_MATRIX`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`issue:delete`'s `ROLE_MATRIX` minimum is `admin`, one of the few issue actions ownership
escalation does not reach (`REQ-072`). As with projects and organizations, there is no
interactive hard-delete Server Action for issues today — permanent removal only happens
through the retention cleanup job once an archived issue passes the plan's retention window.

**Acceptance criteria**

1. A `member` who authored an issue still cannot permanently delete it, only archive it.
2. `issue:delete`'s matrix entry exists and is exercised by
   `tests/lib/permissions.matrix.test.ts` even though no current action exposes it directly.
3. The only code path that removes an issue row entirely is the retention cleanup job.

### REQ-074 — Issues carry organization labels

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-013, DES-100
- **Implemented by:** `src/server/repositories/label-repository.ts` — `setIssueLabels`, `listLabelsForIssues`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`setIssueLabels(orgId, issueId, labelIds)` attaches labels from the organization-wide label
set (`REQ-013`) to an issue; `listLabelsForIssues` batches the reverse lookup for list and
board views so rendering a page of issues does not issue one label query per row.

**Acceptance criteria**

1. A label id from a different organization cannot be attached to an issue (enforced by the
   `orgId`-scoped label lookup before `setIssueLabels` writes the join rows).
2. `listLabelsForIssues` returns a map keyed by issue id, even for issues with zero labels
   (an empty array, not a missing key).
3. Deleting a label detaches it from every issue that referenced it (see `REQ-013`).

### REQ-075 — Issue attachments are counted against the storage quota

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-132, ADR-010
- **Implemented by:** `src/server/services/attachment-service.ts` — `addAttachment`, `src/server/repositories/attachment-repository.ts` — `sumStorageBytes`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`attachment-service.ts#addAttachment` calls `wouldExceedLimit(plan, 'storageMb', used)`
before `attachment-repository.ts#insertAttachment` runs, where `used` comes from
`sumStorageBytes(orgId)` converted to megabytes. Attachments are metadata rows in this
codebase — actual byte storage is out of scope for the corpus's fictional backend — but the
size accounting they carry is real and is what the quota check reads.

**Acceptance criteria**

1. Adding an attachment that would push `storageMb` over the plan's limit fails with
   `plan_limit_exceeded`.
2. `sumStorageBytes` reflects only attachments belonging to the requesting org.
3. Removing an attachment (`removeAttachment`) frees the storage it held for subsequent
   quota checks.

### REQ-076 — Moving an issue between projects renumbers it

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-061, REQ-042
- **Implemented by:** `src/server/services/issue-service.ts` — `moveIssue`
- **Verified by:** `tests/services/issue-service.test.ts`

`moveIssue` calls `nextIssueNumber` for the destination project and assigns the issue a new
number there, since issue numbers are scoped per project (`REQ-061`) and a number from the
source project could already be taken in the destination. The issue keeps its identity
(`IssueId`) and history; only its display number and `issueKey` prefix change.

**Acceptance criteria**

1. After `moveIssue`, the issue's number is unique within the destination project.
2. The issue's old number is not reassigned to a new issue in the source project
   afterward, consistent with `REQ-061`'s never-reused guarantee.
3. `moveIssue` emits `issue.updated` reporting the `projectId` change, so search and
   activity stay consistent with the new location.

### REQ-077 — Issue listings support filtering by status, assignee and label

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-062, REQ-074, DES-100
- **Implemented by:** `src/server/repositories/issue-repository.ts` — `listIssues`, `listIssuesWithRelations`
- **Verified by:** `tests/repositories/issue-repository.test.ts`, `tests/components/issue-filter-params.test.ts`

`IssueFilterInput` accepts status, assignee and label filters, consumed by
`listIssues`/`listIssuesWithRelations`. These three are the filters the board view and the
list view both build their query-string state around, since they are the axes teams actually
triage by day to day.

**Acceptance criteria**

1. Combining status, assignee and label filters in one call applies them conjunctively
   (AND), not disjunctively.
2. An empty filter set returns the same result as `listIssues` with no filter object.
3. Filtering by a label id from another org returns an empty page rather than erroring.

### REQ-078 — Issue listings are paginated by keyset cursor

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-052, ADR-008
- **Implemented by:** `src/server/repositories/issue-repository.ts` — `listIssues`, `src/server/repositories/base-repository.ts` — `encodeCursor`, `decodeCursor`
- **Verified by:** `tests/repositories/issue-repository.test.ts`

Issue lists use the same keyset-cursor pattern as project lists (`REQ-052`), for the same
reason: issue lists are the highest-churn lists in the product (statuses and assignees
change constantly), and offset pagination would be the first thing to visibly break under
that churn.

**Acceptance criteria**

1. `listIssues`'s cursor round-trips through `encodeCursor`/`decodeCursor` without loss.
2. A filtered listing (`REQ-077`) paginates correctly — the cursor encodes position within
   the filtered result set, not the unfiltered one.
3. `MAX_PAGE_SIZE` from `src/config/constants.ts` bounds the requested page size regardless
   of what the caller asks for.

### REQ-079 — Issue export produces CSV when the plan includes it

- **Priority:** could
- **Status:** implemented
- **Related:** REQ-230, ADR-010, DES-110
- **Implemented by:** `src/lib/csv.ts` — `toCsv`, `src/app/api/export/issues/route.ts`
- **Verified by:** `tests/lib/csv.test.ts`

CSV export of an issue list is gated by the `csv_export` flag (`starter` plan minimum,
overridable), evaluated before `toCsv()` in `src/lib/csv.ts` runs. Export reuses the same
filter shape as `REQ-077` so "export what I'm currently looking at" is literally the same
query as the listing, not a separately maintained export-specific filter path.

**Acceptance criteria**

1. A `free`-plan org without the flag override receives `FeatureDisabledError`, mapped to
   `feature_disabled`-shaped `AppErrorShape`, when attempting export.
2. Exported CSV columns match the fields visible in the corresponding list view.
3. `toCsv` output round-trips through `escapeCsvValue` for any title or description
   containing a comma, quote or newline (`REQ-230`).
