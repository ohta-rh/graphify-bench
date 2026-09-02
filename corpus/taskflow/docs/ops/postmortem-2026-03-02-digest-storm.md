---
title: Postmortem — digest storm
id: OPS-PM-2026-03-02
status: approved
owners: [t.abara, j.novak]
last_updated: 2026-03-06
related: [REQ-119, REQ-121, REQ-122, DES-128, DES-129, ADR-005, ADR-016]
---

## Summary

On 2026-03-02, subscribers on the Northwind Labs organization received between four and
eleven duplicate digest emails within a two-hour window, each containing an overlapping
but not identical set of notifications. The root cause was a race between two scheduler
ticks both finding the `digest-email` job due at the same wall-clock minute after an
unrelated process restart reset the scheduler's in-memory `lastRunAt` tracking, combined
with `markRead` calls inside `runDigestEmailJob` silently failing for a subset of
notifications due to a transient database lock contention issue introduced by an
unrelated migration running concurrently. Because a failed `markRead` does not roll back
the `sendEmail` call that already happened, every subsequent pass re-included the
still-unread notifications, and because the scheduler had two overlapping eligible
windows that morning, "subsequent pass" happened far more often than the intended
once-per-hour cadence.

## Impact

- 47 recipients across Northwind Labs received between 4 and 11 digest emails in a
  roughly two-hour window, versus the expected 1.
- No data was lost or exposed to the wrong recipient — every duplicate digest contained
  only that recipient's own organization's notifications, correctly scoped.
- Several customers filed support tickets describing the product as "spamming" them;
  reputational impact was judged moderate, not severe, given the short window.
- No other organization was affected — the migration causing the lock contention only
  touched tables scoped to Northwind's larger dataset size during a bulk import that had
  run overnight.

## Timeline

| time (UTC) | event |
|---|---|
| 2026-03-02 06:00 | Overnight bulk import for Northwind Labs completes, leaving elevated table sizes and index rebuild activity in progress |
| 2026-03-02 07:58 | An unrelated deploy restarts the server process for a routine dependency bump; scheduler's `lastRunAt` map resets to empty |
| 2026-03-02 08:00 | First post-restart tick finds `digest-email` due (never run since restart) and enqueues it; `shouldRunForOrg` passes for Northwind (`digestHourUtc: 7`, tick catches the tail end of hour 7 into hour 8 boundary ambiguity — see Root cause) |
| 2026-03-02 08:00 | Digest sent to all 47 subscribers; several `markRead` calls fail silently due to lock contention from the still-finishing index rebuild |
| 2026-03-02 08:01–09:45 | Because several notifications never got marked read, and the scheduler's cadence guard for `digest-email` (60 minutes) was itself reset by the restart, multiple ticks in the following hour each find fresh due windows and re-run the job, resending overlapping digests |
| 2026-03-02 09:50 | Support ticket volume triggers on-call review; `t.abara` identifies the pattern from logs, scope `digest-email-job`, showing repeated `"digest failed"` lines for the same `recipientId` values |
| 2026-03-02 10:10 | Manual fix: `markRead` re-run directly against the stuck notification ids identified from logs, clearing the backlog |
| 2026-03-02 10:30 | Confirmed no further duplicate sends; incident closed operationally |
| 2026-03-04 | Team meets to review cadence policy (`notes-2026-03-04-digest-cadence-review.md`) |
| 2026-03-05 | `ADR-016` accepted, narrowing the scheduler's cadence guarantees |
| 2026-03-06 | Postmortem published |

## Root cause

Two independent factors combined:

1. **In-memory cadence state resets on restart.** `src/server/jobs/scheduler.ts`'s
   `lastRunAt` is a module-level `Map`, not a persisted value (see
   `runbook-scheduler-and-queue.md`). A process restart makes every job kind
   immediately eligible again regardless of when it last actually ran, which is fine in
   isolation — `digest-email`'s own `shouldRunForOrg` guard against the org's configured
   hour is supposed to be the real backstop against over-sending. The scheduler cadence
   is a *dispatch* throttle, not a correctness guarantee; `REQ-121`'s bound on the digest
   window is what was actually relied upon to prevent duplicates, and it depends on
   `markRead` actually completing.
2. **`markRead` failures do not undo the send.** `runDigestEmailJob`'s per-recipient body
   calls `sendEmail` and then, in a loop, `notificationRepo.markRead` for every entry in
   the bundle. The two are not transactional with each other. When lock contention from
   the concurrent index rebuild caused some `markRead` calls to throw, the job's own
   try/catch logged `"digest failed"` and counted the recipient in `result.failed` — but
   the email had already been sent, and the notifications remained unread. Every
   subsequent eligible tick within the following hour and a half saw those same
   notifications as still inside the digest window (`DES-129`) and included them again in
   a fresh digest, alongside whatever had accumulated since.

`ADR-005`'s original cadence description assumed jobs would run "hourly by default"
without distinguishing dispatch cadence from the underlying correctness invariant a job
depends on to avoid resending. `ADR-016`, accepted three days after this incident,
narrows that policy explicitly: cadence guards are documented as *throughput* controls,
not substitutes for idempotence inside the job body, and the digest job specifically was
called out as needing a stronger idempotence guarantee than "mark read after send."

## Detection

Detection was reactive — support ticket volume, not monitoring. There was no alert on
`digest-email-job`'s `result.failed` count, and no alert on send volume per recipient
per day. Both gaps are addressed in the action items below.

## Resolution

The immediate fix was operational: `t.abara` extracted the stuck notification ids from
the `"digest failed"` log lines (which include `orgId` and `recipientId` but not
individual notification ids, requiring a follow-up `buildDigest` call per affected
recipient to recover the exact set) and called `notificationRepo.markRead` directly for
each one, clearing the condition that was causing repeat inclusion. No code deploy was
needed to stop the storm — the underlying lock contention resolved on its own once the
overnight index rebuild finished, which happened to coincide with the manual fix and
made it hard to fully separate "the manual markRead calls fixed it" from "the contention
would have cleared on its own within the hour regardless."

## What went well / what did not

**What went well:**
- The scoped, structured logging (`createLogger("digest-email-job")`) made the pattern
  identifiable within minutes once someone looked, even though nothing paged
  automatically.
- No cross-tenant leakage and no data loss — the failure mode was purely "too many
  emails," which is bad but bounded.
- The fix required no code change or deploy, only a targeted data correction.

**What did not go well:**
- Nothing paged automatically; detection depended entirely on support noticing a ticket
  pattern.
- The job's failure semantics conflated "this recipient's digest send failed" with "this
  recipient's digest send succeeded but the follow-up bookkeeping failed," which are very
  different severities and were logged identically.
- The interaction between scheduler restarts and job-level idempotence had never been
  explicitly reasoned about before this incident, despite the scheduler having no
  persisted state by design (`DES-060`).

## Action items

| action | owner | status |
|---|---|---|
| Alert on `digest-email-job` `result.failed` exceeding a small threshold within one hour | j.novak | done |
| Alert on any single recipient receiving more than one digest email within a rolling 20-hour window | j.novak | done |
| Narrow the scheduler cadence policy to distinguish dispatch throttling from job-level idempotence (relates `ADR-016`) | t.abara | done |
| Make the digest job's `markRead` failure path log the specific notification ids, not just `orgId`/`recipientId`, to remove the manual `buildDigest` recovery step | t.abara | done |
| Evaluate wrapping the send-then-mark-read sequence so a `markRead` failure is retried on the very next tick rather than waiting for the notification to fall back into the next natural window | t.abara | in_review |

## Follow-up: why the scheduler's restart behavior is not itself the bug

Some of the initial incident discussion assumed the fix should be making
`lastRunAt` durable — persisting it to the database so a restart would not reset cadence
tracking. That idea was explicitly rejected during the 2026-03-04 review
(`notes-2026-03-04-digest-cadence-review.md`) once the group worked through the actual
failure chain: even with perfectly persisted cadence state, the storm would still have
happened, because the proximate trigger was the `markRead` failures, not the restart.
A restart merely made the first eligible window arrive slightly earlier than the
"true" hourly cadence would have; the repeat sends across the following ninety minutes
were entirely a function of notifications remaining unread across multiple genuinely
separate eligible windows, which persisted cadence tracking would not have prevented.
Treating the restart as the root cause would have produced a fix — durable scheduler
state — that added real complexity (a new table, a new failure mode for that table
itself) without addressing the mechanism that actually caused repeated sends. This
distinction is why `ADR-016`'s framing is about idempotence at the job-body level, not
about scheduler persistence, and why "make the scheduler durable" was explicitly logged
as a rejected alternative rather than an action item.

The incident also renewed a long-standing question about whether digest email sending
and the bookkeeping that prevents resending it should be one atomic operation. Because
`sendEmail` in this corpus performs no real network egress (`DES-132`), the two
operations happening to not be transactional with each other has limited consequence in
this environment specifically, but the team flagged that a production deployment
swapping in a real email provider would face exactly this same race with real customer
impact, and the fix proposed as an action item — retrying a failed `markRead` on the
very next tick rather than waiting for the notification to fall out of the window
naturally — was chosen specifically because it narrows that race without requiring a
full transactional rewrite of the send path.

## Related

- Code: `src/server/jobs/digest-email-job.ts`, `src/server/jobs/scheduler.ts`,
  `src/server/services/digest-service.ts`
- Ids: `REQ-119`, `REQ-121`, `REQ-122`, `REQ-123`, `DES-060`, `DES-128`, `DES-129`,
  `ADR-005`, `ADR-016`
- See also: `runbook-digest-job.md`, `runbook-scheduler-and-queue.md`,
  `notes-2026-03-04-digest-cadence-review.md`
