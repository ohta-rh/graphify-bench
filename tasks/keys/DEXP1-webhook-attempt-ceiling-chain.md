# Rubric — the webhook attempt ceiling, from requirement to code

Five elements, one point each. The grader has not seen the codebase or the
documentation; everything needed to judge is stated here. Award the point when
the answer conveys the substance, even if worded differently. Do **not** award a
point for naming a document or file without the behaviour it carries.

1. **The requirement, named and located.** The rule is `REQ-157` — "A delivery
   is abandoned after a fixed attempt ceiling" — defined in
   `corpus/taskflow/docs/requirements/webhooks.md`. It states `MAX_ATTEMPTS = 6`,
   that a delivery which reaches the ceiling stays in a terminal failed state
   visible through the delivery-attempts UI, and it names
   `tests/server/jobs.test.ts` as its verification. Award the point for
   identifying the governing requirement by id or by its document, together with
   the ceiling of six.

2. **The design layer above the code.** `docs/design/background-jobs.md` is the
   design document that specifies the delivery job's retry behaviour, and
   `docs/adr/ADR-018-webhook-retry-policy.md` is the decision it rests on
   (queue with capped exponential backoff rather than inline delivery).
   `docs/design/service-webhook.md` explicitly disclaims the retry policy as
   something the service does *not* own. Award the point for placing the ADR
   and at least one design document between the requirement and the code,
   rather than jumping straight from requirement to implementation.

3. **Where the ceiling actually lives, and how it is applied.**
   `src/server/jobs/webhook-delivery-job.ts` declares its own module-private
   `const MAX_ATTEMPTS = 6` and, inside `runWebhookDeliveryJob(now)`, checks
   `if (delivery.attempts > MAX_ATTEMPTS)` before doing anything else with a
   claimed row, calling `webhookRepo.markDeliveryFailed(...)` with a "giving up
   after N attempts" reason. Award the point for naming the job module and the
   local constant, and for the check being on the claimed delivery's `attempts`
   count.

4. **The documentation's account of the source of truth is wrong.** `REQ-157`'s
   third acceptance criterion asserts that `MAX_ATTEMPTS` is read from
   `WEBHOOK_MAX_ATTEMPTS` in `src/config/constants.ts` rather than hardcoded in
   the job, and lists `constants.ts` under its `Implemented by` field. The code
   does the opposite: `webhook-delivery-job.ts` imports nothing from
   `constants.ts`, and `constants.ts` does export `WEBHOOK_MAX_ATTEMPTS` — with
   the value **5**, not 6 — which nothing in the codebase reads. Award the point
   for stating plainly that the requirement's claim about where the ceiling
   comes from does not match the code. Noticing that
   `docs/design/background-jobs.md` already records the three-way disagreement
   (constants' 5, the job's 6, and the generic queue's own unrelated
   `MAX_ATTEMPTS = 5` in `src/server/jobs/queue.ts`) is a bonus, not required.

5. **Verification, and the off-by-one the comparison introduces.** The named
   spec is `tests/server/jobs.test.ts`, which exercises the backoff and ceiling
   behaviour. The comparison in the job is `attempts > MAX_ATTEMPTS`, not
   `>=`, so a delivery whose `attempts` equals 6 is still retried and a seventh
   attempt is reachable — which contradicts `REQ-157`'s first acceptance
   criterion that "a delivery's seventh attempt never happens." Award the point
   for identifying the verifying spec **and** for noticing the strict-inequality
   gap; award it also for an answer that reasons carefully about the boundary
   and reaches the same conclusion in different words.
