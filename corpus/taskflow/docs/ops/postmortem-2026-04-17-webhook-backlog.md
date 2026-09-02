---
title: Postmortem — webhook delivery backlog
id: OPS-PM-2026-04-17
status: approved
owners: [k.ferreira, j.novak]
last_updated: 2026-04-21
related: [REQ-154, REQ-155, REQ-156, REQ-157, DES-064, DES-162, ADR-018]
---

## Summary

On 2026-04-17, a large customer running a CI integration against Taskflow's webhooks
triggered a burst of roughly 9,000 `issue.updated` events in under ten minutes during a
scripted bulk-import of historical issues. Because webhook deliveries are fanned out one
row per subscribed endpoint per event (`DES-162`), and the customer had three endpoints
subscribed to `issue.updated`, this produced roughly 27,000 pending delivery rows almost
instantly. `CLAIM_BATCH = 25` per minute-long tick meant the queue could only drain
about 25 deliveries per minute in the worst case — far below the enqueue rate — and the
backlog took over eighteen hours to clear, during which every organization's webhook
deliveries, not just the customer who caused the burst, were delayed because
`claimPendingDeliveries` claims cross-tenant, oldest-first (`DES-215`).

## Impact

- Peak backlog: approximately 24,000 pending webhook deliveries.
- Time to clear: roughly 18 hours under normal drain rate.
- Every organization with webhooks enabled experienced delivery delays during the
  backlog window, not only the organization that caused the burst — smallest observed
  delay was about 40 minutes for an org whose own deliveries were enqueued near the
  front of the queue late in the window; largest was the full 18 hours for deliveries
  enqueued near the peak.
- No deliveries were lost. `MAX_ATTEMPTS = 6` in `webhook-delivery-job.ts` governs
  per-delivery abandonment, not queue admission, so nothing in the backlog was dropped
  for exceeding attempts — the delay was purely throughput, not failure.
- Several customers' downstream systems (which expected near-real-time webhook delivery)
  built up their own backlogs reconciling delayed events, though none reported data
  loss on their end either.

## Timeline

| time (UTC) | event |
|---|---|
| 2026-04-17 03:12 | Customer's scripted bulk-import begins, issuing status and field updates against roughly 3,000 issues in quick succession |
| 2026-04-17 03:14 | `issue.updated` event volume triggers `enqueueForOrg` to fan out to three subscribed endpoints per event; pending delivery count begins climbing sharply |
| 2026-04-17 03:20 | Pending delivery count crosses 10,000; `webhook-delivery` job continues ticking every minute, claiming 25 per pass as designed |
| 2026-04-17 03:45 | Customer's own integration opens a support ticket reporting "webhooks stopped arriving" — they were arriving, just severely delayed |
| 2026-04-17 04:10 | `k.ferreira` confirms the job is running normally every tick and not erroring; the bottleneck is `CLAIM_BATCH`, not a failure |
| 2026-04-17 04:30 | A second, unrelated organization's support ticket reports webhook delay, confirming cross-tenant impact from the shared claim queue |
| 2026-04-17 05:00 | `j.novak` and `k.ferreira` run the job function repeatedly in a tight loop from a one-off script to raise effective throughput beyond the scheduler's one-tick-per-minute cadence (see `runbook-webhook-retries.md` §3) |
| 2026-04-17 05:00–21:30 | Manual drain script runs intermittently alongside the scheduler; backlog decreases steadily but slowly given the volume |
| 2026-04-17 21:40 | Backlog fully cleared; all pending deliveries from the burst processed |
| 2026-04-18 | `k.ferreira` proposes raising `CLAIM_BATCH` and adding a per-organization delivery rate cap to prevent one tenant's burst from starving others |
| 2026-04-21 | Postmortem published; action items filed |

## Root cause

The webhook delivery pipeline's throughput is bounded by two fixed constants that were
never load-tested against a realistic bulk-write burst: the scheduler's one-tick-per-
minute cadence for `webhook-delivery` (already the tightest cadence of any job kind —
see `DES-060`'s table) and `CLAIM_BATCH = 25` claimed per tick. Under ordinary usage
this ceiling — 25 deliveries per minute, or 1,500 per hour — comfortably exceeds typical
event volume. It was never designed against a scripted bulk-import producing thousands
of events within minutes, a usage pattern the webhook feature's original design review
did not anticipate (`ADR-018`, which established the queued-not-inline delivery model,
focused on preventing a single slow receiver from blocking the request path, not on
sizing throughput against burst writers).

Compounding this, `claimPendingDeliveries` is deliberately cross-tenant
(`DES-215`) — one shared queue, oldest-first, with no per-organization fairness or
priority. This is the correct design for the common case (there is no meaningful notion
of "whose turn it is" across unrelated tenants under normal load) but means a single
tenant's burst directly delays every other tenant's deliveries with no isolation
mechanism in between. There is no per-org delivery rate limit analogous to the
request-level rate limiter (`src/lib/rate-limit.ts`'s `webhook:deliver` bucket, which
throttles the *creation* of deliveries via the API path, not the *draining* of an
already-queued backlog) — the customer's bulk-import went through Server Actions, not
the rate-limited API, and each Server Action call independently emitted its own
`issue.updated` event, so no single request was throttled even though the aggregate
volume was extreme.

## Detection

Detection was reactive, via customer support tickets from the affected customer and,
notably, from an unrelated customer who was collaterally delayed — there was no
proactive alert on queue depth or delivery latency. `pendingCount()` in `queue.ts` (the
general job queue, not webhook-specific) was not being sampled or alerted on at the time.

## Resolution

There was no code deploy during the incident. The team manually raised effective
throughput by running `runWebhookDeliveryJob` repeatedly in a script outside the normal
scheduler cadence (documented as a standing procedure in `runbook-webhook-retries.md`
§3), which let the backlog drain faster than the one-tick-per-minute baseline while
staying within the existing `CLAIM_BATCH` per call. No data was corrected or replayed —
every delivery in the backlog eventually cleared through the ordinary
claim-sign-deliver-mark path.

## What went well / what did not

**What went well:**
- No deliveries were lost, and the eventual clearing required no data repair — purely a
  throughput problem, not a correctness one.
- The manual "run the job in a tight loop" workaround, though ad hoc at the time, worked
  cleanly and is now a documented, repeatable procedure.
- The team correctly identified within roughly an hour that the bottleneck was
  structural (fixed batch size and cadence) rather than a bug, avoiding wasted time
  debugging a nonexistent failure.

**What did not go well:**
- No monitoring existed on queue depth, so the team learned about the backlog from
  customers rather than from an internal signal, for both the triggering organization
  and the collaterally affected one.
- A single tenant's write burst was able to degrade every other tenant's webhook
  latency, which is a fairness gap in the delivery design that the original `ADR-018`
  decision did not address, because it was scoped to the inline-vs-queued question, not
  to cross-tenant throughput isolation.
- There is still no automatic burst protection at the event-emission layer for
  Server-Action-driven bulk writes; a customer script issuing thousands of individual
  mutations has no built-in backpressure today.

## Action items

| action | owner | status |
|---|---|---|
| Add alerting on webhook delivery queue depth and on p95 delivery latency from enqueue to delivered | j.novak | done |
| Raise `CLAIM_BATCH` and evaluate a higher-frequency drain specifically for `webhook-delivery` under load, decoupled from the scheduler's fixed one-minute tick | k.ferreira | in_review |
| Design a per-organization fairness mechanism for `claimPendingDeliveries` so one tenant's burst cannot starve others (relates `DES-215`) | k.ferreira | in_review |
| Evaluate a per-org write-rate guard for bulk Server Action usage, independent of the existing API-path rate limiter | d.okafor | proposed |
| Document the manual drain procedure formally (done as part of this postmortem) | k.ferreira | done |

## Follow-up: why raising `CLAIM_BATCH` alone is not a complete fix

The most obvious lever — simply raising `CLAIM_BATCH` from 25 to a larger number — was
discussed at length and is tracked as an in-review action item, but the team was careful
to record why it is not sufficient on its own. A larger batch size raises the ceiling
for how much *one* tick can process, which helps the common case, but does nothing to
prevent one tenant's burst from monopolizing that larger ceiling just as thoroughly as
it monopolized the smaller one — the cross-tenant, oldest-first claim order
(`DES-215`) means a bigger batch still drains whichever organization happens to have
the most rows queued first, proportionally faster, but still first. Modeling the
2026-04-17 burst against a hypothetical `CLAIM_BATCH` of 200 suggested the backlog
would have cleared in under two hours instead of eighteen, which is a real improvement,
but a large enough burst from a large enough customer would still be capable of
producing multi-hour cross-tenant delays at any fixed batch size. This is why the
fairness mechanism — some form of per-organization interleaving or a cap on how many
consecutive deliveries for one org a single claim can include — is tracked as a separate,
still-open action item rather than being folded into "raise the constant" and considered
done.

The postmortem review also revisited whether the customer's bulk-import pattern itself
should be discouraged or throttled at the product level — for example, by
recommending or requiring bulk-import tooling to use a dedicated import path that emits
a single summary event rather than one `issue.updated` per row. No decision was reached
on that question during this incident; it was handed to product and forwarded as an
open question for a future design review rather than resolved here, since it touches
the event model (`TaskflowEventMap`) more broadly than the webhook delivery path alone.

## Related

- Code: `src/server/jobs/webhook-delivery-job.ts`, `src/server/repositories/webhook-repository.ts`,
  `src/server/jobs/queue.ts`, `src/lib/rate-limit.ts`
- Ids: `REQ-154`, `REQ-155`, `REQ-156`, `REQ-157`, `REQ-161`, `DES-064`, `DES-162`,
  `DES-215`, `ADR-011`, `ADR-018`
- See also: `runbook-webhook-retries.md`, `notes-2026-07-13-webhook-secret-rotation.md`
