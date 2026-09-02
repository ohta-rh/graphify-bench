---
title: Comments and attachments
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-090, REQ-091, REQ-092, REQ-093, REQ-094, REQ-096, REQ-097, REQ-098, REQ-100, REQ-101, REQ-102, REQ-075, ADR-004, ADR-006, ADR-008, DES-ISSUES-REPO, DES-COMMENT]
---

## Purpose

This file documents `comments` (declared in `src/server/db/schema/comments.ts`) and
`attachments` (declared in `src/server/db/schema/issues.ts`, alongside `issues`, `labels` and
`issue_labels` — its schema-file placement does not match this dictionary's file split, and
this dictionary follows the assigned documentation split rather than the schema file
boundary). Both tables hang off `issues`: every comment and every attachment names an
`issue_id`, and neither table has any existence independent of an issue.

## `comments`

**Drizzle export:** `comments` in `src/server/db/schema/comments.ts`
**Soft delete:** yes (`archived_at`)
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `CommentId` |
| `org_id` | TEXT | no | — | denormalized alongside `issue_id`, per ADR-006 |
| `issue_id` | TEXT | no | — | typed `IssueId`; REQ-090 |
| `author_id` | TEXT | no | — | typed `UserId` |
| `body` | TEXT | no | — | restricted Markdown subset, REQ-091 |
| `parent_id` | TEXT | yes | — | typed `CommentId`; builds reply threads within one issue |
| `edited_at` | TEXT | yes | — | null until the author edits; REQ-097/REQ-102 |
| `mentioned_user_ids` | TEXT | no | `'[]'` | JSON array of `UserId`, "kept denormalised for the mention fan-out" per the schema file's own comment |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |
| `archived_at` | TEXT | yes | — | REQ-098, deletion is a soft delete |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `comments_org_issue_idx` | `org_id, issue_id` | no | the thread-loading query, `listThread`/`listComments` |
| `comments_org_archived_idx` | `org_id, archived_at` | no | default listings excluding archived comments, REQ-101 |

**Invariants**

- **A comment is never physically removed even after archiving (REQ-098), specifically
  because removing it would orphan any reply still pointing at it via `parent_id`** — this is
  the one piece of schema-design reasoning stated directly in `repository-issue-and-comment.md`
  (DES-ISSUES-REPO) and repeated here because it is the clearest justification in the whole
  corpus for why a *specific* table needs soft delete rather than hard delete: the `parent_id`
  self-reference makes hard deletion structurally unsafe, not merely undesirable.
- **`mentioned_user_ids` is denormalized JSON, not a join table**, unlike `issue_labels`'s
  normalized many-to-many shape for issue/label associations. The schema file's own comment
  explains why: it exists specifically "for the mention fan-out" — reading which users were
  mentioned in a comment to generate notifications (REQ-095) is a single-row read against this
  column, not a join, because that read happens on the comment-creation hot path.
- **Mentions are parsed at write time, not read time (REQ-092)**, and mentions inside code
  spans/fences are excluded (REQ-093) — both are `src/lib/mentions.ts` parsing rules applied
  before `insertComment` writes `mentioned_user_ids`, not something this column's shape alone
  enforces; a caller that bypassed the parser could write an arbitrary JSON array here.
- **Editing a comment re-parses its mentions (REQ-102)** — `updateComment`'s effect on
  `mentioned_user_ids` is not a passthrough of the caller's input; the mention set is
  recomputed from the new `body` the same way it was on creation, keeping the denormalized
  column consistent with the text it describes.
- **Mentioned users must already be members of the organization (REQ-094)** — enforced by
  `CommentService` cross-checking parsed mentions against `members` before persisting, not by
  any constraint this table's columns express.
- **Comment creation is rate limited per organization (REQ-096)** — via `rate_limit_buckets`
  (`tables-webhooks-search-and-infra.md`), a table entirely separate from `comments` itself;
  the rate limit is checked before `insertComment` runs, not enforced by anything in this
  table's own shape.

**Read and write paths**

`src/server/repositories/comment-repository.ts`: `findCommentById`, `listComments` (keyset-
paginated, archive-filtered by default per REQ-101), `listThread` (full thread for one issue,
un-paginated, archived comments included — REQ-100's creation-time ordering applies here),
`countComments`, `insertComment`, `updateComment`, `archiveComment`. `CommentService` is the
sole caller, and it is also the layer that calls `src/lib/mentions.ts` and
`src/lib/markdown.ts` (REQ-091's restricted subset) before any write.

**Notes**

The contrast between `listComments` (paginated, filtered) and `listThread` (full, unfiltered)
is deliberate and worth understanding as a pair: a comment *list* view (say, a recent-activity
feed spanning many issues) needs pagination and normally shouldn't show archived comments, but
a single issue's comment *thread* view needs every comment including archived ones, because
REQ-100's creation-time ordering and the reply-chain structure via `parent_id` both depend on
the full, unbroken sequence being visible — a thread with a silently-missing archived comment
in the middle would break the visual thread structure a reader expects, even if that comment's
own content is hidden or shown as "deleted."

## `attachments`

**Drizzle export:** `attachments` in `src/server/db/schema/issues.ts`
**Soft delete:** no — hard deleted; the schema file's own comment calls this out explicitly:
"there is no soft-delete story for bytes that no longer exist"
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `AttachmentId` |
| `org_id` | TEXT | no | — | denormalized alongside `issue_id`, per ADR-006 |
| `issue_id` | TEXT | no | — | typed `IssueId` |
| `filename` | TEXT | no | — | original filename |
| `content_type` | TEXT | no | — | MIME type |
| `size_bytes` | INTEGER | no | — | feeds the storage quota, REQ-075 |
| `uploaded_by` | TEXT | no | — | typed `UserId` |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `attachments_org_issue_idx` | `org_id, issue_id` | no | the per-issue attachment list, `listAttachments` |

**Invariants**

- **Hard delete, uniquely among tenant-scoped content tables in this schema.** `deleteAttachment`
  physically removes the row. This table stores metadata about the attachment (filename,
  content type, size), not the bytes themselves — the bytes' actual storage location is outside
  this schema's scope, and a hard-deleted row is consistent with there being no soft-delete
  story for content that has genuinely been removed from wherever the bytes live.
- **Attachment storage counts against the org's `storageMb` quota (REQ-075), a quota separate
  from `issuesPerProject` or `seats`.** `sumStorageBytes(orgId)` sums `size_bytes` across every
  live row for the org — since there is no `archived_at` on this table, "live" here just means
  "not yet hard-deleted," and the sum is exact rather than an archived-vs-live distinction.
- No column here records anything about virus scanning, content validation, or storage
  location — this table is purely metadata bookkeeping plus a size figure for quota purposes;
  any such concerns belong to whatever service actually persists the bytes, which is outside
  the scope of this schema.

**Read and write paths**

`src/server/repositories/attachment-repository.ts`: `listAttachments`, `insertAttachment`,
`deleteAttachment`, `sumStorageBytes`. `AttachmentService` and `IssueService` are the callers —
`AttachmentService` is the write path (upload and delete), and `sumStorageBytes` specifically
feeds `BillingService`'s quota checks, per this table's own repository file comment noting it
"feeds `storageMb` quota via `BillingService`."

**Notes**

`attachments` is the schema's clearest example of a table where the ADR-004 soft-delete
default was deliberately *not* applied, and the reasoning is worth restating precisely because
it is easy to assume every content table in this schema follows the same archive-not-delete
pattern: soft delete exists to preserve recoverability and audit-trail resolvability for rows
that still mean something once flagged as archived, and a byte range that has actually been
removed from storage has nothing left to recover by flipping a timestamp back to null — keeping
a metadata row around for bytes that no longer exist would be actively misleading rather than
merely unnecessary.

## Reading `comments` and `attachments` together against one issue

Both tables answer to the same `issue_id`, and it is worth being explicit about how a single
issue's full comment-and-attachment picture is assembled, since no single repository function
across either table returns both. `listIssuesWithRelations` in `issue-repository.ts` — covered
in `tables-issues.md` — adds comment and attachment *counts* to a page of issues (cheap
aggregates, not the rows themselves), which is what an issue list or board view needs to show
a small "3 comments, 1 attachment" affordance without loading either table's full content.
Opening a single issue's detail view is a different, heavier read: `listThread` against
`comments` for the full ordered conversation, and `listAttachments` against `attachments` for
the file list, run as two separate repository calls rather than one joined query — consistent
with this schema having no SQL-level foreign keys to join across in the first place (see
`conventions.md`), and with `IssueService`/`CommentService`/`AttachmentService` being three
separate services per ADR-013's boundary, each responsible for its own table's read path.

This split also explains why `comments_org_issue_idx` and `attachments_org_issue_idx` are
shaped identically (`org_id, issue_id`) despite backing two structurally different tables — the
access pattern driving both is the same: "give me everything of this kind attached to this
specific issue," scoped first by tenant. Neither index needs to include `archived_at` or any
other trailing column the way `issues_org_status_idx` does, because loading a single issue's
full thread or attachment list is not itself a filtered, paginated query the way a cross-issue
listing is — `listThread` intentionally returns every comment for the issue, archived or not,
in one unpaginated read, and `listAttachments` has no archive state to filter in the first
place.

A last point worth making explicit: neither table stores a reference back to `projects` or
`organizations` beyond the denormalized `org_id` every tenant-scoped table carries. Resolving
"which project does this comment ultimately belong to" requires reading the `comments` row's
`issue_id`, then the corresponding `issues` row's `project_id` — a two-hop lookup exactly of
the kind ADR-006 chose to make unnecessary for tenant scoping specifically (`org_id` answers
that question in one column read) while leaving the project-level hop as a genuine join,
because project scoping was never judged as safety-critical as tenant scoping in the first
place; a comment leaking across projects within the same organization is a lesser incident than
one leaking across organizations entirely.

For a reader tracing a specific bug report — "a comment shows the wrong mention" or "an
attachment did not count against storage" — the practical implication is to check the two
tables' repository functions in the order a request would actually touch them: a mention bug
almost always traces back to `src/lib/mentions.ts`'s parsing running against `body` at
`insertComment`/`updateComment` time (REQ-092/REQ-102), not to `mentioned_user_ids` itself,
since that column only ever holds whatever the parser most recently produced. A storage-quota
bug almost always traces back to `sumStorageBytes` being called against stale data, or to a
`deleteAttachment` call that removed the row without the corresponding
`organization_usage.storageMbUsed` decrement running — the two tables covered in this file
never disagree about their own contents, but the aggregate figures other tables derive from
them can.
