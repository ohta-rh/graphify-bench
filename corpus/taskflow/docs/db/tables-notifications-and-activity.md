---
title: Notifications and activity
status: approved
owners: [platform-team]
last_updated: 2026-06-20
related: [REQ-110, REQ-111, REQ-114, REQ-115, REQ-116, REQ-117, REQ-119, REQ-220, REQ-221, REQ-222, REQ-223, REQ-227, REQ-228, REQ-229, REQ-231, ADR-005, ADR-006, ADR-008, ADR-022, DES-NOTIF-REPO, DES-EVENTBUS]
---

## Purpose

This file documents `notifications`, `notification_preferences`, and `activity_events` —
three tables that together are the schema's expression of Taskflow's in-process event bus
(ADR-005). Every domain mutation elsewhere in the schema (an issue created, a comment posted,
a member invited) is expected to emit an event, and these three tables are where two
different consumers of that same event stream land: `notifications`/`notification_preferences`
turn events into per-recipient, per-channel messages (`notifications.ts`), while
`activity_events` (`activity.ts`) turns the same events into an immutable audit log
(REQ-221, ADR-022). Reading them together is the fastest way to see the one-event,
two-consumers shape of the event bus at the schema level.

## `notifications`

**Drizzle export:** `notifications` in `src/server/db/schema/notifications.ts`
**Soft delete:** no — a notification is read or unread, never archived
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `NotificationId` |
| `org_id` | TEXT | no | — | REQ-110, per organization |
| `recipient_id` | TEXT | no | — | typed `UserId`; REQ-110, per recipient |
| `kind` | TEXT | no | — | one of eleven literal enum values (see below) |
| `title` | TEXT | no | — | |
| `body` | TEXT | no | — | |
| `href` | TEXT | no | — | deep link the notification resolves to |
| `actor_id` | TEXT | yes | — | typed `UserId`; the user whose action triggered it, null for system-generated notifications |
| `read_at` | TEXT | yes | — | null means unread |
| `channels` | TEXT | no | `'["in_app"]'` | JSON array of `NotificationChannel` values |
| `created_at` | TEXT | no | now | |
| `updated_at` | TEXT | no | now | bumped on `markRead`/`markAllRead` |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `notifications_org_recipient_idx` | `org_id, recipient_id` | no | the per-recipient inbox query, REQ-118 |
| `notifications_org_read_idx` | `org_id, read_at` | no | REQ-117's per-org unread-count computation |

**Invariants**

- **`kind` is a closed vocabulary** declared as a module-level `NOTIFICATION_KINDS` constant
  (`issue_assigned`, `issue_status_changed`, `issue_due_soon`, `issue_overdue`,
  `comment_created`, `comment_mention`, `member_invited`, `member_joined`,
  `project_archived`, `plan_limit_reached`, `digest_ready`) and reused, verbatim, as the enum
  for `notification_preferences.kind` below — this is the one place in the schema where two
  different tables' `enum` constraints are generated from the same shared constant rather than
  independently declared, which keeps the notification-kind vocabulary and the preference-kind
  vocabulary from drifting apart.
- **Actors are never notified about their own actions (REQ-114).** This is a filter applied
  before `insertNotification`/`insertNotifications` runs, not something the schema itself can
  express — a `notifications` row with `recipient_id = actor_id` is not structurally forbidden,
  only avoided by `NotificationService`'s fan-out logic.
- **Recipients may only manage their own notifications (REQ-118).** `markRead`/`markAllRead`
  are expected to be called with the acting user's own id as `recipient_id`, checked by
  `NotificationService`, not by a row-level constraint.
- **This table is never archived and never pruned by `archived_at`-style logic** — its
  lifecycle is entirely the `read_at` state machine (unread → read), and cleanup, where it
  exists, would follow the same retention-window pattern activity events use, though no
  `purgeNotifications`-equivalent function appears in `notification-repository.ts`'s exported
  surface — notifications appear to accumulate without a documented pruning path in this
  schema's current repository functions.

**Read and write paths**

`src/server/repositories/notification-repository.ts`: `listNotifications`, `countUnread`
(REQ-117), `insertNotification` / `insertNotifications` (singular and batch — the batch form
supports fanning one event out to many recipients in one write), `markRead`, `markAllRead`,
`listUnreadSince` (feeds the digest window, REQ-121). `NotificationService` is the sole caller,
and it is the event-bus subscriber that turns domain events into rows here.

## `notification_preferences`

**Drizzle export:** `notificationPreferences` in `src/server/db/schema/notifications.ts`
**Soft delete:** no
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `org_id` | TEXT | no | — | |
| `user_id` | TEXT | no | — | typed `UserId` |
| `kind` | TEXT | no | — | same `NOTIFICATION_KINDS` enum as `notifications.kind` |
| `in_app` | INTEGER (boolean) | no | `true` | |
| `email` | INTEGER (boolean) | no | `true` | |
| `digest_only` | INTEGER (boolean) | no | `false` | routes this kind to the digest rather than immediate email |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `notification_preferences_pk` | `org_id, user_id, kind` | yes | one preference row per user, per org, per notification kind — REQ-115's "per channel and per event class" |

**Invariants**

- **Preferences are per (org, user, kind) triple, not global to the user.** A user's email
  preference for `comment_mention` in one organization is independent of their preference for
  the same kind in a different organization — consistent with `members` being per-org and
  notification fan-out being org-scoped.
- **No row means the default preference applies** — `getPreference` presumably falls back to
  the column defaults (`in_app: true, email: true, digest_only: false`) when no explicit row
  exists for a given `(org, user, kind)`, since there is no `insertMember`-triggered row
  creation implied anywhere in this schema for every possible kind × member combination; that
  would be an eleven-times multiplier on `members` row count for no benefit when defaults
  suffice.

**Read and write paths**

`src/server/repositories/notification-preference-repository.ts`: `listPreferences`,
`getPreference`, `upsertPreference`, `listDigestSubscribers` (feeds REQ-119's digest batching
by finding who has `digest_only` set, or who simply has email enabled and a digest is due).
`NotificationService` reads preferences before fan-out to decide which channels a given kind
should actually notify through for a given recipient.

## `activity_events`

**Drizzle export:** `activityEvents` in `src/server/db/schema/activity.ts`
**Soft delete:** no — this table is append-only and immutable by design (REQ-221)
**Tenant column:** `org_id`

| column | SQL type | null | default | notes |
|---|---|---|---|---|
| `id` | TEXT | no (PK) | — | ULID, typed `ActivityId` |
| `org_id` | TEXT | no | — | REQ-220 |
| `action` | TEXT | no | — | free-text action identifier (not a closed schema enum, unlike `notifications.kind`) |
| `actor_id` | TEXT | yes | — | typed `UserId`; null for system-triggered activity |
| `subject_kind` | TEXT | no | — | enum: `organization`, `project`, `issue`, `comment`, `member`, `subscription`, `feature_flag` |
| `subject_id` | TEXT | no | — | the id of the row the event concerns, typed generically as a plain string since it can be any of the seven subject kinds |
| `project_id` | TEXT | yes | — | denormalized, present when the subject has a natural project association, for project-scoped activity views |
| `summary` | TEXT | no | — | human-readable one-line description |
| `metadata` | TEXT | no | `'{}'` | JSON object of scalar metadata, e.g. before/after values for REQ-034's role-change audit |
| `occurred_at` | TEXT | no | — | REQ-229's pagination sort key; distinct from `created_at`, since this table has no `created_at`/`updated_at` pair at all |

**Indexes**

| name | columns | unique | why it exists |
|---|---|---|---|
| `activity_org_occurred_idx` | `org_id, occurred_at` | no | REQ-229's time-ordered pagination |
| `activity_org_action_idx` | `org_id, action` | no | filtering the feed by action type |
| `activity_org_subject_idx` | `org_id, subject_kind, subject_id` | no | REQ-223's "queryable by subject" — jumping to an issue's or project's own activity history |

**Invariants**

- **Rows are immutable once written (REQ-221)** — there is no `updateActivity`-shaped
  function in `activity-repository.ts`'s exported surface; the only writes are `insertActivity`
  and the retention-driven `purgeActivityBefore`. No `updated_at` column exists on this table
  at all, which is itself evidence of the immutability invariant at the schema level, not just
  a convention: there is nothing to bump.
- **Activity capture must not fail the originating write (REQ-228).** This is a
  reliability/ordering property of how `ActivityService` is invoked relative to the mutation it
  records, not something the `activity_events` schema itself enforces — worth noting here
  because it explains why activity insertion is typically a best-effort side effect fired from
  the event bus (ADR-022) rather than wrapped in the same transaction as the primary mutation;
  `better-sqlite3`'s single-writer, synchronous model (ADR-002) makes a failed activity insert
  after a successful primary write a real possibility this requirement is guarding against.
- **`occurred_at`, not `created_at`, is the canonical timestamp.** This is a deliberate
  divergence from every other table's `timestampColumns` pattern — `activity_events` spreads
  only `tenantColumns` from `_shared.ts`, not `timestampColumns`, and declares `occurred_at`
  itself instead, because the moment an event *occurred* (which could, in principle, differ
  from the moment the row was inserted, though in practice they are the same instant for this
  synchronous event bus) is the semantically meaningful timestamp for an audit log.
- **Retention follows the plan's window (REQ-227), enforced by `purgeActivityBefore` (REQ-231),
  a scheduled cleanup job — not automatic expiry.** Rows older than
  `PLAN_LIMITS[org.plan].retentionDays` are deleted, but only when the cleanup job runs; between
  runs, activity older than the nominal retention window can still be present.
- **Reading the feed requires member access (REQ-224); exporting it requires admin (REQ-225);
  the whole feature is gated by a feature flag (REQ-226).** All three are authorization/rollout
  concerns enforced by `ActivityService` via `can()`/feature-flag checks, not by this table's
  own columns.

**Read and write paths**

`src/server/repositories/activity-repository.ts`: `insertActivity`, `listActivity` (keyset-
paginated by `occurred_at`, REQ-229), `listActivityForSubject` (REQ-223), `purgeActivityBefore`
(REQ-231's scheduled retention cleanup). `ActivityService` is the sole caller, subscribing to
the event bus (ADR-005) the same way `NotificationService` does — the two services are
independent consumers of the same underlying domain events, which is why `notifications` and
`activity_events` end up looking structurally similar (both carry `actor_id`, both reference a
subject) while serving different purposes: one is a per-recipient inbox, the other is a
tenant-wide, immutable log.

**Notes**

The absence of a shared "events" table that both `notifications` and `activity_events` read
from is worth being explicit about: there is no `domain_events` table in this schema at all.
The event bus (ADR-005) is in-process and in-memory — events are dispatched to subscribers
directly as they happen, and `notifications`/`activity_events` are each subscriber's own
durable record of what it did in response, not two views over one persisted event log. This
means an event that fails to reach one subscriber (say, activity capture failing per REQ-228's
own framing) would not corrupt or block the other subscriber's record, since there is no shared
row either of them depends on. It also means the two tables can, and do, evolve independently:
`notifications` gained the `channels` JSON column without any equivalent change to
`activity_events`, and `activity_events` gained `project_id` as a denormalized convenience
column without any equivalent addition to `notifications`, because each table's shape answers
to its own subscriber's needs rather than to a shared event schema both must agree on.
