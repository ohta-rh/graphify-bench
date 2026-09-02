---
title: Declare every plan quota in one table
id: ADR-010
status: accepted
owners: [r.saito]
last_updated: 2026-01-21
related: [REQ-131, REQ-132, REQ-137, ADR-011, ADR-012]
---

# ADR-010 — Declare every plan quota in one table

## Status

Accepted, and stable since it was written: no plan quota anywhere in the
product is declared outside `PLAN_LIMITS`, and Rin Saito's billing work
since January 2026 has consistently added new consumers of that table
rather than new sources of truth.

## Context

By the second week of January 2026, plan quotas were scattered across at
least four places: a hardcoded `10` in the project-create Server Action for
starter-plan project limits, a similar hardcoded seat count in the invite
flow, a webhook-endpoint-count check that used a different number than the
pricing page's marketing copy, and a usage-meter UI component with its own
copy of "what does growth include" for rendering a progress bar. None of
these agreed with each other after a pricing change in December 2025 bumped
starter-plan seats from 8 to 10 — the invite flow's hardcoded check was
updated, the usage meter was not, and for two weeks the UI showed a starter
org as "8 of 8 seats used" when they in fact had room for two more.

Rin Saito, who owns billing and plans, proposed collapsing every quota into
one declaration specifically because the bug was not really about seats — it
was about there being no way to know, short of grepping the whole codebase,
how many places would need to change the next time a plan's limits moved.
Four plans (`free`, `starter`, `growth`, `enterprise`) and nine quota-shaped
fields per plan meant thirty-six numbers that had to move together every time
pricing changed, and pricing was expected to change more than once given the
product was pre-launch at the time.

## Decision

`src/config/plan-limits.ts` declares `PlanLimits` as a single interface —
`plan`, `seats`, `projects`, `issuesPerProject`, `storageMb`,
`apiRequestsPerHour`, `webhooks`, `retentionDays`, `includedFlags`,
`priceCentsPerSeatMonthly` — and `PLAN_LIMITS` as a `Readonly<Record<PlanId,
PlanLimits>>` covering all four plans completely: free (3 seats, 2 projects,
100 issues/project, 100 MB storage, 100 API req/hr, 0 webhooks, 30-day
retention, free price), starter (10/10/1,000/2,000/1,000/2/90 days/$9.00 per
seat), growth (50/100/10,000/20,000/10,000/10/365 days/$19.00 per seat), and
enterprise (unlimited seats, projects, and issues per project, 500,000 MB
storage, 100,000 API req/hr, unlimited webhooks, 2,555-day retention,
$39.00 per seat). `UNLIMITED` is declared once as `Number.POSITIVE_INFINITY`
and used everywhere a quota has no ceiling — REQ-137 requires unlimited be
represented this way specifically so downstream arithmetic (`used + requested
> limit`) behaves correctly without a special-cased "is this unlimited"
branch scattered through call sites.

Every consumer reads through one of four functions, never the `PLAN_LIMITS`
table directly, and the module's own documentation states this explicitly:
adding a field to `PlanLimits` ripples into every one of these call sites,
and that ripple is intentional. `getPlanLimits(plan)` returns the whole
object; `getLimit(plan, resource)` reads one numeric quota by
`LimitedResource` key without the caller destructuring the whole
`PlanLimits` shape; `planAtLeast(plan, minPlan)` compares two plans by their
position in `PLAN_ORDER` (`free < starter < growth < enterprise`), used both
by billing logic and, via ADR-012, by plan-gated feature flags;
`wouldExceedLimit(plan, resource, used, requested = 1)` is the single
predicate every quota-check call site uses to decide whether an action would
breach a limit, rather than each call site writing its own `used + 1 >
limit` comparison. The known consumers, per the module's own comment, are
`BillingService`, the invite flow, the project-create action, the webhook
settings page, the usage meter component, and the seat-limit job — six
independent features, all reading the same nine numbers.

## Consequences

**What this buys the team.** A pricing change is now a single-file edit:
when growth-plan webhook endpoints went from 5 to 10 in February 2026 (a
real change, prompted by Kaya Ferreira's webhook usage data showing
customers routinely hitting the old ceiling), it touched exactly one line in
`plan-limits.ts` and nothing else — the usage meter, the webhook settings
page, and the plan-limit-exceeded error message all picked up the new number
automatically because none of them stored their own copy. `wouldExceedLimit()`
being the one predicate everywhere also means REQ-138 (exceeding a quota
produces `plan_limit_exceeded`, not a crash) is satisfied uniformly: every
quota check goes through the same function, so there is one place to verify
the error path is correct, not nine. `UNLIMITED` as `Infinity` specifically
means an enterprise org's `wouldExceedLimit(plan, "seats", 50_000, 1)` call
returns `false` through ordinary floating-point comparison, with no
`if (limit === UNLIMITED) return false` special case anywhere — REQ-137's
requirement turned into a genuine simplification rather than an extra branch.

**What it costs.** Every quota-dependent feature now has a hard dependency on
this one module, which means `plan-limits.ts` cannot be changed casually — a
change to the `PlanLimits` interface shape (adding a tenth field, say, for a
new resource type) is a breaking change for every one of its six known
consumers simultaneously, and each has to be updated in the same pull
request or the build fails typechecking. This is the ripple the module's
documentation calls out as intentional, but it means plan-limits changes are
reviewed more heavily than an average config edit — Rin Saito's team treats
any diff touching this file as requiring a second reviewer from billing,
independent of the size of the diff. The table also has no notion of
grandfathering or per-organization overrides built in: an organization
negotiated a custom seat count outside the four standard plans has no
representation in this model today, which is a known gap the sales team has
flagged and which would require either a fifth synthetic "plan" or a
per-org override layered on top of `PLAN_LIMITS` — not yet built, and
explicitly out of scope for this ADR.

## Alternatives considered

**Quotas stored in the database, editable without a deploy.** Attractive for
operational flexibility (support could adjust a struggling customer's limits
without engineering involvement) but rejected for the initial build: it adds
a runtime dependency (a database round trip) to every quota check, in a
codebase that otherwise keeps configuration-shaped data as static
TypeScript, and it removes the compile-time guarantee that every `PlanId`
has a complete `PlanLimits` record — a missing row in a database table fails
at runtime, a missing key in a `Record<PlanId, PlanLimits>` fails
typechecking. The team left the door open to a database-backed override
layer sitting on top of this table later, without abandoning the table
itself as the base declaration.

**Quotas colocated with each feature** (the webhook module declares its own
webhook-count limits, the project module its own project-count limits, and
so on). This is close to what the codebase organically had before this ADR,
and it is exactly what produced the seat-count drift bug — rejected for the
same reason ADR-003 rejects per-resource authorization guards: no single
place to see or change the whole quota picture at once.

**Environment-variable-driven quotas**, one env var per plan per resource.
Rejected as unwieldy at thirty-six values, unable to express the
`includedFlags` array cleanly, and — in an offline, no-external-config-store
environment — no real operational benefit over a TypeScript constant that is
already deployed with the application and reviewed like any other code
change.

## References

- REQ-131 (four plans form an ordered ladder), REQ-132 (plan quotas declared
  in one place), REQ-137 (unlimited represented by positive infinity),
  REQ-138 (exceeding a quota produces `plan_limit_exceeded`, not a crash)
- ADR-011 (the rate limiter reads `apiRequestsPerHour` from this same table
  to scale bucket capacity), ADR-012 (plan-gated feature flags compare
  against `PLAN_ORDER` via `planAtLeast`)
- Code: `src/config/plan-limits.ts` (`PlanLimits`, `PLAN_LIMITS`,
  `PLAN_ORDER`, `UNLIMITED`, `getPlanLimits`, `getLimit`, `planAtLeast`,
  `wouldExceedLimit`), `src/types/billing.ts` (`LimitedResource`, `PlanId`)
