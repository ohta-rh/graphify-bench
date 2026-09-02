---
title: Notification inbox
id: UI-INBOX
status: approved
owners: [t.abara]
last_updated: 2026-08-12
related: [REQ-110, REQ-116, REQ-117, REQ-118, DES-121, DES-127, ADR-021]
---

# Notification inbox

Two routes share this file: the full inbox page and the `@panel` slot's notification preview,
which render the same underlying list at different depths.

## SCR-012 — Inbox

- **Route:** `/{orgSlug}/inbox`
- **Files:** `src/app/(dashboard)/[orgSlug]/inbox/page.tsx`
- **Server or client:** Server Component shell; `NotificationList` is the interactive piece
- **Permission required:** `notification:read`, checked against `{ kind: "notification", orgId,
  recipientId: actor.userId }` — the resource is always the *caller's own* recipient id, never
  an arbitrary target, which `DES-127` calls out explicitly for the underlying service functions
  this page's actions delegate to
- **Feature flag:** none
- **Data loaded:** `listNotifications(actor, { orgId, recipientId: actor.userId, unreadOnly,
  limit, cursor })` from `src/server/services/notification-service.ts`, keyset-paginated
- **Components:** `NotificationList` (`src/components/domain/notification/notification-list.tsx`)
- **Actions invoked:** `markNotificationReadAction`
  (`src/actions/notifications/mark-read.ts`), `markAllNotificationsReadAction`
  (`src/actions/notifications/mark-all-read.ts`) — both wrapped in local `"use server"`
  functions on the page so they can close over `org.id` without the client needing to know it
- **Satisfies:** REQ-110, REQ-116, REQ-117, REQ-118
- **Design:** DES-121, DES-122, DES-127

### Layout

A header with the page title and a live count line — `{page.total} unread notifications` or
`{page.total} total notifications` depending on whether `?filter=unread` is present — followed
by `NotificationList`, which renders each row with a visual distinction between read and unread
(the read/unread affordance itself lives inside the component, driven by each notification's
`readAt` field) and exposes `onMarkRead`/`onMarkAllRead` callbacks the page wires to the two
Server Actions above. There is no visible filter control on the page for `?filter=unread` beyond
whatever navigates to it — the sidebar's notification bell and any deep link are the only routes
into the filtered view in the current build; the page itself does not render a toggle.

### Recipient-only authorization, twice

`REQ-118` states recipients may manage only their own notifications, and this page enforces that
in the most direct way available: every query and every action closure is built from
`actor.userId` as the recipient, never from a value read out of the URL or a form field. There is
no notification-detail route with an id in the path that could be tampered with to target
another user's row — the entire surface is scoped to "my notifications" by construction.
`DES-127` documents the mirror-image guarantee on the service side: `updatePreference` and
`markAllRead` both re-authorize against the caller's own `userId` inside the service layer too,
so this page's client-side scoping is reinforced, not merely trusted, one layer down.

### `notify()` is never called from this page directly

Notifications arriving in this inbox were not created by any Server Action this page invokes —
`DES-121` documents that `notify()` takes no `Actor` and is never called by a Server Action
directly; it is wired as a listener on the domain event bus (`DES-125`: the fan-out is wired at
module import time, turned on simply by importing `notification-service.ts`'s registration
module, not through the general `event-registry.ts` mechanism most other listeners use). This
page is a pure read/acknowledge surface over rows that some other actor's action already
produced as a side effect — a mention, an assignment, a status change on a watched issue. Its
`DES-122`-governed filtering (self-notification suppressed, per-recipient channel preference
respected) already happened before a row ever reached this list; the inbox has no filtering logic
of its own to duplicate that.

## SCR-013 — Notification panel (`@panel` slot)

- **Route:** matches whenever the URL includes `/{orgSlug}/notifications` as the parallel-route
  segment (opened from the bell icon, not a standalone navigable page in the ordinary sense)
- **Files:** `src/app/(dashboard)/[orgSlug]/@panel/notifications/page.tsx`, with
  `@panel/default.tsx` and `@panel/page.tsx` as its siblings in the same parallel slot
- **Server or client:** Server Component
- **Permission required:** `notification:read`, identical resource shape to the inbox page —
  but note the *failure mode differs*: this page returns `null` (rendering nothing into the
  slot) rather than calling `notFound()`, since a denied `@panel` slot must not blank out the
  entire page behind it
- **Feature flag:** none
- **Data loaded:** `listNotifications(actor, { orgId, recipientId: actor.userId, unreadOnly:
  search.unread === "1", limit: 20 })` — a tighter limit than the full inbox (20 vs. the
  paginated inbox's per-page default) since this is a preview, not the primary reading surface
- **Components:** none of the shared domain notification components — the panel renders its own
  minimal `<ul>`/`<Link>` markup inline rather than reusing `NotificationList`
- **Actions invoked:** none — the panel is read-only and links out to the full inbox for any
  mutation (mark read, mark all read)
- **Satisfies:** REQ-110, REQ-117
- **Design:** DES-121

### Why a parallel-route slot exists at all

`DashboardShell` renders `{panel}` inside a `<aside>` beside the main content column, visible
only at the `xl` breakpoint and only when a route provides one. The `@panel/notifications/page.tsx`
doc comment states the reason directly: it matches when the URL targets
`/{orgSlug}/notifications`, so opening notifications keeps whatever page is already showing in
the main column instead of navigating away from it — the entire reason the `@panel` parallel
route exists in this codebase is to let the notification bell open *alongside* the current page
rather than replacing it. `@panel/default.tsx` is the mandatory fallback Next.js 16 requires for
any parallel slot (`conventions.md`), and `@panel/page.tsx` is what renders when no more specific
segment (like `notifications`) is active.

### The bell, the unread count, and `useNotifications`

`NotificationBell` (`src/components/domain/notification/notification-bell.tsx`, `{
unreadCount, orgSlug }`) is rendered inside `TopBar` on every page in the tenant subtree, not
just the inbox — its `unreadCount` prop is computed once per navigation by the tenant layout
(`[orgSlug]/layout.tsx`'s `listNotifications(actor, { ..., unreadOnly: true, limit: 1 })` call,
which reads `notifications.total` rather than `notifications.items.length`, exactly the same
`total`-not-`.length` pattern `screen-org-home.md` documents for its own counts). `REQ-117`
requires unread counts to be computed per organization, and this is the concrete mechanism: the
count reflects only the current org's unread rows, so switching organizations through
`OrgSwitcher` shows a different badge value immediately on the next render, never a stale
cross-org total.

`useNotifications` (`src/hooks/use-notifications.ts`, `(orgId): { notifications, unreadCount,
markRead, markAllRead }`) is a client-side hook offering the same shape of data and mutations
this page's Server Component already provides through props — it exists for components that need
live notification state *without* being handed it as props from a page-level fetch, such as a
client-only widget mounted somewhere the inbox page's own server-rendered data would not
naturally reach. Neither the inbox page nor the `@panel` slot currently uses `useNotifications`
directly; both pages fetch server-side and pass plain data down, reserving the hook for future
client-driven surfaces (a live-updating bell badge that refreshes without a full navigation,
for instance) that have not yet been built. This mirrors the `IssueFilterBar`/`useIssueFilters`
situation documented in `screen-project-issues.md`: a fully-built hook sitting one integration
step ahead of where it is currently wired.

### Mark-read semantics: individual versus bulk

`REQ-116` requires recipients be able to mark notifications read individually or in bulk, and
this page's two actions are the direct implementation of each half: `markNotificationReadAction`
takes a single `notificationId` and is wired to whatever per-row "mark read" affordance
`NotificationList` renders (typically a click on the row itself, or an explicit small button —
the exact trigger is internal to the component), while `markAllNotificationsReadAction` takes no
id at all and clears every unread row for the current recipient and org in one call. Both close
over `org.id` from the page rather than accepting it as a parameter the client could supply,
which is consistent with the recipient-only-authorization theme documented above: even the
*organization* half of the mutation's scope is fixed server-side by the page, not passed through
from client state that could in principle be tampered with.

Neither action distinguishes "mark read" from "open" as separate user gestures on this page —
there is no separate "preview without marking read" affordance the way an email client's reading
pane sometimes offers. Clicking through to whatever the notification's `href` points at (an issue,
a comment, a project) is a plain navigation; whether that click also fires `markRead` is a detail
internal to `NotificationList`'s row rendering, not something this page's own code branches on.

### Channel preferences and why the inbox itself has no preference controls

Whether a given event ever produces a row this inbox can show is decided long before the inbox
renders anything — `resolveChannels` (documented fully in the design catalogue under
`DES-124`) is a pure function that decides, per event and per recipient, which channels
(in-app, email digest) apply, and the notification-preferences form
(`src/components/domain/notification/notification-preferences-form.tsx`, one of the two
deliberate layering exceptions named in `conventions.md`) is the only screen where a recipient
can change that decision going forward. This inbox page renders whatever in-app rows already
exist; it has no "mute this kind of notification" control of its own, and a recipient who wants
to stop receiving a class of notification has to leave the inbox and visit
`/{orgSlug}/settings/notifications` to do so. This split — read/acknowledge here,
configure elsewhere — keeps the inbox's own permission surface simple: everything on this page
answers only to `notification:read`, with no `notification:manage`-gated control mixed in,
even though `notification:manage` exists in `ROLE_MATRIX` as a distinct, lower-ranked (viewer)
action specifically for managing one's own preferences and read-state in bulk.

### States

| state | screen | trigger | what the user sees |
|---|---|---|---|
| empty | inbox | zero notifications match the current filter | `NotificationList` renders with no rows; the component does not currently render a dedicated `EmptyState` for zero notifications — a known gap noted for a future pass, since every other list screen in this directory uses one. |
| empty | panel | zero notifications | An empty `<ul>` with no placeholder copy — same gap as the inbox, smaller surface. |
| loading | inbox | client navigation | `[orgSlug]/loading.tsx` (no dedicated `loading.tsx` under `inbox/`). |
| loading | panel | slot resolving | No dedicated loading state for the panel slot; Next.js suspends the slot independently of the main column, so the panel can appear slightly after the rest of the page. |
| error | inbox | thrown error resolving tenant context | `[orgSlug]/error.tsx`. |
| error | panel | thrown error inside the slot | Falls back to the nearest ancestor `error.tsx`, which is `[orgSlug]/error.tsx` — an error in the panel is capable of taking down the whole tenant boundary along with it, since there is no slot-scoped `error.tsx`. |
| permission denied | inbox | `notification:read` fails | `notFound()`. |
| permission denied | panel | `notification:read` fails | Returns `null` — the slot renders empty, the rest of the page is unaffected. |
| flag off | neither | — | — |
| plan limit reached | neither | — | — |
