---
title: Issues
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-060, REQ-061, REQ-062, REQ-063, REQ-064, REQ-069, REQ-070, REQ-071, REQ-074, REQ-076, REQ-077, REQ-078, ADR-004, ADR-006, ADR-008, ADR-021, DES-183, DES-184]
---

## Purpose

This file documents `issues`, `labels`, and `issue_labels`, all declared in
`src/server/db/schema/issues.ts`. Issues are the widest query surface in the schema by
function count (`issue-repository.ts` exports twenty functions) because they carry more
independently-filterable dimensions — status, priority, assignment, labels, due date,
parent/child, archive state — than any other entity, and the board, list, and CSV export
views (REQ-079) all read the same rows through different shapes. `attachments`, which also
belongs conceptually to an issue, is documented in `tables-comments-and-attachments.md`
rather than here, following this corpus's file split.

## `issues`

**Drizzle export:** `issues` in `src/server/db/schema/issues.ts`
**Soft delete:** yes (`archived_at`)
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `IssueId` |
| `org_id` | TEXT | no | — | denormalized alongside `project_id`, per ADR-006 |
| `project_id` | TEXT | no | — | typed `ProjectId`; REQ-060, an issue belongs to exactly one project |
| `number` | INTEGER | no | — | per-project sequential number, never reused, REQ-061 |
| `title` | TEXT | no | — | |
| `description` | TEXT | yes | — | |
| `status` | TEXT | no | `'backlog'` | enum: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `canceled` (REQ-062) |
| `priority` | TEXT | no | `'none'` | enum: `none`, `low`, `medium`, `high`, `urgent` (REQ-063) |
| `author_id` | TEXT | no | — | typed `UserId`; REQ-072's "authors ... may edit" grants |
| `assignee_id` | TEXT | yes | — | typed `UserId`; null means unassigned |
| `parent_id` | TEXT | yes | — | typed `IssueId`; one level of subtask nesting |
| `estimate` | INTEGER | yes | — | story-point-style effort estimate |
| `due_at` | TEXT | yes | — | REQ-069, optional due date |
| `started_at` | TEXT | yes | — | set when status first reaches `in_progress`; maintained by `setIssueStatus` |
| `completed_at` | TEXT | yes | — | set when status reaches `done`/`canceled`; maintained by `setIssueStatus` |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |
| `archived_at` | TEXT | yes | — | REQ-071, archived rather than deleted by default |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `issues_project_number_idx` | `project_id, number` | yes | REQ-061's per-project, never-reused numbering |
| `issues_org_status_idx` | `org_id, status` | no | the board view's grouping predicate (`listBoardColumns`) |
| `issues_org_assignee_idx` | `org_id, assignee_id` | no | "my issues" and assignee-filtered listings, REQ-077 |
| `issues_org_archived_idx` | `org_id, archived_at` | no | default live-only listings and the quota count over all rows |
| `issues_org_due_idx` | `org_id, due_at` | no | REQ-070's overdue sweep (`listOverdueIssues`) |

**Invariants**

- **Numbers are allocated per project, monotonically, never reused (REQ-061).**
  `nextIssueNumber` computes `max(number) + 1` over every row in the project — including
  archived ones, since the unique index and the never-reused guarantee both need to survive
  archiving. There is no separate sequence object; the max-plus-one read happens at insert
  time inside the same logical operation as `insertIssue`.
- **Moving an issue between projects renumbers it (REQ-076).** Because `number` is only unique
  within `(project_id, number)`, moving `project_id` to a different project requires computing
  a fresh `number` via `nextIssueNumber` against the destination project — the old number is
  not preserved, since preserving it could collide with an existing issue in the destination
  project. ADR-006's consequences section notes this move path also re-writes `org_id`
  explicitly on every affected row rather than assuming it was already correct, even though in
  practice the UI never offers a cross-org move.
- **`started_at`/`completed_at` are maintained by `setIssueStatus`, not by `updateIssue`
  generally** — a caller changing `status` through the dedicated `setIssueStatus` function gets
  these timestamps stamped automatically on the relevant transitions; a raw `updateIssue` patch
  that happens to include `status` is not documented as guaranteeing the same side effect,
  which is exactly why `setIssueStatus` exists as a separate, narrower function rather than
  every status change going through the general update path.
- **Only changed fields are reported on `issue.updated` (REQ-068)** — this is an event-payload
  shaping rule, not a column-level invariant, but it means the event bus consumer for issues
  cannot assume every `issue.updated` event carries a full row snapshot; it carries a diff.
- **Archived issues still count against the quota (REQ-064's issuesPerProject check reads
  `countIssues`, which — consistent with `conventions.md`'s general rule — counts all rows for
  the project regardless of `archived_at`.**
- **Attachments count against a separate quota (`storageMb`, REQ-075), not the issue quota** —
  the two limits are independent `PlanLimits` fields, checked by different code paths
  (`countIssues` vs. `sumStorageBytes` on `attachments`).

**Read and write paths**

`src/server/repositories/issue-repository.ts` (the widest repository in the schema):
`findIssueById`, `findIssueByNumber` (the URL-facing lookup, REQ-061), `listIssues` and
`listIssuesWithRelations` (keyset-paginated per REQ-078, the latter adding comment/attachment
counts), `listBoardColumns` (grouped by the fixed `ISSUE_STATUSES` order, full live set, not
paginated), `countIssues`, `nextIssueNumber`, `insertIssue`, `updateIssue`, `setIssueStatus`,
`setIssueAssignee`, `archiveIssue`/`restoreIssue`, `archiveIssuesForProject` (the cascade
behind REQ-045's project archive), `listOverdueIssues` (feeds REQ-070's scheduled sweep).
`IssueService` is the sole caller.

**Notes**

`issues` is the table ADR-021 (optimistic issue updates) is written about, though ADR-021
itself is a UI/client-state design decision more than a schema one — the schema's contribution
to making optimistic updates safe is that `updateIssue` accepts a partial patch and returns the
resulting row, so a client that has already rendered an optimistic change can reconcile against
the authoritative row the write actually produced. The board view (`listBoardColumns`) is
deliberately un-paginated — it loads every live issue in a project grouped by status, which is
a reasonable trade-off at the `issuesPerProject` quotas this schema's plans define (100 for
free, up to unlimited for enterprise) but is worth flagging as a design choice that assumes
board-sized projects stay within an order of magnitude the UI can render at once, rather than a
general list.

## `labels`

**Drizzle export:** `labels` in `src/server/db/schema/issues.ts`
**Soft delete:** no — labels are deleted outright (`deleteLabel`), not archived
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `LabelId` |
| `org_id` | TEXT | no | — | REQ-074, org-level, shared across all the org's projects |
| `name` | TEXT | no | — | |
| `color` | TEXT | no | `'#94a3b8'` | UI swatch |
| `description` | TEXT | yes | — | |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `labels_org_name_idx` | `org_id, name` | yes | prevents duplicate label names within an org |

**Invariants**

- **Labels are organization-scoped, not project-scoped (REQ-074, "issue carry organization
  labels").** This matches `organizations.ts`'s own comment on organization-level label
  sharing (REQ-013) — a label created in one project is immediately available on every other
  project in the same org, because there is no `project_id` column on this table at all.
- Deletion is hard, not soft — `deleteLabel` physically removes the row, unlike almost every
  other tenant-scoped entity in this schema. Removing a label in use presumably requires
  `issue_labels` rows referencing it to be cleaned up by the service layer, since there is no
  cascading delete at the database level (no `.references()` declared, per `conventions.md`).

**Read and write paths**

`src/server/repositories/label-repository.ts`: `listLabels`, `insertLabel`, `updateLabel`,
`deleteLabel`, `setIssueLabels` (replaces an issue's full label set in one call),
`listLabelsForIssues` (batch lookup used by `listIssues`/`listIssuesWithRelations` to decorate
a page of issues with their labels without an N+1 query per issue). `LabelService` and
`IssueService` are the callers — `IssueService` reads through `listLabelsForIssues` and writes
through `setIssueLabels`; `LabelService` owns the label CRUD itself.

## `issue_labels`

**Drizzle export:** `issueLabels` in `src/server/db/schema/issues.ts`
**Soft delete:** no
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `org_id` | TEXT | no | — | denormalized, per ADR-006 |
| `issue_id` | TEXT | no | — | typed `IssueId` |
| `label_id` | TEXT | no | — | typed `LabelId` |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `issue_labels_pk` | `issue_id, label_id` | yes | the join table's effective key — a label applies to an issue at most once |
| `issue_labels_org_idx` | `org_id` | no | tenant-scoped scans |

**Invariants**

- A pure many-to-many join table with no `id` column and no timestamps, structurally the same
  shape as `project_members` (`tables-projects.md`).
- `setIssueLabels` replaces an issue's entire label set in one call rather than exposing
  separate add/remove functions — the repository's public surface has no `addIssueLabel` or
  `removeIssueLabel`, only the full-replace shape, which keeps "what labels does this issue
  have right now" always answerable from a single write rather than requiring the caller to
  diff before and after states.

**Read and write paths**

Written and read exclusively through `label-repository.ts`'s `setIssueLabels` and
`listLabelsForIssues` — no other repository file touches this table directly, keeping the
issue/label many-to-many relationship's write path in one place.

## Why three tables instead of one

It would be structurally possible to fold `labels` into a JSON column on `issues` the same way
`comments.mentioned_user_ids` denormalizes mentions, and the schema's own precedent for
denormalizing small, frequently-read associations makes that a real alternative worth naming
explicitly rather than leaving implicit. The schema does not do this for labels, and the
difference from the mentions case is instructive: `mentioned_user_ids` exists to serve exactly
one read pattern (notification fan-out on comment creation, a write-time computation nobody
else needs to query against), where labels serve at least three independent read patterns that
each benefit from a normalized shape — filtering issue listings by label (REQ-077, which needs
an indexable, queryable association rather than a JSON array SQLite cannot efficiently filter
on), managing an org-wide label vocabulary independently of any single issue
(`LabelService`'s CRUD surface), and reusing the exact same label across every project in the
org (REQ-013/REQ-074). A denormalized JSON array on `issues` would make the first of those three
patterns — "find every issue tagged `bug`" — a full table scan with no usable index, which is
precisely the class of query `issues_org_status_idx` and friends exist to avoid for every other
filterable dimension on this table. The three-table shape (`issues`, `labels`, `issue_labels`)
costs one extra join-table row per issue-label pair and one composite unique index, in exchange
for keeping every label-filtered query as cheap as every other indexed filter this schema
supports. It is the same trade-off `project_members` (`tables-projects.md`) and `issue_labels`
make against each other for a different pair of concerns, and recognizing the pattern —
normalize when a column needs to be queried or filtered on, denormalize when it only needs to
be read back whole alongside its owning row — makes the rest of this schema's shape
predictable rather than case-by-case.
