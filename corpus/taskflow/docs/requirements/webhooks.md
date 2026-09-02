---
title: Webhook requirements
id: REQ-WEBHOOKS
status: approved
owners: [product-team, k.ferreira]
last_updated: 2026-05-26
related: [REQ-136, REQ-152, ADR-018, DES-170]
---

## Scope

This document defines the requirements for webhook endpoint management and outbound delivery:
configuration, signing, queuing, batched claiming, retry with backoff, the attempt ceiling,
and visibility into delivery history. It does not define the plan quota arithmetic
(`billing-and-plan-limits.md`) or the general event catalogue (referenced throughout, defined
in `src/types/event.ts`).

## Context

`webhook-service.ts` manages endpoints (`createWebhook`, `updateWebhook`, `deleteWebhook`,
`listWebhooks`) and bridges the event bus to the delivery queue: `registerWebhookListeners`
subscribes to `webhook.delivery_requested` and calls
`webhook-repository.ts#enqueueDelivery` for every active endpoint subscribed to that event
type. Endpoint rows and delivery-attempt rows live in
`src/server/repositories/webhook-repository.ts`; delivery itself never happens inline with
the request that produced the triggering event (`REQ-154`) — it is always a queue-and-drain
pattern consumed by `webhook-delivery-job.ts` on its own cadence.

`ADR-018` documents the decision to queue deliveries with capped exponential backoff instead
of the simpler inline-delivery approach `ADR-005` originally sketched for the event bus in
general: webhook endpoints are third-party HTTP servers outside Taskflow's control, and a
slow or down endpoint cannot be allowed to block the request that triggered the event, or to
retry synchronously inside that request's lifetime. `runWebhookDeliveryJob(now)` runs on the
`webhook-delivery` cadence — every 1 minute, the tightest cadence of any job, chosen because
webhook consumers (billing systems, chat integrations, CI triggers) are often time-sensitive.

Each delivery attempt claims a bounded batch (`CLAIM_BATCH = 25`) via
`claimPendingDeliveries(limit)`, so one job tick cannot try to drain an unbounded backlog in
one pass and risk starving other organizations' deliveries if one org has a large pending
queue. A delivery is abandoned after `MAX_ATTEMPTS = 6` failed tries, with `backoffMs()`
computing 1s, 2s, 4s, 8s, 16s, 32s — doubling each attempt, capped at 300000 ms (5 minutes)
— though in practice six attempts at doubling delay from a 1-minute-cadence job never
actually reaches the cap; the cap exists as a safety bound for any future change to the
attempt count or cadence, not because the current numbers require it.

Every endpoint holds a secret (`REQ-153`) used by `signPayload(secret, payload)` in
`webhook-service.ts` to HMAC-sign the outgoing body, letting the receiving server verify
the request actually came from Taskflow and was not forged or tampered with in transit.

Delivery is deliberately fire-and-forget from the perspective of the domain service that
triggered the underlying event: `issue-service.ts`, `comment-service.ts` and the rest never
learn whether a webhook delivery eventually succeeded, failed, or was abandoned after six
attempts. That feedback loop exists only inside the settings UI (`REQ-159`), which is a
conscious layering choice — coupling issue or comment mutation logic to webhook delivery
outcomes would reintroduce exactly the kind of cross-cutting dependency `ADR-005`'s
in-process event bus was designed to avoid, at the cost of making delivery failures a
"go check the settings page" concern rather than something that surfaces automatically to
the person who took the original action.

## Open questions

1. `REQ-159` says delivery attempts are visible in the settings UI, but this document does
   not specify a retention policy for delivery-attempt rows distinct from the organization's
   general `retentionDays` — whether stale delivery history for a long-lived endpoint grows
   unbounded is not addressed by any requirement here.
2. `REQ-157`'s abandonment after six attempts has no requirement describing whether the
   endpoint owner is notified of the abandonment, versus only being able to discover it by
   checking the delivery-attempts UI.
3. Whether re-enabling a previously disabled endpoint (`REQ-158`) should retry deliveries
   that were fast-failed while it was disabled, or whether those are permanently lost, is
   unresolved.
4. `REQ-161`'s per-org delivery rate limit and `REQ-155`'s per-tick claim batch interact in
   a way no requirement fully specifies: a burst well within the claim batch but above the
   rate-limit bucket defers to a later tick, but nothing here says how many ticks a
   deferred-but-not-failed delivery may accumulate before it is effectively starved out by
   newer events from the same organization repeatedly winning the claim.

### REQ-150 — Webhook endpoints are configured per organization

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-010, REQ-136
- **Implemented by:** `src/server/repositories/webhook-repository.ts` — `listEndpoints`, `src/server/services/webhook-service.ts` — `createWebhook`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`webhook-repository.ts`'s endpoint table carries `org_id`; `listEndpoints(orgId)` and every
other function scope strictly to one organization, matching the tenancy discipline every
other domain follows. There is no shared or platform-level webhook endpoint that spans
organizations.

**Acceptance criteria**

1. `listEndpoints` never returns another organization's endpoints.
2. `createWebhook`'s input is validated against `src/schemas/webhook.ts` and always carries
   the actor's `orgId`, never a client-supplied one.
3. Deleting an organization (soft delete, `REQ-007`) does not delete its webhook endpoints
   outright, consistent with the archive-not-delete pattern, but active delivery for an
   archived org's endpoints should not continue — see `REQ-158`'s disabled-fast-fail path as
   the closest existing mechanism.

### REQ-151 — Endpoint management requires admin

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-024, ADR-003
- **Implemented by:** `src/lib/permissions.ts` — `ROLE_MATRIX`
- **Verified by:** `tests/lib/permissions.matrix.test.ts`

`webhook:manage`'s `ROLE_MATRIX` minimum is `admin`; there is no ownership escalation for
webhook endpoints the way there is for issues and comments, since an endpoint is
organization infrastructure, not personally authored content — every admin can manage every
endpoint equally, with no notion of "the admin who created it" having special standing.

**Acceptance criteria**

1. A `member` cannot call `createWebhookAction`, `updateWebhookAction` or
   `deleteWebhookAction` regardless of any relationship to the endpoint.
2. `webhook:manage` does not appear in the ownership-escalation action list in
   `src/lib/permissions.ts`.
3. Any `admin` in the org, not only the endpoint's creator, can delete or update it.

### REQ-152 — Webhooks require a plan that includes them

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-136, REQ-188, ADR-012
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/server/services/webhook-service.ts` — `createWebhook`
- **Verified by:** `tests/lib/feature-flags.test.ts`

The `webhooks` feature flag (`growth` plan minimum, **not** overridable, per the product
facts) gates both endpoint creation and delivery — unlike most flags, `webhooks` cannot be
turned on early for a `starter` org via an org-level override, which is a deliberate
restriction distinct from the endpoint-count quota in `REQ-136`.

**Acceptance criteria**

1. `createWebhookAction` on a `free` or `starter` org without the flag returns
   `FeatureDisabledError`/`feature_disabled`, independent of the count-based quota check.
2. An org-level override attempting to force `webhooks` on below `growth` has no effect,
   since the flag definition marks it non-overridable.
3. `runWebhookDeliveryJob` skips delivery for any endpoint belonging to an org whose current
   plan no longer includes the flag (a downgrade case), even if the endpoint row itself
   still exists.

### REQ-153 — Each endpoint holds a secret used to sign payloads

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-160, DES-180
- **Implemented by:** `src/server/repositories/webhook-repository.ts` — `insertEndpoint`, `src/server/services/webhook-service.ts` — `signPayload`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`insertEndpoint(input, secret)` stores a per-endpoint secret generated at creation;
`signPayload(secret, payload)` HMAC-signs the serialized delivery body, and the signature is
sent alongside the payload so the receiving server can verify authenticity. The secret is
never re-derivable from the signature; it is a shared value fixed at endpoint creation and
rotatable only by recreating the endpoint (there is no `rotateSecret` in the manifest).

**Acceptance criteria**

1. Two endpoints, even for the same organization, receive independently generated secrets.
2. `signPayload` produces a deterministic signature for a given secret and payload, so the
   receiving server's own recomputation matches.
3. The secret is never included in `listWebhooks`'s response shown to the settings UI in
   plaintext after initial creation (only surfaced once, at creation time, if at all,
   matching the general practice for credential-like values).

### REQ-154 — Deliveries are queued, never sent inline with a request

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-018, ADR-005

`registerWebhookListeners`'s handler for `webhook.delivery_requested` only calls
`enqueueDelivery`; it never performs the outbound HTTP call itself. This decouples the
request that triggered the underlying domain event (an issue status change, say) from the
health and latency of a third-party webhook receiver.

**Acceptance criteria**

1. No code path between an original domain-event emission and `enqueueDelivery` performs
   network I/O.
2. A Server Action that triggers a webhook-eligible event returns to its caller without
   waiting for any webhook delivery attempt.
3. `enqueueDelivery`'s write happens synchronously within request handling; only the actual
   HTTP delivery is deferred to the job.

**Implemented by:** `src/server/services/webhook-service.ts`, `src/server/repositories/webhook-repository.ts`
**Verified by:** `tests/server/jobs.test.ts`

### REQ-155 — Deliveries are claimed in bounded batches

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-154, ADR-018
- **Implemented by:** `src/server/repositories/webhook-repository.ts` — `claimPendingDeliveries`
- **Verified by:** `tests/server/jobs.test.ts`

`CLAIM_BATCH = 25` bounds how many pending deliveries `claimPendingDeliveries(limit)`
returns to one job tick, preventing a large backlog for one organization from starving
delivery attempts for every other organization's endpoints in the same tick, given the job
runs across all organizations rather than per-org.

**Acceptance criteria**

1. `claimPendingDeliveries` never returns more than `CLAIM_BATCH` rows in one call.
2. A claimed delivery is not claimable again by a concurrent tick until it is marked
   delivered, failed, or its claim expires.
3. An organization with a delivery backlog larger than `CLAIM_BATCH` has its remaining
   deliveries picked up on subsequent ticks, not dropped.

### REQ-156 — Failed deliveries retry with exponential backoff

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-157, ADR-018
- **Implemented by:** `src/server/jobs/webhook-delivery-job.ts` — `backoffMs`, `runWebhookDeliveryJob`
- **Verified by:** `tests/server/jobs.test.ts`

`backoffMs(attempts)` in `webhook-delivery-job.ts` returns 1000, 2000, 4000ms and so on,
doubling per attempt and capped at 300000 ms. A failed delivery is not retried immediately
within the same tick; `markDeliveryFailed` records the failure and the next eligible attempt
waits at least `backoffMs(attempts)` before becoming claimable again.

**Acceptance criteria**

1. `backoffMs(1)` is 1000; `backoffMs(2)` is 2000; the sequence doubles until the 300000 ms
   cap.
2. A delivery is not reclaimed by `claimPendingDeliveries` before its backoff interval has
   elapsed since the last failed attempt.
3. `backoffMs` never returns a value exceeding 300000, regardless of how high `attempts`
   grows.

### REQ-157 — A delivery is abandoned after a fixed attempt ceiling

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-156, DES-180
- **Implemented by:** `src/server/jobs/webhook-delivery-job.ts` — `runWebhookDeliveryJob`, `src/config/constants.ts` — `WEBHOOK_MAX_ATTEMPTS`
- **Verified by:** `tests/server/jobs.test.ts`

`MAX_ATTEMPTS = 6`. Once a delivery's attempt count reaches this ceiling without a
successful response, it is no longer retried; it stays in a terminal failed state, visible
through the delivery-attempts UI (`REQ-159`) but no longer occupying the retry queue.

**Acceptance criteria**

1. A delivery's seventh attempt never happens; the sixth failure is terminal.
2. The terminal state is distinguishable in the delivery-attempts UI from an in-progress
   retry, so an operator can tell "still trying" from "gave up."
3. `MAX_ATTEMPTS` is read from `WEBHOOK_MAX_ATTEMPTS` in `src/config/constants.ts`, not
   hardcoded separately in `webhook-delivery-job.ts`.

### REQ-158 — Deliveries to a disabled endpoint fail fast

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-136, REQ-152
- **Implemented by:** `src/server/jobs/webhook-delivery-job.ts` — `runWebhookDeliveryJob`
- **Verified by:** `tests/server/jobs.test.ts`

An endpoint can be toggled disabled without being deleted; a delivery targeting a disabled
endpoint is marked failed immediately by the job, without consuming an HTTP round trip or
counting toward the meaningful part of the attempt budget the way a genuine network failure
would, since the failure here is a known local condition, not the endpoint's own health.

**Acceptance criteria**

1. `runWebhookDeliveryJob` checks the endpoint's enabled state before attempting the HTTP
   call, not after a failed attempt.
2. A disabled endpoint's pending deliveries are marked failed without incrementing latency
   metrics an actual network call would produce.
3. Re-enabling the endpoint allows new deliveries (from new events) to queue and attempt
   normally; whether previously fast-failed deliveries are retried is the open question
   noted above.

### REQ-159 — Delivery attempts are visible in the settings UI

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-157, DES-190
- **Implemented by:** `src/app/(dashboard)/[orgSlug]/settings/webhooks/webhook-manager.tsx`, `src/server/repositories/webhook-repository.ts` — `markDelivered`, `markDeliveryFailed`
- **Verified by:** none — covered indirectly; see the gaps section of the test plan

`src/app/(dashboard)/[orgSlug]/settings/webhooks/webhook-manager.tsx` renders each
endpoint's recent delivery attempts, backed by the delivery-attempt rows
`webhook-repository.ts` maintains alongside `markDelivered`/`markDeliveryFailed`, giving an
admin visibility into whether their integration is actually receiving events without needing
to inspect logs outside the product.

**Acceptance criteria**

1. The webhook settings page shows, at minimum, delivery status, attempt count and last
   attempt time per endpoint.
2. A terminally failed delivery (`REQ-157`) is visually distinguishable from one still
   retrying.
3. The list only shows the requesting organization's own endpoints and their own deliveries.

### REQ-160 — Webhook payloads carry the event type and envelope

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-153, DES-071
- **Implemented by:** `src/server/repositories/webhook-repository.ts` — `enqueueDelivery`
- **Verified by:** `tests/server/jobs.test.ts`

Every delivered payload includes the originating event's type string (one of the 21 keys in
`TaskflowEventMap`) and the standard `EventEnvelope` fields (`orgId`, `actorId`,
`occurredAt`), so a receiving integration can dispatch on event type without needing a
Taskflow-specific schema per event beyond what the envelope already standardizes.

**Acceptance criteria**

1. `enqueueDelivery`'s `eventType` parameter matches a real key from `TaskflowEventMap`.
2. Every delivered payload, when parsed, includes `orgId`, `actorId` and `occurredAt` at
   minimum.
3. The payload is serialized identically regardless of which endpoint receives it — there is
   no per-endpoint payload transformation.

### REQ-161 — Webhook delivery is rate limited per organization

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-096, REQ-176, ADR-011
- **Implemented by:** `src/lib/rate-limit.ts` — `consumeRateLimit`, `getBucketConfig`
- **Verified by:** `tests/lib/rate-limit.test.ts`

The `webhook:deliver` rate-limit bucket (capacity 100, refill 50/minute) bounds how fast one
organization's queued deliveries can be attempted, independent of the `CLAIM_BATCH` bound
that limits one job tick's total work — this bucket exists specifically so a single
organization generating an unusually high event volume cannot monopolize the delivery job's
attention across ticks at every other organization's expense.

**Acceptance criteria**

1. `consumeRateLimit(orgId, 'webhook:deliver', 1)` is checked before each delivery attempt
   for that org within a tick.
2. The bucket's capacity scales with the org's `apiRequestsPerHour` plan field, capped at
   100x the base rate, per the general rate-limiter scaling rule.
3. Exceeding the bucket defers the delivery to a later tick rather than counting it as a
   failed attempt against `MAX_ATTEMPTS`.
