---
title: Kanban board
id: UI-PROJECT-BOARD
status: approved
owners: [m.lindqvist, s.duarte]
last_updated: 2026-08-12
related: [REQ-062, REQ-066, DES-104, DES-182, DES-230, ADR-021]
---

# Kanban board

## SCR-006 — Project board

- **Route:** `/{orgSlug}/projects/{projectSlug}/board`
- **Files:** `src/app/(dashboard)/[orgSlug]/projects/[projectSlug]/board/page.tsx`
- **Server or client:** Server Component shell; the interactive board itself is a client
  component (`KanbanBoard`)
- **Permission required:** `issue:read` to view the board at all (redirects, not 404, when
  absent — see below); `issue:update` additionally, checked *inside* `KanbanBoard` per card, to
  permit dragging a specific issue
- **Feature flag:** `kanban_board` (plan >= starter, overridable)
- **Data loaded:** `getBoard(actor, org.id, project.id)` from
  `src/server/services/issue-service.ts`, returning `IssueBoardColumn[]` — one entry per status
  in the closed status vocabulary, each already carrying its issues
- **Components:** `KanbanBoard` (`src/components/domain/board/kanban-board.tsx`), which
  composes `KanbanColumn` (`src/components/domain/board/kanban-column.tsx`) and `KanbanCard`
  (`src/components/domain/board/kanban-card.tsx`)
- **Actions invoked:** `moveIssueAction` (`src/actions/issues/move-issue.ts`)
- **Satisfies:** REQ-062, REQ-066
- **Design:** DES-104, DES-182, DES-230

### Layout

A single explanatory line above the board ("Drag a card to change its status. The move is
applied straight away and reconciled against the server.") sets expectations before anything
else renders — this board has no separate "save" step, and the sentence exists specifically so
a first-time user does not go looking for one. Below it, `KanbanBoard` renders one `KanbanColumn`
per entry in `columns`, each a `IssueBoardColumn` grouped server-side in application code from
one query (`DES-182` — there is no per-column query, so seven statuses do not mean seven round
trips). Each column shows its status label, a card count, and a vertically stacked list of
`KanbanCard`s; each card is a compact `IssueCard`-adjacent tile carrying the issue's title, key,
assignee avatar, priority indicator and label chips. A card is only `draggable` when the current
actor's permission check passes for that specific issue — `KanbanColumn`'s `onDrop` handler
receives `(issueId, toIndex)` from whichever card was released over it.

If the board is empty of any issues at all — every column has zero cards — the columns still
render with their headers and a "0" count each; `KanbanBoard` does not collapse to a single
whole-page `EmptyState` the way a list screen would, because a board with visible-but-empty
columns is itself informative (it tells the viewer which statuses exist in the workflow, which
an empty page would not).

### The flag-off redirect, and why it is a redirect and not an error page

`REQ-062` fixes issue status as a closed vocabulary, and the board is simply one visualization
of that vocabulary grouped into columns — the same issues the list view shows, laid out
differently. Because of that equivalence, when `isEnabled("kanban_board", ...)` is false the
page does not render an upsell or a 404; it calls `redirect(`/{orgSlug}/projects/{projectSlug}/issues`)`
before doing any other work, sending the caller straight to the list view of the *same data*.
The page's own doc comment states the reasoning plainly: "there is nothing to apologise for —
the board is simply not part of every plan." This is a deliberate contrast with
`screen-activity.md`'s `activity_feed` gate, which *does* render an explanatory `EmptyState`
rather than redirecting — the difference is that activity has no equivalent alternate view to
redirect to, while the board always does.

A second, independent redirect exists for the permission case: if `issue:read` fails for this
project, the page redirects to the project overview (`/{orgSlug}/projects/{projectSlug}`)
rather than the issue list, since a caller who cannot read issues at all should not land on a
page that itself requires the same permission.

### Drag-and-drop, optimistic reconciliation, and the server-side flag re-check

`KanbanBoard` uses `useOptimisticIssues` (see `conventions.md`) to reorder a card into its new
column the instant a drop event fires, calling `applyStatus(issueId, status)` inside the same
transition as `onMove`, which is `moveIssueAction` passed straight through as a prop from the
page. `DES-104` is the design fact this screen exists to visualize: a board move is a status
change plus a `touch` (updated timestamp), never a persisted ordinal — there is no "position
within column" field anywhere in the schema, so a card's vertical position inside a column after
a page reload reflects whatever the underlying `listIssues`-equivalent ordering produces, not
where the user last dropped it. This is a conscious simplification the design doc calls out by
name rather than a gap: Taskflow's board answers "what status is this issue in," not "in what
order should status peers be reviewed."

`DES-230` documents the server-side half of the same interaction: `move-issue.ts` re-validates
`kanban_board` on the server, against a client that only has a *snapshot* of the flag (see
`conventions.md`'s section on the client flag snapshot) — an admin could disable the org's
`kanban_board` override in one tab while this board stays open with stale `flags.kanban_board:
true` in another tab's `FeatureFlagProvider`. Without the server-side re-check, a drag on the
stale tab would otherwise succeed at changing status through an action that should have been
unreachable. The client optimistic update still fires immediately on drop, exactly as normal,
because from the client's point of view nothing distinguishes this case from a normal move
until the action's rejection un-does it on the next revalidation.

### What a `KanbanCard` shows, and why dragging is per-card, not per-column

`KanbanCardProps` is `{ issue, assignee, draggable }` — `draggable` is computed per card inside
`KanbanBoard`, not once for the whole column, because permission to move a specific issue
(`issue:update`) depends on that issue's own `authorId`/`assigneeId` through the ownership
escalation `ROLE_MATRIX` grants for `issue:update` (`brief-common.md`'s list of escalated
actions includes it explicitly). A member without a blanket `issue:update` grant can still drag
issues they authored or are assigned to, because the ownership escalation resolves to `granted_by_ownership`
for those specific rows, while the same member's drag attempt on a card authored and assigned to
someone else is blocked at the card level before any drop event fires — the card is simply not
`draggable`, so there is nothing for a mis-click to trigger. This is the direct visual expression
of `DES-041`'s point that ownership escalation is evaluated after the role matrix: a member's
base role might deny `issue:update` outright, and the per-card ownership check is what overrides
that specific denial for specific rows, one card at a time.

`KanbanColumn`'s `onDrop` signature, `(issueId: IssueId, toIndex: number)`, is a mild
simplification worth naming: `toIndex` is threaded through from the drop target's visual
position, but as `DES-104` documents, the server never persists a position — so `toIndex` only
ever affects where the card renders in the *current* client session's optimistic state, and a
full page reload re-derives column order from whatever the underlying query returns, discarding
whatever position the drag last placed it at. A future design change that wanted persisted
ordering within a column would need a new field the schema does not currently have, not merely a
change to how this component passes `toIndex` through.

### Accessibility and the non-drag path

The board's interaction model is drag-and-drop-first, which is inherently awkward for
keyboard-only and screen-reader users. `KanbanCard` and `KanbanColumn` do not currently expose an
alternative "move to column" control (a context menu or a keyboard shortcut bound through
`useKeyboardShortcut`, `src/hooks/use-keyboard-shortcut.ts`) — the only fully accessible path to
the same outcome (changing an issue's status) is the `IssueStatusSelect` dropdown rendered inside
`IssueDetail` on the issue-detail page, or the equivalent picker inside `IssueForm` when editing.
This is a known gap the design team (`s.duarte`) has flagged for the board specifically, tracked
alongside the missing board-specific loading skeleton noted below — both are scoped as design
backlog rather than defects, since the board was shipped as a visualization layered on top of an
already-complete status-change capability, not as the only way to change status.

### Comparison with the list view's ordering

`screen-project-issues.md` documents the project issue list, which shows the same underlying
rows this board shows, grouped by an explicit status filter chosen through the URL rather than
laid out as parallel columns. The two views are kept deliberately in sync at the data layer —
both ultimately call into `issue-service.ts` functions built on the same repository query
shape — but they diverge in what each affords: the list view supports free-text search
(`?q=`) and archived-issue visibility (`?archived=1`), neither of which the board exposes, while
the board is the only surface offering drag-and-drop status changes at all. A caller who wants
to search within a project's issues, or review its archived history, has to leave the board and
use the list; a caller who wants to change several issues' statuses quickly finds the board
faster than opening each issue individually. Because both views ultimately authorize with the
same `issue:read`/`issue:update` checks against the same rows, neither is more "authoritative"
than the other — they are two lenses on identical underlying state, and `DES-104`'s framing (a
board move is a status change plus a touch) is exactly the same operation the list-view's
`IssueStatusSelect` would trigger from the issue-detail page.

### States

| state | trigger | what the user sees |
|---|---|---|
| empty | project has zero issues in every status | All columns render with a "0" count and no cards; no whole-page `EmptyState`. |
| loading | client navigation to the board route | No dedicated `loading.tsx` under `board/`; the nearest ancestor skeleton is `projects/[projectSlug]/loading.tsx`, which renders the project-overview shape rather than a board-specific one — a board-specific loading skeleton has been proposed but not built (`s.duarte`, design backlog). |
| error | any thrown error resolving project context or `getBoard` | `projects/[projectSlug]/issues/[issueNumber]/error.tsx` does not apply here (it is scoped to the issue-detail segment); the board falls back to `[orgSlug]/error.tsx`, the tenant-level boundary, since there is no board-specific `error.tsx`. |
| permission denied | `issue:read` fails for this project | `redirect()` to the project overview — never a rendered permission-denied message, because the redirect happens before any board markup is produced. |
| flag off | `kanban_board` is false for the org's plan and no override is set | `redirect()` to `.../issues`, the list view — see above. |
| plan limit reached | not applicable — the board has no create action of its own that could hit a quota | — |
