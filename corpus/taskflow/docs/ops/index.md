---
title: Operations index
id: OPS-INDEX
status: approved
owners: [platform-team, j.novak]
last_updated: 2026-08-24
related: [DES-060, DES-062, ADR-016, ADR-018, REQ-070]
---

## What this directory is

This is the operations documentation for Taskflow's background systems: the scheduler,
the job queue, and the seven job kinds that run inside the same process as the web
server (`DES-060`, `DES-062`). It exists separately from the design docs under
`docs/design/` because it answers a different question — not "how is this built" but
"what do I do when it breaks, and what did we decide and why, in the order we decided
it." Nothing here should contradict the design docs; where this directory adds detail,
it is operational detail (log lines to grep for, scripts to run, cadence numbers to
double-check) rather than a competing description of the architecture.

The directory has three kinds of documents. **Runbooks** are the reference you open
mid-incident or mid-question — symptom, diagnosis, procedure. **Postmortems** are
retrospective, factual accounts of four incidents, written to be read once during
onboarding and referenced again only when a similar symptom recurs. **Notes** are the
running decision log — fourteen dated meetings spanning 2025-11-10 through 2026-08-24,
recording not just what the team decided but the disagreements and rejected
alternatives along the way, because the reasoning behind a decision ages better than the
decision stated alone.

## Runbooks

| file | trigger | owner |
|---|---|---|
| `runbook-scheduler-and-queue.md` | A job kind hasn't run on cadence, pending queue depth is growing, or `scheduler tick failed` is in the logs | t.abara, j.novak |
| `runbook-digest-job.md` | A customer reports a missing, duplicated, or wrongly-timed digest email | t.abara |
| `runbook-webhook-retries.md` | Webhook deliveries are backing up, failing, or an endpoint owner reports gaps | k.ferreira |
| `runbook-overdue-sweep.md` | Overdue-issue notifications are missing, late, or duplicated | t.abara |
| `runbook-seeding-and-local-setup.md` | Cannot log in locally, need a reproducible fixture, or `pnpm db:seed` behaves unexpectedly | platform-team, d.okafor |

Each runbook follows the same shape: When to use, Preconditions, Normal operation (with
real cadence numbers and exported function names, not paraphrases), Diagnosis as a
symptom-to-command table, numbered Procedures, Escalation, and Related. Every runbook
that describes a scheduled job includes a Mermaid diagram of its control flow, because a
sequence or flowchart answers "what happens next" faster than prose when someone is
mid-incident and reading under pressure.

## Postmortems

| file | date | severity | one-line cause |
|---|---|---|---|
| `postmortem-2026-01-19-cross-tenant-issue-list.md` | 2026-01-19 | high (staging only) | A temporary diagnostic script bypassed the repository layer's `orgId` filtering entirely |
| `postmortem-2026-03-02-digest-storm.md` | 2026-03-02 | medium | A scheduler restart plus a silently-failing `markRead` call caused repeated digest sends within one window |
| `postmortem-2026-04-17-webhook-backlog.md` | 2026-04-17 | medium | A customer's bulk-import burst overwhelmed the fixed `CLAIM_BATCH` throughput ceiling, cross-tenant |
| `postmortem-2026-06-08-board-server-component-crash.md` | 2026-06-08 | high | A refactor dropped `"use client"` from two components, making the board and billing settings pages unrenderable |

Two of these four incidents are drawn directly from real integration history: the
board-and-billing crash (`postmortem-2026-06-08-board-server-component-crash.md`) is a
faithful account of the actual `"use client"` regression this codebase experienced,
including the exact error count (28 occurrences across the board and billing settings
routes) and the two files involved,
`src/components/domain/issue/issue-row.tsx` and
`src/components/domain/billing/billing-plan-card.tsx`. The other real incident from
this corpus's history — an earlier version of `src/server/db/seed.ts` writing a literal
placeholder string instead of a real password hash, which meant no seeded local account
could log in — did not fit any of the four fixed postmortem titles thematically, so it
is documented instead as a "Known incident" callout inside
`runbook-seeding-and-local-setup.md`, which is where an engineer debugging exactly that
symptom would actually look. The remaining two postmortems (the cross-tenant leak and
the webhook backlog) are plausible, technically coherent incidents constructed to
exercise the tenant-isolation and webhook-delivery machinery, respectively, using real
function names, real constants, and real cadence numbers throughout.

Each postmortem carries a full timeline table, a root-cause section naming the exact
file and mechanism at fault, and an action-items table with an owner and a status —
`done`, `in_review`, `in_progress`, or `proposed` — so a reader can tell at a glance
which lessons have actually been acted on versus which are still open.

## Decision log and meeting notes

| file | date | topic | decisions made |
|---|---|---|---|
| `notes-2025-11-10-permission-matrix-review.md` | 2025-11-10 | Permission matrix review | Confirmed `ROLE_RANK` order; scoped ownership escalation to five actions; made platform-staff bypass a boolean, not a rank; corrected `webhook:manage` and `activity:export` minimum roles to admin |
| `notes-2025-11-20-event-bus-vs-queue.md` | 2025-11-20 | Event bus vs external queue | Chose an in-process typed event bus over an external broker; `Promise.allSettled` handler isolation; accepted at-most-once delivery; provisionally chose inline webhook delivery (later reversed) |
| `notes-2026-01-15-pagination-cutover.md` | 2026-01-15 | Pagination cutover | Rolled out keyset pagination for issues, projects, and search first; deferred notifications/activity; standardized a concurrent-mutation test pattern |
| `notes-2026-01-30-rate-limiter-sizing.md` | 2026-01-30 | Rate limiter sizing | Confirmed the bucket table; capped plan-based capacity scaling at 100x; deferred cost-weighted search limiting; confirmed `auth:password-reset` is identity-scoped, not org-scoped |
| `notes-2026-02-10-plan-ladder-pricing.md` | 2026-02-10 | Plan ladder pricing | Finalized the four-plan numeric ladder; kept enterprise webhooks unlimited with the risk logged; established the unlimited-safe-for-counts, unsafe-for-durations rule; integer-cents pricing |
| `notes-2026-03-04-digest-cadence-review.md` | 2026-03-04 | Digest cadence review | **Revises `ADR-005`**: reframed scheduler cadence as a dispatch throttle, not a correctness guarantee; rejected durable scheduler state as the fix; set the direction that became `ADR-016` |
| `notes-2026-04-01-flag-cleanup.md` | 2026-04-01 | Feature flag cleanup | Reclassified `command_palette` as permanent UI; flagged `ai_issue_summary`'s stale rollout percentage; adopted a quarterly graduate/remove/keep-gating review policy with per-flag owners |
| `notes-2026-05-05-search-syntax-gating.md` | 2026-05-05 | Search syntax gating | Confirmed silent syntax narrowing is intentional but should eventually signal in the response; reaffirmed rate-limit-before-flag-check ordering as deliberate |
| `notes-2026-05-22-retention-policy.md` | 2026-05-22 | Retention policy | Confirmed cleanup purges search/activity but never the issue row itself; flagged the customer-facing "retention" language gap; logged the missing hard-delete/erasure capability |
| `notes-2026-06-09-seat-counting-rules.md` | 2026-06-09 | Seat counting rules | **Revises the informal assumption** that active members alone govern the seat check; documented invite-time enforcement vs. accept-time reconciliation; UI/messaging fix, no requirements change |
| `notes-2026-06-26-invitation-expiry.md` | 2026-06-26 | Invitation expiry | Set the previously-unreviewed invitation token expiry to 14 days; confirmed revoke-and-reissue on resend, including the owner-role downgrade; confirmed the unscoped token-hash lookup is necessary |
| `notes-2026-07-13-webhook-secret-rotation.md` | 2026-07-13 | Webhook secret rotation | **Revises `DES-159`'s framing**: reaffirmed no-rotation as a deliberate, reasoned decision rather than a gap; recorded the prototype-driven reasoning behind `ADR-018`'s reversal of `ADR-005`'s inline-delivery idea |
| `notes-2026-07-30-layering-exception-amnesty.md` | 2026-07-30 | Layering exception amnesty | **Revises `DES-008`/`DES-017`'s framing**: reclassified the five layering exceptions individually instead of as one undifferentiated list; scheduled the issue detail page's exception for actual remediation |
| `notes-2026-08-24-quarterly-architecture-review.md` | 2026-08-24 | Quarterly architecture review | Reaffirmed the single-process architecture; adopted a standing "would a build failure catch this" design-review question; set next quarter's priorities |

Four of these fourteen — the digest cadence review, the seat counting rules review, the
webhook secret rotation discussion, and the layering exception amnesty — explicitly
revisit and revise an earlier decision, and each is marked above. This is by design: a
decision log that only ever adds new decisions and never revises old ones is not
tracking how the team's understanding actually changed over ten months. In each of
those four cases, the note names the specific ADR or design doc id it revises and keeps
its conclusion consistent with what that document already says — the digest cadence
review's reframing is what `ADR-016` was written to formalize two days later; the
webhook secret rotation note's account of `ADR-018` superseding `ADR-005`'s inline
delivery idea matches `ADR-018`'s own Context section; and both the seat-counting and
layering-exception notes revise informal or undifferentiated framings into explicit,
documented ones without changing any underlying code behavior.

## On-call overview

Taskflow's background work is entirely in-process: one scheduler
(`src/server/jobs/scheduler.ts`), started once by `src/instrumentation.ts` when the
Next.js server boots, ticking every 60 seconds, and one in-process queue
(`src/server/jobs/queue.ts`) that the scheduler drains on every tick. There is no
separate worker fleet, no external broker, and no persisted job state beyond the
`pending` array's own lifetime inside the running process — this is a deliberate
architectural choice (`ADR-005`, narrowed by `ADR-016`), not an accident, and it means
the single most useful fact for anyone new to on-call is this: **restarting the server
process resets every job kind's cadence tracking and clears the in-memory queue.** This
is expected, is usually harmless, and is directly responsible for two of this
directory's four postmortems having a restart or process-lifetime detail somewhere in
their root cause chain.

The seven job kinds, their cadence, and their primary owner:

| job kind | cadence (minutes) | primary owner | runbook |
|---|---|---|---|
| `digest-email` | 60 | t.abara | `runbook-digest-job.md` |
| `overdue-issues` | 60 | t.abara | `runbook-overdue-sweep.md` |
| `webhook-delivery` | 1 | k.ferreira | `runbook-webhook-retries.md` |
| `usage-rollup` | 15 | r.saito | `runbook-scheduler-and-queue.md` |
| `search-reindex` | 1440 (nominal; effectively manual-only today) | k.ferreira | `runbook-scheduler-and-queue.md` |
| `cleanup-archived` | 1440 | d.okafor | `runbook-scheduler-and-queue.md` |
| `trial-expiry` | 360 | r.saito | `runbook-scheduler-and-queue.md` |

For a first response to any background-job page, the standard order of operations is:
confirm the scheduler is actually ticking (`runbook-scheduler-and-queue.md` procedure 1),
identify which job kind is implicated from the alert or log scope name, open that job's
specific runbook if one exists, and only fall back to the general scheduler runbook's
manual-drain and manual-trigger procedures if the specific runbook does not resolve it.
Every job function can be invoked directly with an explicit clock argument from a
one-off script — this is the single most repeated procedure across every runbook in
this directory, because it is the fastest way to test a fix or force progress without
waiting for or fighting the scheduler's own cadence.

## Team roster

The roster below matches the one used throughout the requirements, design, and ADR
corpora; it is repeated here because on-call rotations and meeting attendance are the
two things most likely to be looked up from this directory specifically.

| handle | name | role | primary ops areas |
|---|---|---|---|
| `d.okafor` | Deji Okafor | staff engineer, platform | scheduler internals, cleanup job, cross-cutting `lib/` issues |
| `m.lindqvist` | Mira Lindqvist | tech lead, issues & projects | tenant isolation, permission model, issue/project design |
| `r.saito` | Rin Saito | engineer, billing & plans | usage rollup, trial expiry, plan limits |
| `t.abara` | Tomas Abara | engineer, notifications & jobs | digest job, overdue sweep, notification fan-out |
| `k.ferreira` | Kaya Ferreira | engineer, search & webhooks | webhook delivery, search reindex, search service |
| `j.novak` | Jan Novak | SRE | scheduler operations, alerting, incident response |
| `a.whitfield` | Ada Whitfield | product manager | plan ladder, feature flags, product-facing tradeoffs |
| `s.duarte` | Sofia Duarte | design | UI-facing consequences of flag and design decisions |
| `h.iqbal` | Hana Iqbal | QA lead | test coverage for every ops-relevant fix and cutover |

## How the pieces connect

The four postmortems and fourteen notes are not independent artifacts — several of the
notes exist directly because of a postmortem's action items, and at least one runbook's
"Known incident" section exists because a real fact did not have a matching postmortem
title. Reading in this order gives the fullest picture of the last ten months:
`notes-2025-11-10-permission-matrix-review.md` and
`notes-2025-11-20-event-bus-vs-queue.md` establish the foundational decisions everything
else builds on; `postmortem-2026-01-19-cross-tenant-issue-list.md` is the first real
test of the tenant-isolation discipline those early decisions assumed; the pagination
and rate-limiter notes from January round out the early-quarter infrastructure
decisions; `postmortem-2026-03-02-digest-storm.md` and its immediate follow-up,
`notes-2026-03-04-digest-cadence-review.md`, are a matched pair — read them together,
in that order, since the note only makes full sense against the incident it responds to;
`postmortem-2026-04-17-webhook-backlog.md` sits between the plan-ladder pricing
discussion that first flagged unlimited-webhooks as a risk and the later webhook secret
rotation note that revisits the delivery architecture more broadly; and
`postmortem-2026-06-08-board-server-component-crash.md` feeds directly into
`notes-2026-07-30-layering-exception-amnesty.md`'s broader question about which
conventions are enforced by tooling versus by memory alone, which in turn sets up the
standing design-review question adopted in the final entry,
`notes-2026-08-24-quarterly-architecture-review.md`.

## Terms this directory uses precisely

A handful of words recur across every document in this directory with a specific,
deliberate meaning that is easy to blur in casual conversation but matters when
diagnosing an actual incident:

**Cadence** always refers to the scheduler's `CADENCE_MINUTES` table — the minimum gap
between two *dispatches* of the same job kind. It is never a promise about how often a
job's underlying work actually completes, and `notes-2026-03-04-digest-cadence-review.md`
exists specifically because that distinction was blurred once, with real consequences.

**Eligible** describes a job kind at the moment `isDue()` returns true for it on a given
tick — it does not mean the job has run, only that the scheduler will enqueue it this
pass. A job can be eligible and still not run if the queue's drain limit is reached
first, though in practice this has not been observed given current volumes.

**Claimed**, used specifically in `runbook-webhook-retries.md`, refers to a delivery row
whose attempt counter has already been incremented by `claimPendingDeliveries`, whether
or not the delivery subsequently succeeds. A claimed-but-not-yet-delivered row is not
the same state as a pending row, and confusing the two during an incident makes attempt
counts look wrong when they are not.

**Drained** describes the queue after `drain()` has processed everything whose `runAt`
has passed, as of the moment it ran — it is a point-in-time statement, not an ongoing
guarantee, since new jobs can be enqueued the instant after a drain completes.

**Abandoned** (used in the webhook context) means a delivery has exceeded
`MAX_ATTEMPTS` and been marked failed for good via `markDeliveryFailed` — it will never
be retried again automatically. This is distinct from a delivery that is merely
**pending** a future retry after a transient failure, and distinct again from a
**dropped** job, which is a job-queue-level (not delivery-level) failure after the
queue's own, separate `MAX_ATTEMPTS`.

**Reported**, specific to the overdue sweep, refers to membership in that job's private
in-memory `Set` tracking which issues have already had `issue.overdue` emitted for them
during the current process lifetime — not a database column, not a persisted flag, and
gone the instant the process restarts.

Getting these words right in an incident channel saves real time: "the delivery was
claimed but not yet abandoned" and "the delivery was pending and then abandoned" describe
two different points in the same state machine, and on-call responders who use them
precisely spend less time re-explaining what they mean mid-incident.

## A note on how this corpus was assembled

This directory, like the requirements, design, API, database, UI, and test
documentation it cross-references, describes a real, frozen codebase — every function
name, file path, cadence number, and constant cited across these 24 files was read
directly from source rather than inferred or assumed, and every backticked src/ and tests/ path is
verified against the corpus's own file manifest before publication. Two of the four
postmortems are grounded in incidents that genuinely occurred during this corpus's
integration history; the other two, and every one of the fourteen decision-log entries,
are constructed narratives written to be technically consistent with the real
requirements, design, and architecture-decision ids they reference, in the same way a
real engineering organization's history would read if you came in new and had to
reconstruct the reasoning behind everything already built. Nothing in this directory
should be taken as a description of behavior the code does not actually exhibit — where
a runbook states a constant's value or a function's exact name, that value was read from
the file it cites, not from memory or convention.

## Frequently asked questions

**"Do I need to restart the process to pick up a config change to a job's cadence?"**
Yes. `CADENCE_MINUTES` is a source-level constant in `scheduler.ts`, not a runtime
setting read from the database or an environment variable — changing it requires a code
change, a rebuild, and a restart, which also has the side effect described throughout
this directory of resetting every job kind's `lastRunAt` tracking. There is no
supported way to adjust one job kind's cadence in a running process without restarting
all of them.

**"Can two server processes run against the same database safely?"** Not with the
current design. The queue, the scheduler, and the overdue sweep's `reported` set are all
module-scope, single-process state; running two processes against the same SQLite file
would mean both schedulers ticking independently, both claiming from
`claimPendingDeliveries` (which is not designed with multiple concurrent claimers in
mind beyond SQLite's own row-level locking behavior), and two independent overdue
`reported` sets that would not know about each other's announcements. Taskflow's
deployment model assumes exactly one server process at a time; horizontal scaling of the
web tier specifically, independent of the background-job tier, is not something this
architecture supports today and would require pulling the job system out into a
separate process or service first.

**"Why does the digest job scan every organization instead of only the ones whose hour
just arrived?"** Because there is no index or query that lets `listOrgIdsForRollup`
filter by `digestHourUtc` directly — it returns organizations ordered by measurement
recency for usage-rollup purposes, and `shouldRunForOrg`'s hour check is applied
afterward, in application code, to every org in the returned batch. This is a
performance characteristic worth knowing before assuming a fleet-wide scan is a bug: it
is intentional given the current repository surface, not an oversight, though it does
mean `ORG_BATCH`'s sizing (discussed in `runbook-overdue-sweep.md` procedure 5 for the
overdue sweep specifically, but the same reasoning applies to the digest job) has real
consequences for whether every organization gets a fair chance to be checked within its
own configured hour as the fleet grows.

**"Where do I find the actual SQL schema for tables mentioned across these documents?"**
This directory intentionally does not restate schema — see `docs/db/` for table and
column definitions. Ops documentation cites column names (`archivedAt`, `dueAt`,
`digestHourUtc`, and so on) only where the operational behavior depends on understanding
what they hold, not as a substitute for the schema reference itself.

**"A postmortem here references an action item as `done` — how do I confirm that?"**
Check the runbook or design doc the action item's own file links to under its Related
section; most `done` action items in this directory correspond to a change already
reflected in the current behavior described in the matching runbook (for example, the
board-crash postmortem's ESLint rule and render smoke test are both referenced from
`runbook-seeding-and-local-setup.md`'s neighboring build-verification procedure). This
directory does not itself track a live status board — it records what happened and what
was decided, and trusts the code and its own design docs to reflect what actually
shipped.

## Glossary of job kinds

For a reader landing on this index cold, the seven `JobKind` values recur throughout
this directory without always being re-explained in full each time. Restated once here:

- `digest-email` batches a recipient's unread notifications from the last 24 hours into
  one email, sent once per day during the organization's configured UTC hour.
- `overdue-issues` scans for open issues whose due date has passed and announces each
  one exactly once per process lifetime via the `issue.overdue` event.
- `webhook-delivery` claims pending webhook delivery rows in batches, signs each
  payload, and retries with capped exponential backoff up to a fixed attempt ceiling.
- `usage-rollup` recomputes each organization's seat, project, issue, and storage usage
  counters from source tables, correcting drift in the incremental counters the write
  path maintains directly.
- `search-reindex` rebuilds one organization's search index from its live projects,
  issues, and comments; unlike the other six kinds it takes an explicit `orgId` and has
  no working scheduled trigger today.
- `cleanup-archived` purges search documents for long-archived issues and activity rows
  past an organization's plan-scoped retention window, without ever deleting the
  underlying issue rows.
- `trial-expiry` downgrades organizations whose trial period has ended to the free plan,
  unless doing so would leave them over the free plan's own limits, in which case the
  organization is left alone and logged instead.

## Reading order for someone new to on-call

A new engineer joining the on-call rotation for background jobs gets the most out of
this directory in roughly this order: start with `runbook-scheduler-and-queue.md` to
understand the shared machinery every job kind runs on top of, since every other runbook
assumes that vocabulary; then read the four job-specific runbooks in any order, since
they do not depend on each other; then read the four postmortems, which will now make
sense against the mechanics just learned rather than reading as abstract incident
reports; and only then work through the fourteen notes in date order, since the notes
assume familiarity with the systems they discuss and are meant to be read as a history
unfolding, not a reference to jump into out of sequence. Skipping straight to the notes
without the runbooks first is the most common way a new team member walks away from this
directory with the decisions memorized but not the reasoning behind them, which is
exactly the gap this directory exists to close.

## Related

- Ids: `DES-001`, `DES-060`, `DES-062`, `DES-063`, `ADR-005`, `ADR-016`, `ADR-018`,
  `REQ-070`, `REQ-119`, `REQ-154`
- Code: `src/instrumentation.ts`, `src/server/jobs/scheduler.ts`,
  `src/server/jobs/queue.ts`
- See also every file listed in the tables above; this index is deliberately the only
  file in this directory that does not define an id of its own — it exists to route,
  not to add new content.
