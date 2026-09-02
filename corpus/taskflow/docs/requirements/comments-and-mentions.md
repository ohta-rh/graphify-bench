---
title: Comments and mentions requirements
id: REQ-COMMENTS
status: approved
owners: [product-team, m.lindqvist]
last_updated: 2026-04-27
related: [REQ-090, REQ-060, REQ-112, DES-110]
---

## Scope

This document defines the requirements for issue comments: creation, Markdown handling,
mention parsing and its resolution to organization members, rate limiting, editing and soft
delete, and thread ordering. It does not define the notification behavior a mention
triggers — that belongs to `notifications-and-digests.md` — though `REQ-095` and `REQ-112`
are the seam between the two documents and are cross-referenced in both places.

## Context

A comment belongs to exactly one issue and, through it, one organization; the schema is
`src/server/db/schema/comments.ts`, the repository is
`src/server/repositories/comment-repository.ts`, and the business rules live in
`src/server/services/comment-service.ts`. Comments are soft deleted (`archiveComment`) rather
than removed, consistent with `ADR-004`, which is what lets a deleted comment keep its
position in a thread — later comments that quote or reply to it still make sense in context
even after the original is gone.

Comment bodies are Markdown, but a restricted subset: `src/lib/markdown.ts#renderMarkdown`
implements a small renderer rather than pulling in a general-purpose Markdown library, which
bounds what a comment can actually do to the surface the product wants to support (bold,
italic, links, code spans and fences, lists) rather than the full CommonMark surface,
including anything that would need sanitization against arbitrary HTML.

Mentions are parsed from the comment body at write time by `src/lib/mentions.ts`:
`extractMentions` finds `@handle`-shaped tokens, and `resolveMentions` maps them against the
organization's member list to produce the `UserId`s the comment actually mentions — a
syntactic `@handle` that does not match any member of the same org resolves to nothing,
consistent with `REQ-094`. Because comment bodies contain code spans and fences that
routinely include `@` characters (email examples, npm scope references), `extractMentions`
excludes text inside backticks and fenced code blocks before it looks for mention syntax —
this is `REQ-093`, and it is the one part of mention parsing that most needs a real
Markdown-aware pass rather than a regex over raw text, which is exactly why it is
implemented against the same tokenizer `renderMarkdown` uses rather than as an independent
string search.

Comment creation goes through the `comment:create` rate-limit bucket
(`consumeRateLimit(orgId, 'comment:create', ...)`, capacity 60, refill 20/minute) before the
write happens, protecting the mention fan-out and the search index from a burst of automated
or accidental rapid-fire comments overwhelming downstream consumers in one moment.

Comment edits are not versioned: `updateComment` overwrites the stored body in place, so
there is no edit history a reader can inspect the way some issue-tracking products expose a
"show edit history" link. This is a deliberate simplicity trade-off — the team weighed a
comment-revision table early in the design and decided the audit trail's activity row
(`REQ-034`'s sibling for comments) was sufficient evidence of "this was edited and by whom
and when," without the storage and query cost of keeping every prior body around indefinitely.

## Open questions

1. `REQ-091`'s restricted Markdown subset has no requirement enumerating exactly which
   syntax is supported beyond what `renderMarkdown`'s implementation happens to accept —
   the requirements corpus intentionally treats this as an implementation detail rather than
   a frozen spec, which risks silent behavior drift across renderer changes.
2. `REQ-102` re-parses mentions on edit, but there is no requirement describing whether a
   removed mention should also remove or mark stale any notification already sent for it —
   see the related gap noted in `notifications-and-digests.md`.
3. Whether comment rate limiting (`REQ-096`) should scale with plan the way
   `apiRequestsPerHour` does, rather than using one fixed bucket for every plan, is
   unresolved.

### REQ-090 — Comments belong to an issue and an organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-060, REQ-010, DES-110

`comments` carries both `org_id` and `issue_id`; there is no organization-level or
project-level comment independent of a specific issue. `findCommentById(orgId, commentId)`
enforces the org scope on every lookup, and `listComments`/`listThread` additionally require
the `issueId` the caller is viewing.

**Acceptance criteria**

1. `insertComment` requires a valid, existing `issueId` within the same `orgId`.
2. A comment cannot be fetched across organizations even by a correct `commentId` guess.
3. Deleting the parent issue does not orphan comments into a queryable "issue-less" state —
   they are governed by the same archive cascade path as the issue itself.

### REQ-091 — Comment bodies are Markdown with a restricted subset

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-092, DES-100

`renderMarkdown` in `src/lib/markdown.ts` renders the subset the product supports; raw HTML
in a comment body is not passed through, and `stripMarkdown`/`excerpt` provide plain-text
projections used by notification previews and search snippets so those surfaces never leak
unrendered Markdown syntax to a reader.

**Acceptance criteria**

1. A comment body is stored as raw Markdown text, not pre-rendered HTML.
2. `renderMarkdown` output never includes an unescaped `<script>` or other raw HTML tag from
   the input.
3. `excerpt` truncates on a word boundary and does not cut a Markdown link or code span in
   half in a way that would break rendering of the truncated excerpt.

### REQ-092 — Mentions are parsed from the comment body at write time

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-095, REQ-112, DES-110

`extractMentions(body)` runs during `createComment` and `updateComment`, before the write
completes, so the set of mentioned users is computed once and stored as part of what
`comment.created`/the edit path reports — mentions are not re-derived lazily by a reader
opening the comment later, keeping notification fan-out deterministic and independent of
when someone happens to view the thread.

**Acceptance criteria**

1. `extractMentions` returns the raw `@handle` tokens found in the body, in order of first
   occurrence.
2. Mention extraction happens synchronously within `createComment`, not as a deferred job.
3. A comment with no `@` tokens produces an empty mention set, not an error.

### REQ-093 — Mentions inside code spans and fences are not mentions

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-092, REQ-091

`extractMentions` excludes any `@handle`-shaped text that falls inside inline code
(single backticks) or a fenced code block (triple backticks), so a comment discussing an
`@scope/package` npm reference or quoting an email header does not spuriously notify a
member whose handle happens to match.

**Acceptance criteria**

1. `` `@notareal` `` inside inline code is not extracted as a mention.
2. A fenced code block containing `@handle` on its own line is not extracted as a mention
   even when `handle` is a real member's handle.
3. A mention immediately after a closing code span backtick, outside the code span, is
   still correctly extracted.

**Implemented by:** `src/lib/mentions.ts`
**Verified by:** `tests/lib/mentions.test.ts`

### REQ-094 — Mentioned users must be members of the same organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-010, REQ-092

`resolveMentions(body, members)` is only ever called with the member list of the comment's
own organization, so a syntactically valid `@handle` that does not correspond to a member of
that org resolves to nothing — it is left as plain text in the rendered comment rather than
becoming a live mention link, and no notification fires for it.

**Acceptance criteria**

1. `resolveMentions` never returns a `UserId` for a handle outside the supplied member list.
2. A handle matching a removed (soft-deleted) member does not resolve to an active mention.
3. Mention resolution does not perform its own cross-org member lookup; it only consumes the
   member list the caller already scoped correctly.

### REQ-095 — Comment creation emits comment.created with mentioned user ids

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-112, REQ-092, DES-071

`createComment` emits `comment.created` after the insert, and the payload carries the
resolved mention `UserId`s alongside the standard `EventEnvelope` fields, so the notification
service's mention-handling path (`REQ-112`) does not need to re-parse the body itself — it
consumes the already-resolved list.

**Acceptance criteria**

1. `comment.created`'s payload includes the mentioned user ids as a distinct field, not
   embedded only in the raw body text.
2. The event fires exactly once per successful comment creation, after the write commits.
3. A comment with zero mentions still emits `comment.created` with an empty mention list,
   since general comment-activity notifications are independent of mentions.

**Implemented by:** `src/server/services/comment-service.ts` — `createComment`
**Verified by:** `tests/services/comment-service.test.ts`

### REQ-096 — Comment creation is rate limited per organization

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-011, REQ-161, REQ-176

`consumeRateLimit(orgId, 'comment:create', 1)` runs before `insertComment`. The bucket
(capacity 60, refill 20/minute) is scoped per organization, not per user, so the limit
protects the shared downstream consumers — mention notification fan-out, search reindexing —
from an organization-wide burst regardless of how many distinct members are posting.

**Acceptance criteria**

1. Exceeding the bucket returns `rate_limited`/429 before any comment row is written.
2. The bucket is keyed by `orgId`, so two different organizations' comment volumes never
   interact.
3. `getBucketConfig('comment:create')` returns capacity 60 and refill 20 per minute.

### REQ-097 — Authors may edit their own comments

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-026, ADR-003

`comment:update`'s ownership escalation (`REQ-026`) grants the comment's author edit rights
regardless of their current role rank, and `updateComment` in `comment-service.ts` enforces
the edit window (`REQ-102`'s implicit prerequisite: an edit is only meaningful while the
comment is live, not soft-deleted).

**Acceptance criteria**

1. `can(actor, 'comment:update', comment)` is `true` for the comment's author independent of
   role.
2. A non-author `member` without an `admin`-level override cannot edit someone else's
   comment.
3. Editing a soft-deleted comment fails with `AlreadyArchivedError`.

### REQ-098 — Comment deletion is a soft delete

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-004, REQ-100

`archiveComment` sets `archived_at`; the row and its body remain in the database so a thread
that references it (a later reply quoting it, or simply its position in chronological order)
does not develop a hole. `deleteComment` requires `comment:delete`, whose `ROLE_MATRIX`
minimum is `admin`, separate from the author-level escalation `comment:update` gets, meaning
authors can edit their own comments but deleting one — even your own — requires either the
`admin` role floor or the ownership escalation that also covers `comment:delete` per the
brief's escalation list.

**Acceptance criteria**

1. `deleteComment` never issues a `DELETE` statement against the comments table.
2. A soft-deleted comment's body is not shown in the default thread rendering (`REQ-101`)
   but is not physically erased.
3. `AlreadyArchivedError` is thrown on a second delete attempt of the same comment.

### REQ-099 — Deleting a comment emits comment.deleted

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-172, REQ-220

`deleteComment` emits `comment.deleted`, which drives `removeFromIndex` in the search
service (`REQ-174`) and the activity row. It is a distinct event from `comment.created`
edited-in-place, because search and activity need to know a subject left the visible corpus,
not merely that it changed.

**Acceptance criteria**

1. `comment.deleted`'s payload carries enough to identify the subject for
   `removeFromIndex(orgId, 'comment', subjectId)` without an extra read.
2. The event fires only on the transition from live to archived, not on repeated attempts
   against an already-deleted comment.
3. A deleted comment's activity row records the deletion as a distinct action from a
   content edit.

### REQ-100 — Comment threads are ordered by creation time

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-090, DES-100

`listThread(orgId, issueId)` returns `CommentThreadNode`s ordered by `createdAt` ascending —
the oldest comment first, matching how a reader would naturally follow a discussion from its
start. There is no reordering by edit time or by reply-nesting depth; Taskflow's comment
model is a flat, chronological thread, not a nested-reply tree.

**Acceptance criteria**

1. Editing a comment does not change its position in the thread ordering.
2. Two comments created in the same request batch (unlikely but possible under concurrent
   requests) still resolve to a stable, deterministic order via `createdAt` plus id as a
   tiebreaker.
3. `listThread` includes soft-deleted comments in their original position when the caller
   requests the full scope, so context is not lost for readers who need it (moderation,
   audit).

### REQ-101 — Comment listings exclude archived comments by default

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-046, REQ-071, DES-001

`listComments` and the default `getThread` view apply `shouldFilterArchived`, matching the
soft-delete display convention used for issues and projects. A deleted comment's slot in the
thread may still render as a placeholder ("comment deleted") depending on the UI, but the
body content is not served in the default query path.

**Acceptance criteria**

1. `listComments` without an explicit archived scope excludes soft-deleted rows' bodies.
2. `countComments(orgId, issueId)` used for the issue detail page's comment count reflects
   only live comments by default.
3. An explicit archived-inclusive query is available for moderation or audit use.

### REQ-102 — Editing a comment re-parses its mentions

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-092, REQ-095

`updateComment` runs `extractMentions`/`resolveMentions` again against the new body, so
adding a mention in an edit notifies the newly mentioned member, and removing one from the
text does not leave a stale mention record pointing at content that no longer references
them.

**Acceptance criteria**

1. Editing a comment to add a new `@handle` produces a mention set that includes the newly
   added member.
2. Editing a comment to remove an existing `@handle` produces a mention set that no longer
   includes that member.
3. Re-parsing on edit does not re-emit `comment.created`; it is reported through whatever
   update-path event `comment-service.ts` uses for edits, separate from creation.
