---
title: Queue webhook deliveries with capped exponential backoff
id: ADR-018
status: accepted
owners: [k.ferreira]
last_updated: 2026-03-26
related: [REQ-154, REQ-155, REQ-156, REQ-157, ADR-005, ADR-016, ADR-011]
---

# ADR-018 — Queue webhook deliveries with capped exponential backoff

## Status

Accepted. Supersedes the inline-delivery approach ADR-005 originally
sketched for webhooks, as recorded in that ADR's own Consequences section.
In production since March 2026.

## Context

ADR-005's original design notes for webhooks imagined
`webhook.delivery_requested` as a bus event whose handler would attempt the
actual HTTP delivery inline, inside the same `emit()` call that the
triggering domain event (an issue status change, say) was already awaiting.
Kaya Ferreira, implementing this in March 2026, identified the problem
before it shipped: `emit()` awaits every subscribed handler via
`Promise.allSettled` before returning (ADR-005), which means whatever the
slowest handler does becomes part of the latency of the original mutation.
An HTTP call to a customer-configured endpoint is exactly the kind of
operation that can be slow, timeout, or hang — a slow or unreachable webhook
endpoint would have stalled the issue-status-change request that triggered
it, for a concern (delivering to a third party) that has nothing to do with
whether the status change itself succeeded.

REQ-154 makes this explicit as a requirement, not just a design
preference: deliveries are queued, never sent inline with a request. Beyond
the latency problem, the team also needed real retry semantics — REQ-156
requires failed deliveries retry with exponential backoff, and REQ-157
requires a delivery be abandoned after a fixed attempt ceiling, neither of
which fits naturally into a single inline attempt inside an event handler.

Complicating things further: Taskflow's corpus builds and runs fully
offline, with no outbound network access at all — there is no real HTTP
client making real requests to real customer endpoints anywhere in this
codebase. The team had to design a retry and backoff system whose
correctness could be fully exercised and tested without ever actually
sending a byte over a wire.

## Decision

`webhook.delivery_requested` handlers, registered via
`registerWebhookListeners()` in `src/server/services/webhook-service.ts`,
do exactly one thing: call `webhookRepo.enqueueDelivery()`, inserting a row
into the delivery queue and returning immediately. The bus event remains the
signal that a delivery is needed (REQ-160 — the payload carries the event
type and envelope); it is no longer where the attempt happens. The actual
work is drained later by `runWebhookDeliveryJob` in
`src/server/jobs/webhook-delivery-job.ts`, one of the seven job kinds
ADR-016's scheduler ticks, on the tightest cadence in the whole
`CADENCE_MINUTES` table — once a minute, reflecting how much sooner a
webhook consumer expects to see events land compared to, say, a daily search
reindex.

Each pass claims up to `CLAIM_BATCH` (25) pending deliveries via
`webhookRepo.claimPendingDeliveries()` (REQ-155 — bounded batch claiming, so
one pass cannot try to process an unbounded backlog and starve the rest of
that minute's scheduler tick). For each claimed delivery: if the org's plan
does not include webhooks (`getPlanLimits(org.plan).webhooks <= 0`) or the
`webhooks` flag evaluates false via `isEnabled()` (ADR-012), the delivery is
marked failed immediately with an explanatory message — a downgrade mid-
flight should not silently keep retrying forever. If `delivery.attempts >
MAX_ATTEMPTS` (6), it is marked failed for good (REQ-157's attempt ceiling).
If the target endpoint is missing or `!endpoint.enabled`, it fails fast
(REQ-158) rather than attempting and failing on a delivery nobody will ever
receive. Otherwise, since there is no real outbound HTTP in this offline
build, "delivery" means computing the HMAC-SHA256 signature the receiver
would verify — `signPayload(endpoint.secret, delivery.payload)`, defined in
`webhook-service.ts` using Node's `createHmac("sha256", secret)` — and
logging the attempt with that signature, which is what a real integration's
observability would show regardless of whether this build ever performs the
network call itself; `markDelivered()` then records success.

`backoffMs(attempts)`, exported from the job module for direct unit testing,
implements the exponential curve: `attempts <= 0` returns 0 (an
immediate first retry); otherwise `min(300_000, 2^(attempts-1) * 1_000)` —
one second, two, four, eight, and so on, doubling each attempt, capped at
five minutes (300,000 ms) regardless of how many attempts have accumulated,
satisfying REQ-156's exponential-backoff requirement with an explicit,
independently-testable ceiling rather than an unbounded growing delay.
Delivery attempts remain visible in the settings UI (REQ-159) by querying the
same delivery rows this job reads and writes, giving an admin a direct view
of attempt count, last error message, and next scheduled retry.

## Consequences

**What this buys the team.** No mutation's latency depends on an external
endpoint's responsiveness — because delivery is fully decoupled from the
triggering domain event, a slow or dead webhook endpoint cannot make issue
creation, status changes, or comments feel slow to the user who triggered
them, closing off exactly the failure mode ADR-005's original inline sketch
would have opened. The bounded `CLAIM_BATCH` means one scheduler tick's
webhook-delivery pass has a predictable upper bound on work, keeping it from
crowding out the same tick's other due job kinds. `backoffMs()` being a pure,
directly-testable function meant its curve could be verified exactly —
test-level coverage asserts the 1s/2s/4s progression and the 300,000 ms
cap — without any dependency on real elapsed wall-clock time or a real
network. The fail-fast paths (plan downgrade, disabled endpoint, missing
endpoint) mean the retry ceiling is reserved for deliveries that have a
genuine chance of eventually succeeding, rather than burning all six
attempts against an endpoint that was disabled the moment the event fired.

**What it costs.** The two-step model (enqueue now, attempt later, up to a
minute afterward) means webhook delivery is never instantaneous even in the
best case — a customer integration watching for near-real-time events should
expect up to roughly a minute of latency between the domain event and the
first delivery attempt, a property of the scheduler's tick granularity
(ADR-016) that webhook delivery inherited along with every other scheduled
job kind, even though its own cadence is the tightest available. The
offline build's "delivery" being signature-computation-and-logging rather
than a real HTTP call is also a real gap between this corpus and a genuine
production deployment: `signPayload()` and the retry bookkeeping around it
are exactly right, and are the part the team explicitly wanted correct, per
the job module's own comment ("there is no outbound HTTP in Taskflow... the
retry bookkeeping around it is the part that has to be right"), but wiring
an actual `fetch()` call to the endpoint URL, with its own timeout and
network-error handling feeding back into the same attempt-counting logic, is
necessary before this becomes a real integration and is explicitly out of
scope for the current build.

## Alternatives considered

**Inline delivery inside the `webhook.delivery_requested` handler**, the
original ADR-005 sketch. Superseded for the latency-coupling reason in
Context — this is the alternative this ADR exists specifically to replace,
and ADR-005's own Consequences section records the supersession.

**Fixed-delay retry** (retry every N seconds, no backoff curve) instead of
exponential. Rejected because a persistently unreachable endpoint would be
retried at a constant, potentially aggressive rate for all six attempts,
whereas exponential backoff spends less total effort on an endpoint that
looks unlikely to recover quickly while still giving a transient failure (a
brief customer-side outage) a fast first retry.

**Unlimited retry attempts**, relying only on backoff growth to bound total
effort. Rejected in favor of REQ-157's explicit ceiling: an endpoint that
never recovers should eventually be marked failed and surfaced to the admin
(REQ-159) rather than silently retried forever at the five-minute cap,
consuming a claim slot on every scheduler pass indefinitely.

## References

- REQ-154 (deliveries queued, never sent inline), REQ-155 (claimed in
  bounded batches), REQ-156 (exponential backoff), REQ-157 (attempt
  ceiling), REQ-158 (fail fast to disabled endpoints), REQ-159 (attempts
  visible in settings UI), REQ-160 (payloads carry event type and envelope),
  REQ-161 (delivery rate limited per organization)
- ADR-005 (the event bus this ADR's design supersedes the original webhook
  sketch of), ADR-016 (the scheduler that drains this job on a one-minute
  cadence), ADR-011 (the separate `webhook:deliver` rate-limit bucket
  governing REQ-161, distinct from this ADR's retry ceiling)
- Code: `src/server/jobs/webhook-delivery-job.ts` (`runWebhookDeliveryJob`,
  `backoffMs`, `CLAIM_BATCH`, `MAX_ATTEMPTS`, `orgAllowsWebhooks`),
  `src/server/services/webhook-service.ts` (`signPayload`,
  `registerWebhookListeners`), `src/server/repositories/webhook-repository.ts`
  (`enqueueDelivery`, `claimPendingDeliveries`, `markDelivered`,
  `markDeliveryFailed`)
