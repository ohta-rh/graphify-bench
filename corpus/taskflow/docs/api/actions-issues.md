---
title: Issue actions
id: API-ACTIONS-ISSUES
status: approved
owners: [m.lindqvist]
last_updated: 2026-05-28
related: [REQ-060, REQ-061, REQ-064, REQ-066, DES-100, DES-101, DES-226, ADR-021]
---

# Issue actions

Six files under src/actions/issues/, the largest single action group in the corpus:
create, update, archive, assign, change status, and move (the board drag-and-drop target).
All six go through `withAction()`. Five of the six use `PENDING_PROJECT_ID` as a placeholder
in their `can()` call because they act on an issue whose `projectId` the action has not
fetched; `archiveIssueAction` is the exception, because it fetches the current issue first
for an unrelated reason (checking it is not already archived) and so has the real
`projectId` on hand anyway.

## `createIssueAction`

- **File:** `src/actions/issues/create-issue.ts`
- **Input schema:** `createIssueSchema` (`src/schemas/issue.ts`) — `CreateIssueInput`
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:create` (minimum role member; see DES-043)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** `issuesPerProject`
- **Events emitted:** `issue.created` (via `createIssue()`)
- **Cache tags revalidated:** `orgTag(input.orgId)`, `projectTag(input.projectId)`,
  `issueTag(issue.id)`, `CACHE_PROFILES.minutes`
- **Errors:** `validation_failed`, `forbidden`, `plan_limit_exceeded`, `internal_error`
- **Satisfies:** REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-065
- **Design:** DES-101, DES-229

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `projectId` | branded `ProjectId` | yes | |
| `title` | string, 3-200 | yes | |
| `description` | string, max 20000, or `null` | no, default `null` | |
| `status` | closed enum, 6 values | no, default `"backlog"` | `issueStatusSchema` — `backlog`, `todo`, `in_progress`, `in_review`, `done`, `canceled` |
| `priority` | closed enum, 5 values | no, default `"none"` | `issuePrioritySchema` — `none`, `low`, `medium`, `high`, `urgent` |
| `assigneeId` | branded `UserId` or `null` | no, default `null` | |
| `parentId` | branded `IssueId` or `null` | no, default `null` | sub-issue relation |
| `estimate` | integer 0-100, or `null` | no, default `null` | |
| `dueAt` | ISO timestamp or `null` | no, default `null` | |
| `labelIds` | array of branded `LabelId`, max 20 | no, default `[]` | |

### Behaviour

DES-101: issue creation gates on four things before a number is allocated — permission,
project quota, and (at the schema/service layer) that `status` and `priority` are valid
closed-vocabulary values. `assertProjectHasRoom()`, a private helper in this action file,
reads `getOrganizationSummary()` for the plan's `issuesPerProject` limit, then calls
`listIssues(actor, { projectId, limit: 1, includeArchived: true })` purely to read its
`total` field, and compares that against the limit. DES-229: the count deliberately
includes archived issues, matching the project quota's own convention (DES-233) — the same
"a restore must never be the operation that breaches a limit" reasoning applies, since an
issue's own archive/restore actions do not re-run this creation-time check. Only after the
quota check passes does `createIssue()` run and allocate the next sequential number within
the project — REQ-061's per-project, never-reused numbering, implemented at the repository
layer (DES-183) as a read-then-write that this action does not itself participate in beyond
calling the service.

## `updateIssueAction`

- **File:** `src/actions/issues/update-issue.ts`
- **Input schema:** `updateIssueSchema` (`src/schemas/issue.ts`) — `UpdateIssueInput`
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:update` (minimum role member, with author/assignee escalation; see
  DES-041)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** `issue.updated` with `changedFields` (via `updateIssue()`)
- **Cache tags revalidated:** `issueTag(issue.id)`, `CACHE_PROFILES.seconds`
- **Errors:** `validation_failed`, `forbidden`, `internal_error`
- **Satisfies:** REQ-068, REQ-072, REQ-074
- **Design:** DES-102, DES-231

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `issueId` | branded `IssueId` | yes | |
| `title` | string, 3-200 | no | |
| `description` | string, max 20000, or `null` | no | |
| `priority` | closed enum | no | |
| `estimate` | integer 0-100, or `null` | no | |
| `dueAt` | ISO timestamp or `null` | no | |
| `labelIds` | array of branded `LabelId`, max 20 | no | |

### Behaviour

`can(actor, "issue:update", { ..., authorId: actor.userId, assigneeId: actor.userId })`
looks unusual on first read — both `authorId` and `assigneeId` are set to the *caller's own*
id, not the issue's actual author and assignee, because this action never fetched the
current row before checking permission. REQ-072 (authors and assignees may edit an issue
they do not otherwise own) is an ownership escalation evaluated inside `can()` by comparing
the resource's `authorId`/`assigneeId` fields against `actor.userId` — passing the actor's
own id in both fields as a stand-in is a shortcut that produces the correct answer only
because the escalation logic is a simple equality check: if the actor happens to be the real
author or assignee, this comparison against itself trivially succeeds and reproduces the
right permission grant, and if the actor is neither, the placeholder is irrelevant because
the base role-matrix check (member-minimum for `issue:update`) already decides the outcome
without needing the ownership fields at all. It works, but it means this call site cannot
correctly express "the caller is asking to update an issue authored by someone else, and is
relying on their member rank rather than an escalation" versus any other case — both paths
converge on the same `can()` outcome regardless.

DES-231: `updateIssueAction` is a partial patch — only fields present in the parsed input
reach `updateIssue()`, which is why every field above is optional with no default. DES-102
at the service layer: `updateIssue` reports exactly the fields the caller changed via
`issue.updated`'s `changedFields` payload, rather than a full snapshot, which is what lets
the activity log describe "changed priority from medium to high" instead of "updated the
issue" with no detail.

## `archiveIssueAction`

- **File:** `src/actions/issues/archive-issue.ts`
- **Input schema:** `archiveIssueSchema` (`src/schemas/issue.ts`)
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:archive` (minimum role member, with author/assignee escalation)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** `issue.archived` (via `archiveIssue()`)
- **Cache tags revalidated:** `issueTag(issue.id)`, `projectTag(issue.projectId)`,
  `CACHE_PROFILES.minutes`
- **Errors:** `validation_failed`, `forbidden`, `conflict`, `internal_error`
- **Satisfies:** REQ-071, REQ-073
- **Design:** DES-226

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `issueId` | branded `IssueId` | yes | |

### Behaviour

DES-226: `archive-issue` re-fetches the current row before deciding anything, via
`getIssue(actor, input.orgId, input.issueId)` — the one action in this group that reads
before it authorizes, because the ownership escalation for `issue:archive` genuinely needs
the *real* `authorId` and `assigneeId`, not a placeholder, to correctly decide whether a
non-member-rank caller who happens to be the author or assignee should be let through.
`assertNotArchived("issue", input.issueId, current.issue)` then throws `AlreadyArchivedError`
(mapped to `conflict`) rather than silently re-stamping `archived_at` — the archive
operation is not idempotent by design, so calling it twice is treated as a caller error
worth surfacing, not a no-op to swallow.

## `assignIssueAction`

- **File:** `src/actions/issues/assign-issue.ts`
- **Input schema:** `assignIssueSchema` (`src/schemas/issue.ts`) — `AssignIssueInput`
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:assign` (minimum role member; see DES-043)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** `issue.assigned` with the previous assignee (via `assignIssue()`)
- **Cache tags revalidated:** `issueTag(issue.id)`, `CACHE_PROFILES.seconds`
- **Errors:** `validation_failed`, `forbidden`, `internal_error`
- **Satisfies:** REQ-067
- **Design:** DES-105, DES-227

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `issueId` | branded `IssueId` | yes | |
| `assigneeId` | branded `UserId` or `null` | yes (nullable, not optional) | `null` unassigns; the field must be present either way |

### Behaviour

DES-227: `assign-issue` checks permission with `PENDING_PROJECT_ID`, then delegates the real
assignment logic to the service — the action itself does no further validation once the
`can()` check passes, including no check that `assigneeId` (when non-null) is actually a
member of the organization; that validation, if any, lives at the service or repository
layer. `assigneeId` is typed nullable rather than optional in the schema specifically so
"clear the assignment" (`assigneeId: null`) and "leave it alone" (field omitted, which the
schema does not even allow here — it is required) cannot be confused; the source comment
calls this out directly. DES-105: assignment is a separate permission from `issue:update`,
and un-assigning degrades to emitting `issue.updated` rather than `issue.assigned` at the
service layer — `issue.assigned` per REQ-067 always carries the previous assignee, which
only makes sense when there is a new assignee to report the change *to*; clearing an
assignment has no "new assignee" to notify.

## `changeIssueStatusAction`

- **File:** `src/actions/issues/change-issue-status.ts`
- **Input schema:** `changeIssueStatusSchema` (`src/schemas/issue.ts`) —
  `ChangeIssueStatusInput`
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:update` (minimum role member, with author/assignee escalation)
- **Feature flag:** none
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** `issue.status_changed` (via `changeIssueStatus()`)
- **Cache tags revalidated:** `issueTag(issue.id)`, `projectTag(issue.projectId)`,
  `CACHE_PROFILES.seconds`
- **Errors:** `validation_failed`, `forbidden`, `internal_error`
- **Satisfies:** REQ-062, REQ-066
- **Design:** DES-103, DES-228

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `issueId` | branded `IssueId` | yes | |
| `status` | closed enum, 6 values | yes | `issueStatusSchema` |

### Behaviour

DES-228: emission is deliberately left to the service — the action calls
`changeIssueStatus()` and revalidates on return, and every downstream effect of a status
change (notification fan-out, search reindex, activity log entry) hangs off the
`issue.status_changed` event the service emits, not off anything this action file does
directly. DES-103 at the service layer: status transitions are validated against the closed
status union and are idempotent no-ops when unchanged — setting a `todo` issue to `todo`
again succeeds without emitting a second event, so a client that re-submits the same status
(a common outcome of a slow network retry) does not produce a duplicate activity-log entry
or a duplicate notification.

## `moveIssueAction`

- **File:** `src/actions/issues/move-issue.ts`
- **Input schema:** `moveIssueSchema` (`src/schemas/issue.ts`) — `MoveIssueInput`
- **Returns:** `ActionResult<Issue>`
- **Permission:** `issue:update` (minimum role member, with author/assignee escalation)
- **Feature flag:** `kanban_board` (plan >= starter, overridable)
- **Rate limit bucket:** none
- **Plan limit:** none
- **Events emitted:** whatever `moveIssue()` → `changeIssueStatus()` path emits (status
  change semantics, since a board move is a status change)
- **Cache tags revalidated:** `issueTag(issue.id)`, `projectTag(issue.projectId)`,
  `CACHE_PROFILES.seconds`
- **Errors:** `validation_failed`, `forbidden`, `internal_error` (feature-gated failure
  reports as `forbidden` via `FeatureUnavailableError`)
- **Satisfies:** REQ-066
- **Design:** DES-104, DES-230

### Input fields

| field | type | required | notes |
|---|---|---|---|
| `orgId` | branded `OrgId` | yes | |
| `issueId` | branded `IssueId` | yes | |
| `toStatus` | closed enum, 6 values | yes | destination board column |
| `toIndex` | integer, min 0 | yes | position within the column |

### Behaviour

DES-230: `move-issue` re-validates the `kanban_board` flag server-side against a client that
only has a snapshot — the board UI reads its own copy of the flag evaluation from
`getSnapshot()` (DES-176) when it decides whether to render drag-and-drop at all, but that
snapshot can be stale by the time a drag completes, so the action independently calls
`getOrganizationSummary()`, builds a fresh `FlagContext` with `buildFlagContext()`, and
checks `isEnabled("kanban_board", context)` itself, throwing `FeatureUnavailableError` if it
now evaluates to off. DES-104: **board drag-and-drop is a status change plus a touch, not a
persisted order** — `toIndex` is accepted by the schema and reaches `moveIssue()`, but there
is no `order` or `position` column in the issue schema for it to be written into; the
service uses `toStatus` to perform the actual status change and the position within a column
is not durably stored, which means a page reload after a move can show issues within a
column in a different relative order than the drag left them in. The action's own comment is
explicit about the reconciliation model this implies: the client has already moved the card
optimistically via `useOptimisticIssues` before this action even runs, so the only thing
that matters on return is the authoritative row — the hook reconciles against it and snaps
the card back if the move was refused, rather than this action needing to report anything
about ordering.

Related: REQ-069, REQ-070, REQ-075, REQ-076, REQ-077, REQ-078, REQ-079, DES-041, DES-106,
DES-107, DES-180, DES-181, DES-182, DES-183, DES-184, ADR-008, ADR-021.
