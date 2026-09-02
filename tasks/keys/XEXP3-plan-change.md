# Rubric — changing an organization's plan, especially downwards

Five elements, one point each. The grader has not seen the codebase;
everything needed to judge is stated here. Award the point when the answer
conveys the substance, even if worded differently. Do **not** award a point
for naming a file without the behaviour.

1. **Entry point and authorization.** `changePlanAction` in
   `src/actions/billing/change-plan.ts` goes through `withAction()` with
   `changePlanSchema`, checks `can(actor, "org:manage_billing", { kind:
   "billing", orgId })` and raises `ForbiddenActionError` otherwise; the
   service `changePlan()` in `src/server/services/billing-service.ts` repeats
   the check as `assertOrgScope` + `assertCan(actor, "org:manage_billing", …)`.
   Award the point for the billing permission being required at both layers,
   i.e. only an owner-level actor reaches the write.

2. **The downgrade guard: today's usage vs the *target* plan.** Both layers
   compare current consumption against the plan being moved to, with a
   requested delta of **zero** — nothing is being consumed, the question is
   only whether what already exists still fits.
   `assertPlanFitsCurrentUsage()` in the action reads `getUsage()` from
   `usage-service` and calls `wouldExceedLimit(input.plan, resource, used, 0)`
   over `seats`, `projects` and `storageMb`; `changePlan()` does the same over
   `SUMMARY_RESOURCES` (`seats`, `projects`, `storageMb`, `webhooks`) using
   `usageFor()`. Award the point for the zero-delta comparison against the
   target plan's limits as the thing that blocks a downgrade.

3. **The subscription row is the authority, not `organizations.plan`.**
   `planFor(orgId)` reads `subscriptionRepository.findSubscription` first and
   only falls back to the denormalised `organizations.plan` column when there
   is no subscription; the write itself is
   `subscriptionRepository.updateSubscriptionPlan(orgId, plan, interval)`.
   Award the point for identifying the subscription as the source of truth for
   which plan an org is on.

4. **The event and who reacts to it.** On success `changePlan` emits
   `billing.plan_changed` with `from` and `to` (stamped by `actorEnvelope`).
   Two subscribers pick it up: `activity-service` writes the audit entry, and
   `webhook-service`'s `registerWebhookListeners` enqueues a delivery for every
   enabled endpoint that subscribed to that event type. The plan change itself
   does not wait on either. Award the point for naming the event and at least
   one of its two subscribers as the follow-on work.

5. **What a plan number actually reaches, beyond billing.** The plan feeds
   `getPlanLimits()` / `getLimit()` in `src/config/plan-limits.ts`, which is
   what every later quota guard consults (`wouldExceedLimit` in issue, project,
   attachment, webhook and invitation services), what `checkLimit()` /
   `assertWithinLimit()` in `billing-service` turn into a `LimitCheck` for the
   usage meters, what gates plan-flagged features through `isEnabled`, and —
   less obviously — what sizes the rate-limit buckets: `configFor()` in
   `src/lib/rate-limit.ts` scales each bucket by
   `getPlanLimits(plan).apiRequestsPerHour`. Award the point for the plan value
   being read far outside the billing pages; the rate-limiter hop is a bonus.
