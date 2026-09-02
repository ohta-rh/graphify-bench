---
title: Billing and plan limits requirements
id: REQ-BILLING
status: approved
owners: [product-team, r.saito]
last_updated: 2026-05-21
related: [REQ-043, REQ-064, ADR-010, DES-160]
---

## Scope

This document defines the requirements for subscriptions, the four-plan quota ladder, usage
counting, invoices, trial expiry and the events billing changes emit. It is the source of
truth for every numeric limit other domain documents reference — `REQ-043` in
`projects.md` and `REQ-064`/`REQ-075` in `issues.md` all cite the quota rules defined here
rather than restating the numbers.

## Context

`src/config/plan-limits.ts` declares `PLAN_LIMITS`, a single table mapping each of the four
plans (`free`, `starter`, `growth`, `enterprise`, ordered by `PLAN_ORDER`) to a `PlanLimits`
record: `plan`, `seats`, `projects`, `issuesPerProject`, `storageMb`,
`apiRequestsPerHour`, `webhooks`, `retentionDays`, `includedFlags` and
`priceCentsPerSeatMonthly`. `ADR-010` is the decision to keep every quota in this one table
rather than scattering limit constants across the services that enforce them — `getPlanLimits(plan)`
and `getLimit(plan, resource)` are the only ways any other module reads a number from it, and
`wouldExceedLimit(plan, resource, used, requested = 1)` is the only comparison function, used
identically by `project-service.ts`, `issue-service.ts`, `invitation-service.ts`,
`attachment-service.ts` and `webhook-service.ts`.

`billing-service.ts` is the single reader of `PLAN_LIMITS` on the server in the sense that
every other service asks it (indirectly, through `getPlanLimits`/`wouldExceedLimit`) rather
than importing the config module directly — the requirement this establishes (`REQ-132`) is
about not letting quota logic fork into two implementations that could drift.

`enterprise`'s unlimited fields are represented as `Number.POSITIVE_INFINITY`
(`UNLIMITED`), not a large sentinel integer like `999999` — a deliberate choice
(`REQ-137`) that makes `wouldExceedLimit`'s comparison correct by construction (nothing
exceeds infinity) rather than correct by convention (nothing plausible exceeds a very large
number, until it does).

Usage counters live in a separate table (`organization_usage`,
`src/server/repositories/usage-repository.ts`), incremented at write time
(`incrementUsage`) and periodically reconciled in bulk by `usage-rollup-job.ts` on the
`usage-rollup` cadence (every 15 minutes) — the fastest of the scheduled jobs, reflecting how
central accurate usage is to every quota check across the product. A quota breach does not
throw an unhandled exception up to a 500; it is caught at the domain-error layer and mapped
to the `plan_limit_exceeded`/402 error code (`REQ-138`), which is a distinct HTTP status
from every other error Taskflow produces, chosen so a billing integration on the client side
can distinguish "you did something wrong" from "you need to pay for more."

## Open questions

1. `REQ-141` refuses downgrades while usage exceeds the target plan, but there is no
   requirement describing a grace period or a forced-archival flow to help a customer who
   wants to downgrade but is over the new plan's limits — today they are simply stuck at the
   current plan until they manually reduce usage.
2. `REQ-075` in `issues.md` counts attachments against `storageMb`, but this document does
   not specify whether permanently purging an archived, retention-expired issue
   (`REQ-231`) decrements `storageMb` usage — the rollup job would eventually correct it,
   but there is no requirement for immediate reconciliation on purge.
3. `REQ-143`'s invoice generation cadence is not tied to any of the seven scheduled job
   kinds declared in `src/server/jobs/types.ts`; how invoices are actually produced without
   a dedicated job is not fully specified in this corpus.

### REQ-130 — Every organization has exactly one subscription

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-003, REQ-006, DES-160

`subscription-repository.ts#findSubscription(orgId)` assumes at most one row per
organization, seeded as `free` at organization creation (`REQ-003`) and never left absent
afterward — there is no organization state where billing is undefined, which is what lets
every quota check assume `getBillingSummary` will always resolve a plan rather than handling
a "no subscription yet" branch.

**Acceptance criteria**

1. `createOrganization` always inserts exactly one subscription row alongside the org.
2. `findSubscription` returning `null` is treated as a data-integrity bug, not a valid
   steady state, anywhere it is called from `billing-service.ts`.
3. Canceling a subscription (`REQ-142`-adjacent) changes its state; it does not delete the
   row, preserving the one-subscription-per-org invariant.

### REQ-131 — Four plans form an ordered ladder

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-141, ADR-010

`PLAN_ORDER` in `src/config/plan-limits.ts` fixes `free < starter < growth < enterprise`,
and `planAtLeast(plan, threshold)` is the comparison every plan-gated feature flag
(`REQ-188`) and every downgrade check (`REQ-141`) is built on. There is no plan outside this
ladder and no per-customer custom plan; enterprise pricing negotiations in the real business,
if they existed, would still map onto this same four-tier structure in the product.

**Acceptance criteria**

1. `planAtLeast('growth', 'starter')` is `true`; `planAtLeast('starter', 'growth')` is
   `false`.
2. Every plan-gated flag strategy (`REQ-188`) references one of these four plan values, not
   an ad hoc string.
3. `PLAN_ORDER`'s length is exactly four; adding a plan requires updating this one table, not
   scattered comparisons.

### REQ-132 — Plan quotas are declared in one place

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-010, REQ-008, DES-160

`PLAN_LIMITS` is the single source every quota-relevant service reads from, through
`getPlanLimits`/`getLimit`. No service hardcodes a numeric limit of its own — `issue-service.ts`
does not know the number "100" for `free`'s `issuesPerProject`; it only knows to call
`wouldExceedLimit` and let the config table supply the number.

**Acceptance criteria**

1. Grepping the services layer for a bare numeric literal matching a known plan limit (100,
   1000, 10000, and so on) finds no hardcoded duplicate of `PLAN_LIMITS`'s values.
2. Every field in `PlanLimits` has a defined value for all four plans; none is left
   implicitly undefined.
3. A change to a single plan's `projects` limit in `PLAN_LIMITS` is sufficient to change
   enforcement everywhere that limit is checked.

**Implemented by:** `src/config/plan-limits.ts`
**Verified by:** `tests/config/plan-limits.test.ts`

### REQ-133 — Seats are counted as active members

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-032, REQ-006

`countActiveMembers(orgId)` in `member-repository.ts` excludes soft-deleted (removed)
members, and this is exactly the count `checkLimit(orgId, 'seats', ...)` compares against
the plan's `seats` field. A removed member's history stays intact (`REQ-033`) but their seat
is freed the moment removal completes, which is what lets an org at its seat cap immediately
invite a replacement after offboarding someone.

**Acceptance criteria**

1. `countActiveMembers` never counts an archived (removed) member row.
2. A pending invitation, not yet accepted, also counts toward the seat check per `REQ-032`,
   even though it is not yet a member row `countActiveMembers` would find — the invite-time
   check and the active-member count are combined at the call site in
   `invitation-service.ts`.
3. Removing a member frees a seat immediately, verifiable by a subsequent
   `checkLimit('seats', ...)` call.

### REQ-134 — Project count is checked before project creation

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-043, REQ-044

This document is the canonical statement of the rule `REQ-043` in `projects.md` implements:
`checkLimit(orgId, 'projects', used)` must return a non-exceeding verdict before
`insertProject` runs, using `countProjects` with its default scope that includes archived
projects (`REQ-044`).

**Acceptance criteria**

1. `assertWithinLimit(orgId, 'projects', 1)` throws before any project row is written when
   the org is already at its limit.
2. The check reads the same `countProjects` call `REQ-044` describes, not an independent
   count.
3. `checkLimit`'s returned `LimitCheck` includes both the current usage and the plan's
   limit, so the caller can render a specific "8 of 10 projects used" message rather than a
   generic refusal.

### REQ-135 — Issue count is checked per project

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-064, ADR-010

Mirrors `REQ-064` from the billing side: `issuesPerProject` is enforced per project, not
per organization, so `checkLimit`'s `used` argument for this resource is
`countIssues(orgId, projectId)`, scoped to one project, not a sum across every project in
the org.

**Acceptance criteria**

1. `checkLimit(orgId, 'issuesPerProject', used)` requires the caller to supply a
   project-scoped `used` count, not an org-wide total.
2. Two projects in the same org are independently checked; one being full does not block
   issue creation in the other.
3. `enterprise`'s unlimited `issuesPerProject` short-circuits this check via the
   `UNLIMITED` sentinel.

### REQ-136 — Webhook endpoints are limited per plan

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-150, REQ-152

`PlanLimits.webhooks` is 0 for `free`, 2 for `starter`, 10 for `growth`, and unlimited for
`enterprise` — note that `free` and `starter` both technically have a nonzero-or-zero
`webhooks` count while the `webhooks` feature flag itself requires `growth` or above
(`REQ-152`), so on `starter` the endpoint-count limit is moot: the flag gate blocks webhook
creation entirely before the count check would ever matter.

**Acceptance criteria**

1. `createWebhook` checks `wouldExceedLimit(plan, 'webhooks', countEndpoints(orgId))` in
   addition to the `webhooks` flag check.
2. A `free` org attempting webhook creation is blocked by the flag gate, not merely the
   zero-endpoint quota, since both independently refuse it.
3. `enterprise`'s unlimited webhook count never blocks endpoint creation on quota grounds.

### REQ-137 — Unlimited is represented by positive infinity

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-008, REQ-132, DES-160

`UNLIMITED` is `Number.POSITIVE_INFINITY`, used for `enterprise`'s `seats`, `projects` and
`issuesPerProject` fields (`storageMb` and `apiRequestsPerHour` are large finite numbers
instead, since those two are physically bounded resources even for enterprise, at 500000 and
100000 respectively, and `webhooks` is unlimited). `wouldExceedLimit` needs no special-case
branch for the unlimited plans because standard floating-point comparison against infinity
already does the right thing.

**Acceptance criteria**

1. `wouldExceedLimit('enterprise', 'seats', used, requested)` is always `false` for any
   finite `used`/`requested`.
2. `formatLimit` in `src/lib/format.ts` renders `Number.POSITIVE_INFINITY` as "Unlimited",
   not as `Infinity` or a numeric string.
3. `storageMb` and `apiRequestsPerHour` for `enterprise` are large finite numbers, not
   `UNLIMITED`, and are enforced like any other finite quota.

### REQ-138 — Exceeding a quota produces plan_limit_exceeded, not a crash

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-032, REQ-043, REQ-064

Every quota check that fails throws a domain error mapped by `toAppError`/`HTTP_STATUS_BY_CODE`
to the `plan_limit_exceeded` code and HTTP 402, distinct from `validation_failed`/422 and
from an unhandled exception, which would otherwise surface as `internal_error`/500. This is
what lets the client render a specific upsell prompt rather than a generic error banner.

**Acceptance criteria**

1. Every `assertWithinLimit` failure resolves, through `toActionResult`, to an
   `ActionResult` whose error code is `plan_limit_exceeded`.
2. `HTTP_STATUS_BY_CODE['plan_limit_exceeded']` is 402.
3. No quota-exceeding call path reaches an unhandled exception; `tests/lib/errors.test.ts`
   exercises the mapping for this error class alongside every other domain error.

**Implemented by:** `src/lib/errors.ts`, `src/server/services/billing-service.ts`
**Verified by:** `tests/lib/errors.test.ts`, `tests/services/billing-service.test.ts`

### REQ-139 — Quota breaches emit billing.limit_exceeded

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-138, REQ-220

Beyond the synchronous error returned to the caller, a quota breach also emits
`billing.limit_exceeded` on the event bus, which the activity service records — so an admin
reviewing the audit log later can see that the organization hit a limit, even though the
individual member whose request was refused never saw anything beyond their own error
message.

**Acceptance criteria**

1. `billing.limit_exceeded`'s payload identifies the resource and the plan at the time of
   the breach.
2. The event fires once per refused request, not once per retry the client might attempt.
3. The activity row derived from this event is queryable by organization
   (`REQ-223`) for support and account-management review.

### REQ-140 — Plan changes emit billing.plan_changed

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-025, REQ-142, DES-071

`changePlan` emits `billing.plan_changed` with the previous and new plan, consumed by the
activity service and by anything that needs to react to a plan transition — most notably
`REQ-141`'s downgrade guard, which runs before this event, and any flag re-evaluation, since
plan-gated flags (`REQ-188`) read the org's current plan on every `isEnabled` call rather
than caching it.

**Acceptance criteria**

1. `billing.plan_changed`'s payload includes both `previousPlan` and `newPlan`.
2. The event fires for both upgrades and downgrades, and for the automated downgrade path
   trial expiry uses (`REQ-142`).
3. A plan change to the same plan (a no-op "change") does not emit the event.

### REQ-141 — Downgrades are refused while usage exceeds the target plan

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-131, REQ-138, DES-160

`changePlan` checks the org's current usage against every field of the target plan's
`PlanLimits` before committing a downgrade; if seats, projects, issues in any project, or
storage already exceed what the lower plan allows, the change is refused with
`plan_limit_exceeded` rather than silently landing the org in a state where it is already
over its new limits.

**Acceptance criteria**

1. An org with 15 seats used cannot downgrade to `starter` (10 seats) without first
   reducing active membership.
2. The refusal names which resource(s) are over the target plan's limit, not just a generic
   denial.
3. An upgrade is never blocked by this check, since a higher plan cannot make an already
   passing usage figure newly fail.

### REQ-142 — Trials expire on a schedule and fall back to free

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-140, ADR-016

`runTrialExpiryJob(now)` in `trial-expiry-job.ts` runs on the `trial-expiry` cadence (every
360 minutes) and calls `listTrialsEndingBefore(now)` in `subscription-repository.ts`; any
subscription whose trial has ended is downgraded, emitting `billing.plan_changed` with
`newPlan: 'free'`. There is no partial-trial or trial-extension mechanic; a trial simply ends
at its recorded date and the org lands on `free`.

**Acceptance criteria**

1. A trial subscription past its end date is downgraded on the next scheduler tick that
   reaches the `trial-expiry` cadence, not immediately at the exact expiry instant.
2. The downgrade uses the same `changePlan` path other plan changes use, so it is subject
   to the same downgrade-refusal guard in `REQ-141` — meaning a trial org over `free`'s
   limits at expiry needs a defined resolution, noted as an open question above.
3. `billing.plan_changed`'s `previousPlan` for a trial expiry correctly reflects the trial
   plan, not `free`.

### REQ-143 — Invoices are generated per billing period

- **Priority:** could
- **Status:** partial
- **Related:** REQ-130, DES-170

`invoice-repository.ts#insertInvoice` and `listInvoices` exist and back the invoices page
(`src/app/(dashboard)/[orgSlug]/settings/billing/invoices/page.tsx`), but there is no
dedicated scheduled job among the seven `JobKind`s in `src/server/jobs/types.ts` that
generates invoices on a period boundary — this is marked `partial` because the data model
and read path are implemented while the generation trigger is not fully specified by any job
in this corpus.

**Acceptance criteria**

1. `listInvoices(orgId)` returns invoices ordered by billing period, most recent first.
2. `insertInvoice`'s shape matches `Invoice` minus the generated `id`/`createdAt`/`updatedAt`
   fields, consistent with every other insert function's pattern in the repository layer.
3. Any future job that generates invoices automatically must not produce a duplicate
   invoice for a period already recorded.

### REQ-144 — Usage is rolled up on a schedule for the billing screen

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-008, ADR-016

`runUsageRollupJob(now)` calls `recomputeUsage(orgId)` for orgs returned by
`listOrgIdsForRollup(limit)`, on the `usage-rollup` cadence (every 15 minutes) — the
shortest cadence of any job, because usage figures feed quota checks that gate real user
actions, so staleness here is more visible to users than staleness in, say, the daily
cleanup job.

**Acceptance criteria**

1. `recomputeUsage` derives every `OrganizationUsage` field from a fresh count against the
   underlying tables, not from accumulating deltas that could drift.
2. `listOrgIdsForRollup(limit)` bounds how many organizations one tick processes, so the job
   does not become a single unbounded pass over every organization on the instance.
3. Incremental updates from `incrementUsage` (on individual writes) and the periodic rollup
   never diverge for long — the rollup is the authoritative reconciliation.
