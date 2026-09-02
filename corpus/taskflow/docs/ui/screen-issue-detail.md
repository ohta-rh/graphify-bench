---
title: Issue detail
id: UI-ISSUE-DETAIL
status: approved
owners: [m.lindqvist]
last_updated: 2026-08-12
related: [REQ-090, REQ-092, REQ-097, DES-106, DES-115, DES-117, ADR-015]
---

# Issue detail

## SCR-010 — Issue detail

- **Route:** `/{orgSlug}/projects/{projectSlug}/issues/{issueNumber}`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/issues/[issueNumber]/page.tsx`,
  with dedicated `error.tsx`, `loading.tsx` and `not-found.tsx` siblings in the same segment
- **Server or client:** Server Component shell; `CommentComposer`, `CommentThread` and
  `IssueDetail` render interactive sub-trees but the page itself does no client work
- **Permission required:** `issue:read`, checked against the *resolved row* (`found.authorId`,
  `found.assigneeId`) rather than a pending placeholder — this is one of the few screens where
  the permission resource is built from real data instead of `PENDING_ISSUE_ID`
- **Feature flag:** none
- **Data loaded:** `findIssueByNumber(org.id, project.id, number)`
  (`src/server/repositories/issue-repository.ts`) to resolve the human-facing number to a row;
  then, in parallel, `getIssue(actor, org.id, found.id)`, `getThread(actor, org.id, found.id)`
  (`src/server/services/comment-service.ts`), `listMembers(actor, { orgId, limit: 100 })`,
  `listActivityForSubject(org.id, "issue", found.id)`
  (`src/server/repositories/activity-repository.ts`), `findUserById(found.authorId)`
  (`src/server/repositories/user-repository.ts`), and conditionally `findUserById` for the
  assignee
- **Components:** `IssueDetail` (`src/components/domain/issue/issue-detail.tsx`),
  `CommentThread` (`src/components/domain/comment/comment-thread.tsx`), `CommentComposer`
  (`src/components/domain/comment/comment-composer.tsx`), `IssueActivityPanel`
  (`src/components/domain/issue/issue-activity-panel.tsx`)
- **Actions invoked:** `createCommentAction` (`src/actions/comments/create-comment.ts`),
  `deleteCommentAction` (`src/actions/comments/delete-comment.ts`) — wired through a local
  server function bound with `"use server"` rather than passed as a plain action reference,
  because it needs to close over `org.id`
- **Satisfies:** REQ-090, REQ-092, REQ-097, REQ-098
- **Design:** DES-106, DES-115, DES-117, DES-119

### Layout

A two-column grid on large screens (`grid-cols-[minmax(0,1fr)_18rem]`) that collapses to one
column below the `lg` breakpoint. The left column holds `IssueDetail` (title, description,
status, priority, due date, assignee and label metadata rail — all read-only display here; edits
happen through the pickers embedded inside `IssueDetail` itself, which is why this page does not
separately import `IssueStatusSelect` or `IssueAssigneePicker`), followed by a "Comments"
section: `CommentThread` rendering every node with reply-depth indentation, and `CommentComposer`
below it for posting a new top-level comment. The right column is `IssueActivityPanel`, a
per-issue slice of the audit trail scoped by `listActivityForSubject`.

### Resolving the number is itself the tenant boundary

The URL segment `[issueNumber]` is the human-facing sequence number (`REQ-061`: allocated per
project, never reused), not the issue's branded id. `findIssueByNumber(org.id, project.id,
number)` is deliberately called with *both* `org.id` and `project.id` — the page's own doc
comment states plainly that the number is only unique within a project, so a lookup scoped to
the number alone would leak issues across every project that happens to share the same numeric
sequence. This lookup is not merely a convenience query; it is where tenant scoping happens for
this screen, before any permission check runs. A malformed or non-positive `issueNumber` (parsed
with `Number.parseInt`) triggers `notFound()` immediately, and a `found === null` result — the
number does not exist in this project — triggers the identical `notFound()`, so a caller cannot
distinguish "not a number" from "no such issue" from the response.

### `getIssue` composes without separately authorizing the pieces

`DES-106` is the design fact this page's data-loading shape exists to satisfy: `getIssue`
combines the issue row, its author, and its assignee into one read model, and it does *not*
re-authorize each composed piece independently — the single `issue:read` check performed against
`found` before any of the parallel fetches covers the whole assembled view. This is why the page
can safely fire `getIssue`, `getThread`, `listMembers`, `listActivityForSubject` and two
`findUserById` calls all inside one `Promise.all` without threading a fresh permission check
through each one: the gate already ran, and everything fetched afterward belongs to the same
authorized view. `getThread` is the one exception worth naming, because it is *not* fully
subsumed by the outer check — `DES-119` documents that `getThread` re-checks `comment:read`
itself even though the caller already proved they can read the parent issue, since comment
visibility and issue visibility are governed by separate `ROLE_MATRIX` entries that happen to
share a minimum role today but are not guaranteed to stay aligned.

### Comment composition, mentions, and the fifteen-minute self-edit window

`CommentComposer` binds to `createCommentSchema` and passes the member list so `@mention`
autocomplete (via `MentionTextarea`, `src/components/domain/comment/mention-textarea.tsx`) can
resolve names to `UserId`s client-side — but `DES-116` is explicit that the *server's* mention
parse is what actually wins on disagreement with whatever the client reported; the client-side
resolution exists for autocomplete UX, not as a trusted mention list. `DES-115` documents that
comment creation is rate-limited (`comment:create`, 60 capacity / 20 refill-per-minute,
`src/lib/rate-limit.ts`) *before* mentions are resolved, so a burst of comment submissions never
reaches the member-scan step at all — this page has no visible rate-limit affordance, so a
throttled submission surfaces only as the generic `ActionResult` error rendered by
`useFormAction`'s `error` state inside `CommentComposer`.

`CommentThread` hides the delete control for anyone but the comment's own author, tied to
`REQ-097` (authors may edit their own comments) and its companion delete rule; `DES-117` narrows
this further for *editing* specifically — the self-edit window is author-only and closes fifteen
minutes after posting, a constraint this page's UI does not visibly count down but which the
underlying `update-comment` action enforces server-side, so an edit attempted after the window
fails with the generic action error rather than a client-side disabled state (there is no client
clock check here, deliberately — see `DES-239` in the action layer for why the check is
authoritative server-side).

### `IssueDetail`'s metadata rail

`IssueDetailProps` is `{ issue: IssueWithRelations, actor, author, assignee }`. The component
renders the issue title and description as the primary column and a metadata rail alongside it
carrying status (`IssueStatusSelect`, driven by the closed `ISSUE_STATUSES` union), priority
(`IssuePrioritySelect`, driven by `ISSUE_PRIORITIES`), the due date (`IssueDueDateField`, which
visually flags a past-due value), the assignee (`IssueAssigneePicker`, restricted to active
members of the org so a removed member can never be re-assigned an issue through this control),
and the label set (`IssueLabelPicker`, multi-select against the org's shared label list — see
`screen-settings-org-and-members.md`'s labels screen for where those labels are managed). Every
one of these pickers is permission-gated independently inside `IssueDetail` rather than the page
disabling the whole component when `issue:update` fails — a viewer who can only read the issue
sees every field rendered read-only, while a member who owns the issue by authorship or
assignment sees the fields they are specifically permitted to change become interactive, which is
the ownership-escalation story from `screen-project-board.md` playing out again here at the
per-field level rather than the per-card level.

`IssueId`, `ProjectId`, `OrgId` and the rest of the branded id types this page threads through
its data-loading calls are `ADR-015`'s branded-string-id pattern in practice: `findIssueByNumber`
returns a row whose `.id` is already typed as `IssueId`, not a bare `string`, so the subsequent
`getIssue(actor, org.id, found.id)` call cannot accidentally be passed a `ProjectId` or a raw
unvalidated string that happens to look like an id — a mistake the type checker catches at
compile time rather than a bug discovered at runtime against the wrong tenant's row.

### Editing and deleting a comment from this page

`CommentItem` (`src/components/domain/comment/comment-item.tsx`, rendered inside
`CommentThread` for each node) exposes an `onEdit?` callback distinct from the page-level
`onDelete` this page wires up explicitly — editing is handled entirely inside the comment
component's own local state and its own binding to the update action, while deletion is the one
mutation this page threads through as a named server function (`deleteComment`, closing over
`org.id`) because `CommentThread`'s `onDelete` prop is required, not optional, in its type
signature. This asymmetry — delete wired explicitly by the page, edit handled internally by the
component — reflects that deletion needs no form state (it is a single confirm-and-fire action)
while editing needs the composer's full validation and error-rendering machinery, which
`CommentItem` already owns internally rather than duplicating at the page level.

`CommentThread`'s `depth` prop on each node is what drives the reply-chain indentation; Taskflow's
comment model supports threaded replies (a comment can reply to another comment on the same
issue), and `DES-186` — cited fully in the design catalogue rather than reproduced here — notes
that archived (soft-deleted) replies are deliberately kept in the thread rather than removed, so
that a live reply never loses the anchor comment it was responding to. This page's rendering of
`thread` therefore may include comment nodes whose body has been replaced with deleted-comment
placeholder copy inside `CommentItem`, sitting beside their still-live replies, rather than the
thread silently closing the gap.

### `IssueActivityPanel` versus the full activity feed

The right-column `IssueActivityPanel` (`{ events: readonly ActivityEvent[], actors }`) is
populated from `listActivityForSubject(org.id, "issue", found.id)` — a query scoped to exactly
this one issue's audit trail, not the organization-wide feed `screen-activity.md` documents.
The two surfaces share the same underlying `ActivityEvent` shape and the same nine event types
`DES-173` names, but `IssueActivityPanel` renders no day-grouping, no export button, and no
permission gate of its own beyond what already gated the whole page — since a caller who can
read this issue at all is trusted to see its own activity history, unlike the organization-wide
feed, which requires the separate `activity:read` permission and the `activity_feed` flag on top
of ordinary issue-read access.

### States

| state | trigger | what the user sees |
|---|---|---|
| empty | issue has zero comments | `CommentThread` renders nothing above the composer — no explicit "no comments yet" `EmptyState` is used on this screen, since the composer itself is always visible and self-explanatory. |
| loading | client navigation to an issue's detail route | `issues/[issueNumber]/loading.tsx`, a skeleton scoped to just this segment. |
| error | any thrown error after the issue is resolved (e.g. a transient failure in `listActivityForSubject`) | `issues/[issueNumber]/error.tsx`, a dedicated boundary for this segment (distinct from the tenant-level `[orgSlug]/error.tsx`, giving issue-specific errors their own reset scope). |
| permission denied | `issue:read` fails against the resolved row | `notFound()` — identical response to an issue number that does not exist at all. |
| flag off | none apply to this screen | — |
| plan limit reached | not applicable directly, though a comment attempt against an org that has hit `apiRequestsPerHour` could surface a `rate_limited` action error | Generic `ActionResult` error rendered inline by `CommentComposer`'s `useFormAction` binding, not a dedicated banner. |
