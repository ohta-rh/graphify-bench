---
title: Activity feed
id: UI-ACTIVITY
status: approved
owners: [t.abara, h.iqbal]
last_updated: 2026-08-12
related: [REQ-220, REQ-224, REQ-225, REQ-226, DES-170, DES-172, ADR-022]
---

# Activity feed

## SCR-014 — Activity

- **Route:** `/{orgSlug}/activity`
- **Files:** `src/app/(dashboard)/[orgSlug]/activity/page.tsx`
- **Server or client:** Server Component; `ActivityFeed`'s export button is the only
  interactive control, and it is a plain link to `src/app/api/export/activity/route.ts`, not a
  Server Action
- **Permission required:** `activity:read` (404 when absent); the export affordance inside
  `ActivityFeed` additionally requires `activity:export`
- **Feature flag:** `activity_feed` (plan >= growth, overridable)
- **Data loaded:** `listActivity(actor, { orgId, limit, cursor })` and, in parallel,
  `listMembers(actor, { orgId, limit: 100 })` to build an actor-id-to-`User` lookup table for
  rendering names instead of raw ids; `groupByDay(page.items)` (both from
  `src/server/services/activity-service.ts`) reshapes the flat page into day-bucketed groups
  before it ever reaches the component
- **Components:** `ActivityFeed` (`src/components/domain/activity/activity-feed.tsx`)
- **Actions invoked:** none — this page has no mutating action; the CSV export is a GET request
  to a Route Handler, covered fully by `DES-027` at the design layer
- **Satisfies:** REQ-220, REQ-224, REQ-225, REQ-226, REQ-229
- **Design:** DES-170, DES-172, DES-173

### Layout

A header ("Every change made in {org.name}, newest first.") followed by `ActivityFeed`, which
renders one section per day — newest day first — each containing its events as a flat list with
actor name (resolved from the `actors` lookup map passed in as a prop), a hand-written summary
string per event type, and a relative or absolute timestamp. `ActivityFeedProps` takes `groups`
(already day-bucketed), `actors` (`Readonly<Record<string, User>>`), and `actor` (the *viewing*
actor, used only to decide whether the export button renders — `can(actor, "activity:export",
...)` is evaluated inside the component itself, not on the page, which is why `ActivityFeedProps`
carries the full `Actor` rather than a precomputed boolean).

### Two gates that fail differently, on purpose

This screen's own doc comment states the design intent plainly, and it is worth restating here
because it is the single most important fact about this page's behavior: a missing `activity:read`
permission is a 404 — "the page should not exist for you" — while a disabled `activity_feed`
flag is a rendered explanation — "the page exists, your plan does not include it." The
implementation reflects the ordering exactly: the permission check runs first and calls
`notFound()` immediately on failure, *before* the flag is even evaluated; only once permission
has passed does the flag check run, and its failure path returns an `EmptyState` ("The activity
feed is not part of this plan," with a pointer to Settings → Billing) rather than falling through
to any further data loading. No `listActivity` or `listMembers` call happens when the flag is
off — the quota-shaped question ("what would this cost to load") is moot because the section
never queries in the first place.

This same "permission is a wall, flag is a window" contrast recurs across the dashboard —
`screen-settings-billing-flags-webhooks.md`'s webhook screen makes an almost identical
distinction between its own permission, flag and quota gates — and this page is the clearest
single example of it because it has only the two gates to reason about, with nothing else
layered on top.

### Nine event types feed this feed, and none of them retry

`DES-173` is the design fact underlying every row this screen renders: nine specific event
types are captured into the audit log by hand-written listeners, each producing its own summary
string, and none of them retry on a write failure — if the write that produces an activity row
fails, the row simply never appears, silently, rather than blocking or retrying the action that
triggered it. `REQ-228` states the corresponding requirement directly: activity capture must
never fail the *originating* write. From this screen's perspective, that tradeoff means the feed
is a best-effort record, not a transactional ledger — an admin auditing "what happened to this
issue" should treat a gap in the feed as a possible dropped capture, not proof nothing happened.
`groupByDay` (`DES-172`) is a pure, in-memory reshape with no query of its own behind it — the
day boundaries are computed client-of-the-service-layer, from whatever page of rows
`listActivity` already returned, which is why the day groups on this page never straddle a
pagination boundary cleanly: the last group on a page may be partial, and the next page's first
group may continue the same calendar day.

### Retention and the export

`REQ-227` ties activity retention to the plan's `retentionDays` (30 for free, up through 2555 —
about seven years — for enterprise); this page does not surface a retention indicator directly,
but the practical effect is that a free-plan org's feed simply stops showing rows older than 30
days once `purgeActivityBefore` (the repository-layer cleanup, `DES-205`) has run. The export
button, gated on `activity:export` and rendered inline by `ActivityFeed` rather than by this
page, streams a CSV through `src/app/api/export/activity/route.ts` using `toCsv` — `REQ-230`
requires that export to escape quotes and separators, a fact this page relies on but does not
implement, since the escaping lives entirely inside the Route Handler.

### Actor resolution: why the page fetches `listMembers` alongside `listActivity`

Activity rows do not embed a denormalized actor name — `ActivityEvent` carries an `actorId`
(a bare `UserId`), and this page's parallel `listMembers(actor, { orgId, limit: 100 })` call is
what builds the `actors: Record<string, User>` lookup `ActivityFeed` needs to render a readable
name instead of a raw id per row. The 100-row cap on the member lookup means an organization with
more than 100 members would see some activity rows fall back to whatever placeholder
`ActivityFeed` renders for an unresolved actor id (typically the raw id or a generic "someone"
label, handled internally by the component) — this is a known scaling ceiling shared with several
other member-picker call sites in this directory (the issue-detail page's `MEMBER_PICKER_LIMIT`,
the members settings page's own picker), all fixed at 100 for consistency rather than derived
from `PlanLimits.seats`, since even an enterprise-plan org's unlimited seat count would make a
plan-derived limit meaningless for a UI-side lookup table.

### CSV export, its Route Handler, and why it is not a Server Action

`src/app/api/export/activity/route.ts` is one of the small number of Route Handlers documented
across this directory precisely because streaming a CSV response is one of the cases `DES-007`
names explicitly: a Server Action returns a typed `ActionResult`, not an arbitrary HTTP response
with a `Content-Type: text/csv` header and a `Content-Disposition` for the download filename, so
this is a case where a Route Handler is structurally required rather than a stylistic choice.
The handler re-checks `activity:export` and `csv_export`-equivalent flag gating itself (`can`,
`isEnabled`, `toCsv` per the app manifest's `mustUse` annotation for this file) — it does not
trust that the link only ever appears when `ActivityFeed` has already confirmed the permission,
since a direct GET request to the route bypasses whatever the UI chose to render entirely. This
is the same defense-in-depth principle `conventions.md` states generally about UI-layer checks
never being a security boundary by themselves, made concrete here: the export link is hidden from
an unauthorized viewer, but the route it points at would refuse the request even if the link were
somehow reached directly.

### Pagination and why the day-grouping can straddle a page boundary

`listActivity` paginates by keyset cursor (`REQ-229`: activity is paginated by occurrence time),
and `groupByDay` runs *after* pagination, on whatever single page of rows came back. This ordering
means a calendar day that has, say, 40 events and a page size smaller than 40 will have its events
split across two fetched pages, each producing its own partial day-group — a viewer paging forward
through the feed may see the same date heading appear again at the top of the next page,
continuing where the previous page's group left off, rather than every date appearing exactly
once across the whole feed. This is a direct, visible consequence of `DES-172`'s description of
`groupByDay` as "a pure, in-memory reshape with no query behind it" — grouping happens purely
within whatever page the keyset cursor already fetched, never across pages, since doing otherwise
would require buffering an unbounded number of rows to find a complete day's boundary.

### How this screen relates to the search index and the inbox

Activity, search, and notifications all consume the same underlying domain events but serve
distinct purposes, and this page is the one surface that shows the rawest, least-transformed
view of those events. `screen-search.md` documents that the search index is maintained by
listeners that re-read the row rather than trusting the event payload (`REQ-173`); this page's
`ActivityEvent` rows, by contrast, are written directly from the event's own payload at capture
time (`DES-170`: `record()` takes no `Actor` because the writer is usually an event handler, not
a request), so an activity row and a search document derived from the "same" underlying mutation
can, in principle, diverge if the row changed again between the event firing and the search
listener's re-read. This page does not attempt to reconcile that possibility — it is simply the
audit trail of what events fired, not a guarantee that the row still looks exactly as described
at the moment a viewer reads it.

### States

| state | trigger | what the user sees |
|---|---|---|
| empty | `activity_feed` on, but zero events recorded for the org yet | `ActivityFeed` renders zero day-groups; no dedicated whole-page `EmptyState` distinguishes this from a genuinely brand-new org — a gap similar to the one noted on the notification inbox. |
| loading | client navigation to `/activity` | `[orgSlug]/loading.tsx` (no dedicated `loading.tsx` under `activity/`). |
| error | thrown error inside `listActivity` or `listMembers` | `[orgSlug]/error.tsx`. |
| permission denied | `activity:read` fails | `notFound()` — no explanatory copy, by design (see above). |
| flag off | `activity_feed` unavailable for the org's plan | `EmptyState`: "The activity feed is not part of this plan," with a pointer to Settings → Billing; no data is fetched. |
| plan limit reached | not applicable — this screen has no create action; the closest analogue is the retention window silently truncating history, which is not a blocking limit | — |
