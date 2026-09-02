---
title: Notifications and digests requirements
id: REQ-NOTIFICATIONS
status: approved
owners: [product-team, t.abara]
last_updated: 2026-05-19
related: [REQ-095, REQ-111, ADR-005, DES-120]
---

## Scope

This document defines the requirements for in-app notifications, per-user preferences, and
the daily digest email: how domain events become notifications, who gets notified and who is
suppressed, read/unread state, and how the digest batches, windows and renders unread items
into one email. It does not define email rendering or delivery mechanics beyond what the
digest needs (`REQ-124`), nor webhook delivery, which has its own retry and backoff story in
`webhooks.md`.

## Context

`src/server/services/notification-service.ts` is the fan-out hub: a single call to
`notify(orgId, kind, recipients, payload)` produces zero or more in-app `Notification` rows,
filtered through each recipient's `NotificationPreference` (`notification-preference-repository.ts`)
and each recipient's applicable feature flags (`resolveChannels` takes a `FlagContext`
because the `digest_email` channel itself is plan-gated, per `REQ-120`). Notification
creation is not the same code path as the domain event that triggers it — `issue-service.ts`,
`comment-service.ts` and the rest never call `notify()` directly; they only `emit()` domain
events, and a set of listeners registered by `registerEventHandlers()` in
`event-registry.ts` are what translate those events into notification calls. This
indirection is what keeps `REQ-114` ("actors are not notified about their own actions")
enforceable in one place rather than duplicated at every emit site.

`Notification` rows are per recipient and per organization (`REQ-110`); there is no
cross-org inbox, which follows the same tenancy discipline as everything else, and a user in
three organizations sees three separate notification counts, one per org, computed by
`countUnread(orgId, recipientId)`.

The daily digest is a distinct concern layered on top: `digest-service.ts#buildDigest`
gathers every unread notification for a recipient inside a bounded window
(`digestWindow()` from `src/lib/date.ts`) and hands the bundle to `renderDigest`, which
produces an email via `renderEmail(template, props)` in `email-service.ts`. The digest job
(`digest-email-job.ts`) runs on the `digest-email` cadence (every 60 minutes,
`CADENCE_MINUTES`), calling `shouldRunForOrg(org, now)` to decide whether this tick is the
org's digest hour before doing any real work — most ticks for most orgs are a no-op check,
not a digest send. `sendEmail` never performs network egress in this codebase; it writes the
rendered draft to the log, which is why the corpus can describe email delivery as a real
requirement (`REQ-124`) without needing an SMTP integration to back it.

## Open questions

1. `REQ-012` in `organizations.md` notes that `digestWindow` currently takes a
   `digestHourUtc` integer rather than a full timezone; every requirement in this document
   that references "the org's digest window" inherits that same UTC-hour-not-timezone
   limitation.
2. `REQ-115`'s preferences are per channel and per event class, but there is no requirement
   describing what happens when a recipient's only enabled channel for an event class is
   `digest_email` and the org's plan does not include `digest_email` (`REQ-120`) — whether
   that notification silently has no channel or falls back to in-app is not specified in
   code comments or tests.
3. Whether digest windows should be recomputed if an org changes its digest hour mid-cycle,
   potentially producing a very short or very long first window, is unresolved.

### REQ-110 — Notifications are per recipient and per organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-010, REQ-118, DES-120

`notifications` carries `org_id` and a `recipient_id`; every read (`listNotifications`,
`countUnread`) is scoped to both. A user who belongs to several organizations sees
independent notification state per org — reading everything unread in one org has no effect
on unread counts in another.

**Acceptance criteria**

1. `countUnread(orgId, recipientId)` never includes notifications from a different `orgId`
   even for the same recipient.
2. `listNotifications` requires both an actor (for authorization) and an implicit org scope
   derived from that actor.
3. Switching active organization (`REQ-009`) changes which notification set the inbox UI
   displays without any server-side notification data changing.

### REQ-111 — Notification fan-out is driven by domain events

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-005, REQ-065, REQ-095

Every notification in the product originates from a subscriber on the event bus
(`src/lib/event-bus.ts`), registered once via `registerEventHandlers()` and never called
inline from the service that emitted the triggering event. This indirection (`ADR-005`) is
what lets notification logic evolve — new recipient rules, new event types — without
touching `issue-service.ts`, `comment-service.ts` or any other emitter.

**Acceptance criteria**

1. No service outside the event-bus subscriber set calls `notify()` directly.
2. Registering a new listener for an existing event type does not require changing the
   emitter.
3. A subscriber's failure is isolated per the event bus's error-isolation guarantee and does
   not roll back the domain write that triggered the event.

**Implemented by:** `src/server/services/notification-service.ts`, `src/server/services/event-registry.ts`
**Verified by:** `tests/services/notification-service.test.ts`

### REQ-112 — A mention always notifies the mentioned user

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-095, REQ-092, REQ-114

The `comment.created` listener reads the mentioned-user-id list straight from the event
payload (`REQ-095`) and calls `notify(orgId, 'mention', mentionedIds, payload)` for each,
regardless of that recipient's preference for general comment notifications — a mention is
its own `NotificationKind`, with its own preference row, distinct from "someone commented on
an issue I'm watching."

**Acceptance criteria**

1. Every user id in a comment's resolved mention list receives a `mention`-kind
   notification, subject only to `REQ-114`'s self-notification suppression.
2. A recipient who has disabled general comment notifications but not mention notifications
   still receives the mention.
3. A mention of a user who is not a project member of a private project's issue (`REQ-051`)
   still notifies them — mentions bypass the project-membership fan-out narrowing, since
   being mentioned is itself evidence of relevance.

### REQ-113 — Assignment notifies the new assignee

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-067, REQ-114

The `issue.assigned` listener notifies the new assignee (when non-null) with an
`assignment`-kind notification; it does not separately notify the previous assignee by
default, since being unassigned is a lower-urgency event than being assigned something new,
though the previous assignee can still see the change on the issue's own activity feed.

**Acceptance criteria**

1. Assigning an issue to a user produces an `assignment` notification for that user.
2. Unassigning an issue (new assignee `null`) does not by itself produce an `assignment`
   notification, since there is no one to notify.
3. Reassigning from user A to user B notifies B; whether A is separately notified is
   governed by A's own preference for the relevant event class, not by a hardcoded rule.

### REQ-114 — Actors are not notified about their own actions

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-111, REQ-112, REQ-113

`notify()`'s recipient list is filtered to exclude `payload.actorId` before any
`Notification` rows are inserted, applied uniformly across every notification kind — mention,
assignment, comment activity — so self-assigning an issue or mentioning yourself in a
comment (both legal, neither unusual) never produces a notification about your own action.

**Acceptance criteria**

1. `notify(orgId, kind, recipients, payload)` never inserts a notification whose
   `recipientId` equals `payload.actorId`.
2. Self-exclusion happens inside the shared `notify()` function, not duplicated per listener,
   so a new listener gets it for free.
3. A comment mentioning both the author and other members notifies the others but not the
   author.

### REQ-115 — Notification preferences are per channel and per event class

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-120, DES-130

`NotificationPreference` (`src/types/notification.ts`) is keyed by `(orgId, userId, kind)`
and records which `NotificationChannel`s are enabled for that kind — a user might want
in-app notifications for everything but digest email only for mentions, not for every
comment on every issue they are a project member of.

**Acceptance criteria**

1. `getPreference(orgId, userId, kind)` returns the effective channel set for that specific
   notification kind, not a single global setting.
2. A recipient with no explicit preference row for a kind falls back to a documented
   default channel set, not an error.
3. `updatePreference` writes exactly one preference row per `(orgId, userId, kind)` tuple —
   `upsertPreference` overwrites rather than accumulating duplicates.

### REQ-116 — Recipients may mark notifications read individually or in bulk

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-118, DES-130

`markRead(actor, input)` marks one notification; `markAllRead(actor, orgId)` marks every
unread notification for that recipient in that org read in one call, returning the count
affected, which the inbox UI uses to animate the unread badge down to zero without a second
round trip to recompute it.

**Acceptance criteria**

1. `markRead` on an already-read notification is idempotent — no error, no double
   side-effect.
2. `markAllRead` only affects the calling actor's own notifications in the current org, not
   another recipient's.
3. `markAllRead`'s returned count matches the number of rows whose `readAt` transitioned
   from `null` to non-null in that call.

### REQ-117 — Unread counts are computed per organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-110, REQ-116

`countUnread(orgId, recipientId)` backs the sidebar's unread badge, computed fresh per
request rather than maintained as a denormalized counter column, which trades a small query
cost for the certainty that the badge can never drift out of sync with the underlying rows
the way a maintained counter could after a bug in one of the several code paths that mark
notifications read.

**Acceptance criteria**

1. `countUnread` reflects `markRead`/`markAllRead` effects immediately, with no caching
   staleness window.
2. The count is scoped to the org currently active in the session, matching `REQ-009`'s
   explicit-switch model.
3. A newly created notification is reflected in the very next `countUnread` call.

### REQ-118 — Recipients may manage only their own notifications

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-026, ADR-003

`notification:manage`'s `ROLE_MATRIX` minimum is `viewer` — the lowest bar in the whole
matrix — because the real restriction is not role rank but ownership: the ownership
escalation list includes `notification:manage`, and in practice every check additionally
requires `actor.userId` to equal the notification's `recipientId`. An `admin` cannot mark
another member's notifications read on their behalf; notification state is strictly
personal.

**Acceptance criteria**

1. `markRead`/`markAllRead`/`updatePreference` all require the acting user to be the
   notification's or preference's own owner.
2. No role, including `owner`, can read or modify another member's notification state.
3. `listNotifications` never returns another recipient's notifications even to an `owner`
   actor.

### REQ-119 — Digest email batches unread notifications into one message

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-121, REQ-122, DES-140

`buildDigest(orgId, recipientId, windowStart, windowEnd)` collects every unread notification
in the window into one `DigestBundle`, rendered by `renderDigest` into a single email rather
than one email per notification — the whole point of the digest channel is to trade
immediacy for a bounded number of interruptions, capped in practice by
`DIGEST_MAX_ENTRIES` from `src/config/constants.ts`.

**Acceptance criteria**

1. A recipient with ten unread notifications in the window receives exactly one digest
   email listing all ten, up to `DIGEST_MAX_ENTRIES`.
2. Notifications already marked read before the digest job runs are excluded from the
   bundle.
3. `buildDigest` does not mark the included notifications read itself; reading the digest
   email does not change in-app unread state, since the two surfaces are independently
   tracked.

### REQ-120 — Digest is available only on plans that include it

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-188, ADR-012

The `digest_email` flag (`growth` plan minimum, overridable) gates `shouldRunForOrg` and the
digest channel in `resolveChannels`; an org below `growth` without an override never has the
job produce a digest for it, and a recipient's preference cannot enable a channel their org's
plan does not include.

**Acceptance criteria**

1. `runDigestEmailJob` skips every org for which `isEnabled('digest_email', ...)` is false.
2. A `starter`-plan org with an override can still receive digests, since the flag is
   overridable.
3. Downgrading below `growth` without an override stops future digest sends without
   affecting past ones.

### REQ-121 — The digest window is bounded by the last successful send

- **Priority:** should
- **Status:** partial
- **Related:** REQ-012, REQ-119

`digestWindow(digestHourUtc, reference)` computes a window from the reference time and the
configured hour, not from a stored "last successful send" timestamp per organization —
which means a digest that fails to send for one org on one tick is not automatically
retried with an extended window on the next tick; the next tick simply computes the next
day's window as usual. This is flagged `partial` because the requirement as titled implies
gap-filling behavior the current implementation does not perform.

**Acceptance criteria**

1. `digestWindow` given the same `digestHourUtc` and consecutive daily reference times
   produces non-overlapping, contiguous 24-hour windows.
2. A missed digest send is not retried with a widened window in the current implementation.
3. Any future fix that adds gap-filling must not double-send notifications already included
   in a prior successful digest.

### REQ-122 — An empty digest is not sent

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-119, DES-140

`buildDigest` returns `null` when there are no unread notifications in the window, and
`runDigestEmailJob` treats a `null` bundle as "nothing to do" rather than sending an empty
email — an inbox with zero unread items getting a digest email anyway would be exactly the
kind of noise the digest channel exists to prevent.

**Acceptance criteria**

1. A recipient with zero unread notifications in the window receives no digest email.
2. `runDigestEmailJob`'s `JobResult.processed` count does not include recipients whose
   bundle was `null`.
3. `buildDigest` returning `null` is distinguishable from a genuine error; a build failure
   must not be silently treated as "empty."

### REQ-123 — Digest sends emit digest.due before rendering

- **Priority:** could
- **Status:** implemented
- **Related:** REQ-119, DES-071

The digest job emits `digest.due` at the point it determines an org's digest hour has
arrived, ahead of the actual `buildDigest`/`renderDigest`/`sendEmail` sequence — giving any
future listener (analytics, a pre-digest hook) a chance to react to "a digest is about to be
built for this org" independent of whether the build ultimately produces a non-empty bundle.

**Acceptance criteria**

1. `digest.due` fires once per org per tick where `shouldRunForOrg` is true, regardless of
   whether the resulting bundle turns out empty.
2. `digest.due`'s payload identifies the org and the computed window bounds.
3. No current listener depends on `digest.due` to actually build or send the digest; the
   build path runs independent of the event.

### REQ-124 — Email rendering is separated from email delivery

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-119, DES-150

`renderEmail(template, props)` in `email-service.ts` produces a `RenderedEmail` (subject,
html, text) purely from react-email templates such as `src/emails/digest-email.tsx`;
`sendEmail(message)` is
the only function that "delivers" it, and in this codebase delivery means writing the draft
to the structured log rather than performing network egress. Keeping the two functions
separate is what lets `renderDigest` be unit-testable (`tests/emails/render.test.ts`) without
any delivery side effect.

**Acceptance criteria**

1. `renderEmail` performs no I/O beyond template rendering; it never calls `sendEmail`
   itself.
2. Every `EmailTemplate` value (`invite`, `digest`, `mention`, `invoice`, `welcome`,
   `password-reset`, `overdue`) has a corresponding component, such as
   `src/emails/invite-email.tsx` or `src/emails/overdue-email.tsx`.
3. `sendEmail` accepts an already-rendered `OutgoingEmail` and performs no template logic of
   its own.
