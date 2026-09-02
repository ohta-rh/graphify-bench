---
title: Notes — plan ladder pricing
id: OPS-NOTES-2026-02-10
status: approved
owners: [r.saito]
last_updated: 2026-02-10
related: [ADR-010, REQ-131, REQ-132]
---

**Date:** 2026-02-10
**Attendees:** r.saito (chair), a.whitfield, d.okafor, m.lindqvist

## Agenda

1. Finalize the four-plan ladder's numeric limits ahead of `PLAN_LIMITS` being frozen in
   code.
2. Decide the `enterprise` plan's price and whether any dimension should stay
   unlimited versus a large finite number.
3. Discuss the `UNLIMITED` representation and whether `Number.POSITIVE_INFINITY` is
   actually safe to use in downstream arithmetic.

## Discussion

Rin presented the draft ladder: `free` (3 seats, 2 projects, 100 issues per project, 100
MB storage, 100 API requests/hour, 0 webhooks, 30-day retention, $0), `starter` (10/10/
1000/2000/1000/2/90/$900 per seat monthly), `growth` (50/100/10000/20000/10000/10/365/
$1900), and `enterprise` (unlimited seats, projects, and issues per project, 500000 MB
storage, 100000 API requests/hour, unlimited webhooks, 2555-day retention, $3900).

Ada pushed back on `enterprise` webhooks being unlimited rather than a large finite
number, worried that "unlimited webhooks" as a literal product claim could be abused by
a single enterprise customer registering thousands of endpoints and degrading the shared
webhook delivery pipeline for everyone — a concern that, in hindsight after
`postmortem-2026-04-17-webhook-backlog.md`, turned out to be prescient about
throughput risk generally, even though that incident was triggered by event volume
rather than endpoint count specifically. The group discussed capping enterprise
webhooks at a large finite number like 500 instead. Deji argued that from an engineering
standpoint, "unlimited" and "500" require the same code — a numeric comparison against
`getPlanLimits(plan).webhooks` either way — so the decision was really a product and
sales question, not a technical one. Ada ultimately kept `enterprise` webhooks unlimited
for the sales narrative, but the group logged the throughput risk as a topic to revisit
if it ever becomes a real operational problem, which is exactly what happened three
months later.

Mira raised the `UNLIMITED = Number.POSITIVE_INFINITY` representation directly: is it
actually safe everywhere a limit is compared or used arithmetically? The group walked
through `wouldExceedLimit(plan, resource, used, requested)` — comparing `used +
requested > limit` — and confirmed that `POSITIVE_INFINITY` behaves correctly there,
since any finite `used + requested` is always less than infinity. Deji flagged one
subtlety: `retentionDays` being used in date arithmetic (`now - retentionDays *
MS_PER_DAY` in the cleanup job) means `retentionDays` should never itself be
`UNLIMITED`, because that would produce `NaN` in the resulting timestamp — the group
confirmed enterprise's retention is deliberately a large finite number (2555 days, seven
years) rather than infinite, specifically to avoid this. This became a documented
convention: `UNLIMITED` is safe for count-based quotas compared with `>`, but any limit
that feeds date or duration arithmetic must stay finite.

Ada and Rin spent the remainder of the meeting on pricing itself, which is recorded
here for completeness even though it is less an engineering decision than a business
one: `starter` at $900/seat/month, `growth` at $1900/seat/month, `enterprise` at
$3900/seat/month, all stored as integer cents (`priceCentsPerSeatMonthly`) to avoid
floating-point rounding in billing calculations — Deji was firm on this point, noting
that any prior experience with float-based money fields eventually produces a support
ticket about a one-cent discrepancy that takes an afternoon to track down.

## Decisions

1. The four-plan ladder ships with the numeric limits as drafted above (relates
   `REQ-131`, `REQ-132`).
2. `enterprise` webhooks remain unlimited (`Number.POSITIVE_INFINITY`) for the sales
   narrative, with the throughput risk explicitly logged as a known trade-off rather than
   silently accepted.
3. `UNLIMITED` is safe for count-based quota comparisons but must never be used for a
   limit that feeds date/duration arithmetic; `retentionDays` stays finite even on
   `enterprise` (2555 days).
4. All prices are stored as integer cents (`priceCentsPerSeatMonthly`), never floats.

Deji raised one more question near the close of the meeting: should the seat count
displayed to a customer include the owner, or is the owner counted separately from
"seats"? The group confirmed the owner is counted as one of the org's seats like any
other active member — there is no separate, uncounted "founder" slot — and that this
should be stated explicitly in customer-facing plan comparison copy, since a customer
mentally modeling "seats" as "additional people beyond myself" would undercount by one
and be surprised when an invite fails sooner than expected. Ada agreed to fold this into
the same messaging pass covering integer-cents billing precision, rather than treating
it as a separate documentation task.

## Follow-ups

- Ada to note the enterprise-webhooks throughput risk in the internal sales-engineering
  handbook so a large prospective customer's webhook usage pattern gets flagged before
  contract signing, not after.
- Deji to add a code comment on `PlanLimits` documenting the "safe for counts, unsafe for
  durations" rule about `UNLIMITED`, so a future contributor adding a new limited
  resource does not accidentally make a duration field unlimited.
- Rin to confirm with finance that integer-cents pricing matches how invoices are
  actually generated downstream (`REQ-143`).
