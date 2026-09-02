---
title: An interval scheduler with per-kind cadence
id: ADR-016
status: accepted
owners: [t.abara]
last_updated: 2026-03-05
related: [REQ-070, REQ-119, REQ-144, ADR-005, ADR-018]
---

# ADR-016 — An interval scheduler with per-kind cadence

## Status

Accepted. Narrows the design sketched in ADR-005, whose Consequences section
records this narrowing explicitly. In force since March 2026, unmodified.

## Context

ADR-005 introduced the in-process event bus and, in its earliest design
notes, sketched scheduled work — digests, overdue-issue detection, usage
rollups — as "just another event handler," imagining something like a
handler that set its own internal timer. Tomas Abara, who owns notifications
and jobs, ran into the limits of that sketch almost immediately once he
started implementing REQ-070 (overdue issues detected by a scheduled sweep)
alongside REQ-119 (digest email batches unread notifications) and REQ-144
(usage rolled up on a schedule for the billing screen): these three features
need to run on three genuinely different cadences — checking for overdue
issues hourly is reasonable, but re-rendering and sending digest emails on
the same hourly cadence would spam users who asked for a daily digest, and
rolling up usage numbers for the billing screen needed to run more
frequently than either, to keep the usage meter reasonably fresh without
recomputing it on every page view.

A bus handler holding its own `setInterval` per job kind would have meant
seven independent timers (the eventual job kinds: `digest-email`,
`overdue-issues`, `webhook-delivery`, `usage-rollup`, `search-reindex`,
`cleanup-archived`, `trial-expiry`), each started and stopped independently,
each needing its own care around process shutdown — the exact
"a pending tick should never keep the process alive" concern that ADR-005's
own event bus design deliberately avoids by having no timers in it at all.
Tomas wanted one clock, one place that decided what was due, and one drain
loop, not seven uncoordinated ones.

## Decision

`src/server/jobs/scheduler.ts` is a single interval, started from
`src/instrumentation.ts` at process boot via `startScheduler()`, ticking
every `TICK_INTERVAL_MS` (60,000 ms — once a minute). `CADENCE_MINUTES` is a
`Readonly<Record<JobKind, number>>` declaring, per job kind, the minimum gap
between two runs: `digest-email` 60, `overdue-issues` 60, `webhook-delivery`
1, `usage-rollup` 15, `search-reindex` 1,440 (once a day), `cleanup-archived`
1,440, `trial-expiry` 360 (every six hours). This single table is the
authoritative cadence policy the ADR-005 sketch never actually specified —
this ADR is where "how often does each kind of scheduled work run" got a
real, reviewable answer, expressed as one number per job kind rather than
scattered per-feature timer logic.

`tick(now: Date)` — deliberately taking an explicit `Date` parameter rather
than reading the clock itself — is the actual unit of work: for each
`JobKind`, `isDue(kind, now)` checks whether `now` is at least
`CADENCE_MINUTES[kind]` minutes past `lastRunAt.get(kind)` (or has never
run at all, which is always due); if due, it records `lastRunAt` and
`enqueue()`s a job row via `src/server/jobs/queue.ts`, then the tick calls
`drain()` once to process whatever is now pending. Splitting `tick()` out
from the `setInterval` callback specifically enables the test suite to drive
scheduling deterministically with an explicit clock — the module's own
comment states this directly — instead of a test having to wait a real
minute for the interval to fire, which is why `startScheduler()`'s callback
is a thin wrapper calling `tick(new Date())` and nothing else. The timer
itself is `.unref()`ed, so — matching the philosophy behind the event bus's
handler isolation — a pending scheduler tick never blocks process shutdown;
the module's comment states plainly that "a scheduler that blocks shutdown
is worse than one that misses the last tick." `stopScheduler()` clears the
interval and the `lastRunAt` map together, so a restarted scheduler starts
clean rather than remembering stale cadence state from a previous run.
`isSchedulerRunning()` is a simple boolean check used by health diagnostics
and tests.

Each job kind's actual work — `runWebhookDeliveryJob`, the overdue-issue
sweep, digest rendering, and so on — lives in its own module under
src/server/jobs/, invoked by the queue's `drain()`, not by the scheduler
directly; the scheduler's only responsibility is deciding *when* a kind of
work becomes due and handing it to the queue.

## Consequences

**What this buys the team.** One clock, one cadence table, one drain loop —
adding an eighth job kind (which happened once already, `trial-expiry`, added
in April 2026 for REQ-142) is a one-line addition to `CADENCE_MINUTES` plus a
new job module, not a new timer to wire up and separately guard against
outliving the process. Because `tick()` takes an explicit clock, the test
suite exercises real cadence behavior — "does `overdue-issues` actually wait
sixty minutes between runs" — with fast, deterministic tests advancing a fake
clock, rather than either skipping that coverage or accepting slow
real-time tests. The `.unref()`ed timer has, in practice, meant a graceful
shutdown never hangs waiting on a scheduler tick, something Jan Novak's SRE
team specifically checked for during the first production-shaped deployment
rehearsal and found already handled, rather than a gap they had to raise.

**What it costs.** A single shared tick means every job kind's due-check
happens on the same one-minute granularity — `webhook-delivery`'s
one-minute cadence is about as tight as this scheduler can express without
shortening `TICK_INTERVAL_MS` for every job kind, since no job can run more
often than the tick itself fires. This was an acceptable ceiling for every
job kind the team has needed so far, but it is a real one: a hypothetical
future job needing sub-minute cadence would not fit this model without
either a second, faster scheduler or reducing `TICK_INTERVAL_MS` globally,
which would tick every other job kind's due-check more often too, for no
benefit to them. `isDue()`'s reliance on an in-memory `lastRunAt` map also
means, like ADR-011's rate limiter, that cadence state does not survive a
process restart — a restart resets every job kind's "last run" to
undefined, meaning everything looks due on the very next tick after a
restart. In practice this has been harmless (a slightly early digest-email
run after a deploy is not a correctness problem, just an early one) but it
is a property the team is explicit about, not an oversight: a deployment
that restarts frequently would cause its expensive daily jobs
(`search-reindex`, `cleanup-archived`) to re-run more often than intended if
restarts happened to straddle their windows, and this has not yet been a
practical problem only because the deployment cadence is much lower than the
job cadences it could disrupt.

## Alternatives considered

**Per-job-kind `setInterval` timers**, the original ADR-005 sketch. Rejected
for the reasons in Context: seven independent timers each needing their own
shutdown-safety handling, with no single place to see or reason about the
whole cadence policy at once.

**A cron-syntax scheduler library**, giving arbitrary cron expressions per
job rather than a fixed minutes-between-runs model. Considered, and rejected
as more expressiveness than any of the seven job kinds actually needed — none
of them require "every Tuesday at 3am" semantics, only "no more often than
every N minutes" — and it would have added a dependency and a cron-parsing
surface for a requirement the simpler `CADENCE_MINUTES` table already meets
completely.

**Persisting `lastRunAt` to the database**, so cadence state survives a
restart. Considered as a fix for the restart-resets-cadence gap noted above,
and deliberately deferred rather than rejected outright — the team judged it
premature complexity until a real incident demonstrated the current
behavior actually causes a problem, consistent with the project's general
preference for the simplest mechanism that satisfies the requirements in
front of it.

## References

- REQ-070 (overdue issues detected by a scheduled sweep), REQ-119 (digest
  email batches unread notifications), REQ-121 (digest window bounded by
  last successful send), REQ-142 (trials expire on a schedule), REQ-144
  (usage rolled up on a schedule)
- ADR-005 (the event bus whose original scheduled-work sketch this ADR
  narrows and replaces — see that ADR's own Consequences section for the
  matching acknowledgment), ADR-018 (webhook delivery, the job kind with the
  tightest cadence in this table, drained by this same scheduler)
- Code: `src/server/jobs/scheduler.ts` (`startScheduler`, `stopScheduler`,
  `isSchedulerRunning`, `tick`, `CADENCE_MINUTES`, `TICK_INTERVAL_MS`),
  `src/server/jobs/queue.ts` (`enqueue`, `drain`, `pendingCount`),
  `src/instrumentation.ts`
