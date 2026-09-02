---
title: An in-process token-bucket rate limiter
id: ADR-011
status: accepted
owners: [platform-team]
last_updated: 2026-01-29
related: [REQ-096, REQ-161, REQ-176, REQ-208, ADR-005, ADR-010]
---

# ADR-011 — An in-process token-bucket rate limiter

## Status

Accepted. In production use for member invites, comment creation, issue
creation, search queries, password resets, and webhook delivery since late
January 2026, with no changes to its core algorithm since.

## Context

By mid-January 2026, several independent features needed rate limiting for
different, unrelated reasons: REQ-096 requires comment creation be rate
limited per organization (to blunt a scripted mention-spam scenario Kaya
Ferreira had reproduced in testing), REQ-176 requires search queries be rate
limited per organization (the search index's `LIKE`-based matching, see
ADR-017, is not free, and an unthrottled query loop could degrade the whole
database for every organization sharing the process), REQ-208 requires
password-reset requests be rate limited (a standard account-enumeration and
abuse defense), and REQ-161 requires webhook delivery itself be rate limited
per organization, distinct from the retry backoff ADR-018 governs.

The same offline, single-process, no-external-services constraint that
shaped ADR-005 and ADR-002 applied here too: there was no Redis or managed
rate-limiting service to point at, and the team wanted one limiter
implementation, not five bespoke ones each reinventing token-bucket or
fixed-window math with its own bugs. There was also a fairness concern
specific to Taskflow's plan model: a flat rate limit applied equally to a
free-plan org and an enterprise-plan org would either be too generous for
free (defeating the point) or too strict for enterprise (an org paying for
100,000 API requests per hour should not be capped at the same comment-
creation rate as a three-seat free org).

## Decision

`src/lib/rate-limit.ts` implements a token-bucket limiter keyed by
`(orgId, bucketKey)`, held entirely in an in-process `Map`, matching the
event bus's in-process model from ADR-005 and for the identical reason:
Taskflow runs single-writer with no external cache to hold this state
instead. `RATE_LIMIT_BUCKETS` declares the base shape (`capacity`,
`refillPerMinute`) per named bucket — `member:invite` (20 capacity, 2/min
refill), `comment:create` (60, 20), `issue:create` (60, 20), `search:query`
(120, 60), `auth:password-reset` (5, 1), `webhook:deliver` (100, 50) — with
`DEFAULT_BUCKET` (30, 10) applied to any key not in the table.

Bucket size is not fixed, though: `configFor(orgId, bucketKey)` scales the
base config by the org's plan, reading `apiRequestsPerHour` from
`getPlanLimits()` in ADR-010's plan-limits table — the module's own
documentation states this is deliberate, so "the limiter and the plan
catalogue can never drift apart: the plan is the source of the ceiling, this
table only sets the relative shape." The scale factor is
`max(1, hourly / 100)`, capped so no bucket can scale beyond 100x its base
size regardless of how generous a plan's hourly allowance is — this cap
exists specifically so a mis-declared or future extremely-high-allowance plan
cannot produce a bucket so large it stops meaningfully limiting anything.
`setOrgPlan(orgId, plan)` is how a service records an org's plan so
subsequent `consumeRateLimit()` calls for that org scale correctly; it is
called wherever a service already has the org's plan loaded, rather than the
limiter looking it up itself.

`consumeRateLimit(orgId, bucketKey, cost = 1)` is the sole entry point.
Async by contract — the module's documentation notes this is deliberate,
"the production limiter is expected to move behind a store" eventually, and
every call site already awaits it, so promoting the current in-memory
implementation to a persisted one later would not change any caller. It
refills tokens for elapsed time since the bucket's last touch, then spends
`cost` tokens if enough are available, returning a `RateLimitVerdict`
(`allowed`, `remaining`, `resetAt`) — `resetAt` is computed from the deficit
and the refill rate, giving callers (and, via `toAppError()`'s
`rate_limited` code, HTTP 429 responses) a concrete "try again after" time
rather than a bare rejection. `resetRateLimits()` exists for tests, and
`getBucketConfig(bucketKey)` exposes the base (unscaled) config for callers
that need to display a limit's shape (e.g. account settings) without
performing a consume.

## Consequences

**What this buys the team.** Six otherwise-unrelated features — invites,
comments, issue creation, search, password reset, webhook delivery — share
one algorithm, one verdict shape, and one plan-scaling rule, so a bug fix or
a behavioral change in `consumeRateLimit()` benefits all six at once, and a
new rate-limited feature is a one-line addition to `RATE_LIMIT_BUCKETS` plus
a `consumeRateLimit()` call at the right point in the service, not a new
implementation. Because bucket capacity scales from the same `PlanLimits`
table ADR-010 declares, there is no separate "rate limit tier" concept to
keep in sync with the plan ladder — an enterprise org's generous
`apiRequestsPerHour` automatically widens every rate-limited action's bucket
proportionally, with no second config surface for pricing to reason about.
The `RateLimitVerdict`'s `resetAt` has made the product-facing error message
concretely better than a bare "try again later" — the search dialog and the
comment composer both surface the actual reset time.

**What it costs.** State lives in a plain `Map` in one process's memory,
which means it does not survive a process restart (every bucket resets to
full on deploy, a mild and accepted leniency) and, more importantly, does
not coordinate across multiple processes — if Taskflow were ever deployed
behind more than one application instance sharing a database, each instance
would enforce its own independent rate limit, meaning the effective limit an
organization experiences would be the configured limit multiplied by the
number of instances. This is an explicit, accepted constraint of the
single-writer, single-process deployment model the whole corpus assumes, not
an oversight; the module's own "expected to move behind a store" comment,
and the fact that every call site already treats `consumeRateLimit` as async,
is the team's acknowledgment that this would need to change before a
multi-instance deployment. The 100x scaling cap also means a hypothetical
future plan with an enormous `apiRequestsPerHour` allowance would not get a
correspondingly enormous comment-creation bucket — this is intentional
(comment creation should never be effectively unlimited regardless of plan)
but it does mean `apiRequestsPerHour` is not a perfectly literal ceiling on
every rate-limited action; it is a scaling input, and that distinction has
had to be explained to product stakeholders more than once when they
compared advertised API limits against observed comment-rate behavior.

## Alternatives considered

**A fixed-window counter instead of token bucket.** Simpler to implement and
reason about, but rejected because fixed windows allow a burst at the
boundary between two windows (2x the intended rate in the worst case, all at
the window edge) that token buckets smooth out naturally through continuous
refill — a meaningful difference for the abuse-prevention use cases (password
reset, comment spam) this limiter primarily exists to serve.

**An external rate-limiting service or Redis-backed sliding window.** The
production-grade answer for a multi-instance deployment, and the natural
next step if Taskflow ever needs one, but ruled out for the same
no-external-services reason as ADR-005's event bus and ADR-002's database
choice — there is nothing to point it at in this environment.

**A single global limit per organization**, rather than one bucket per
`(orgId, bucketKey)`. Rejected because it would let a burst of search
queries exhaust the same budget as password-reset attempts, defeating the
point of rate limiting each abuse scenario independently — a user
legitimately searching heavily should not accidentally lock themselves out
of resetting their password.

## References

- REQ-096 (comment creation rate limited per organization), REQ-161 (webhook
  delivery rate limited per organization), REQ-176 (search queries rate
  limited per organization), REQ-208 (password reset rate limited)
- ADR-005 (the in-process, single-process model this limiter's state storage
  mirrors, for the same environmental reasons), ADR-010 (`PlanLimits` is the
  source the limiter scales bucket capacity from)
- Code: `src/lib/rate-limit.ts` (`consumeRateLimit`, `getBucketConfig`,
  `setOrgPlan`, `resetRateLimits`, `RateLimitVerdict`, `RATE_LIMIT_BUCKETS`,
  `DEFAULT_BUCKET`), `src/config/plan-limits.ts` (`getPlanLimits`)
