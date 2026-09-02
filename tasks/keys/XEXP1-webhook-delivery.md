# Rubric — a domain event becoming an outgoing webhook delivery

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **The bus, not the mutation, starts the delivery.** The service that
   performed the write (e.g. `issue-service.createIssue`) only calls `emit()`
   on `src/lib/event-bus.ts`. `registerWebhookListeners()` in
   `src/server/services/webhook-service.ts` — wired at process start from
   `registerEventHandlers()` in `event-registry.ts` — subscribes to
   `issue.created`, `issue.status_changed`, `comment.created`,
   `billing.plan_changed` and the generic `webhook.delivery_requested`. Award
   the point for identifying the webhook side as an event *subscriber*, so a
   mutation never waits on, or fails because of, a customer's endpoint.

2. **Which endpoints get a row.** Each handler calls the private
   `enqueueForOrg(orgId, eventType, JSON.stringify(payload))`, which lists the
   org's endpoints (`webhookRepository.listEndpoints`), skips any endpoint that
   is not `enabled`, parses the endpoint's `eventTypes` JSON column and skips
   it unless the array `includes` this event type, and only then calls
   `webhookRepository.enqueueDelivery`. Award the point for per-endpoint
   filtering on `enabled` **and** the endpoint's subscribed event-type list.

3. **The queue is drained by a separate cron-triggered job.** `POST` on
   `src/app/api/cron/webhook-delivery/route.ts` authenticates with
   `assertCronSecret` and calls `runWebhookDeliveryJob(new Date())` in
   `src/server/jobs/webhook-delivery-job.ts`, which claims up to `CLAIM_BATCH`
   (25) pending rows via `webhookRepository.claimPendingDeliveries`. Award the
   point for the enqueue and the send being two different processes joined by
   the delivery table, with the Route Handler as a thin trigger.

4. **What the job checks before it sends, and its retry policy.** Per claimed
   row, in order: the org's plan must still allow webhooks
   (`orgAllowsWebhooks` → `getPlanLimits(plan).webhooks > 0` **and**
   `isEnabled("webhooks", buildFlagContext(null, org))`); `delivery.attempts`
   must not exceed `MAX_ATTEMPTS` (6); the endpoint must still exist and be
   enabled. Any of those marks the row failed via
   `webhookRepository.markDeliveryFailed`. Retries wait `backoffMs(attempts)` —
   `2 ** (attempts - 1) * 1000`, capped at 300,000 ms — and attempt 0 retries
   immediately. Award the point for at least the attempt cap plus the doubling,
   capped backoff.

5. **Signing, and the corpus's deliberate absence of HTTP.** The payload is
   signed with `signPayload(endpoint.secret, delivery.payload)` in
   `webhook-service.ts` — an HMAC-SHA256 hex digest via `node:crypto`
   `createHmac` — using the secret minted once by `createWebhook` and never
   rotated. There is no outbound HTTP anywhere: "delivery" means computing that
   signature and logging the attempt before `webhookRepository.markDelivered`,
   which the job's own header comment states. Award the point for the HMAC
   signature over the payload with the per-endpoint secret; noticing that no
   request is actually sent is a bonus.
