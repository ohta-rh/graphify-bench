---
title: Notes — rate limiter sizing
id: OPS-NOTES-2026-01-30
status: approved
owners: [j.novak]
last_updated: 2026-01-30
related: [ADR-011, REQ-096, REQ-161, REQ-176]
---

**Date:** 2026-01-30
**Attendees:** j.novak (chair), k.ferreira, r.saito, d.okafor

## Agenda

1. Review the bucket sizes proposed for the in-process token-bucket rate limiter
   (`ADR-011`, accepted the day before).
2. Decide how bucket capacity should scale with an organization's plan.
3. Sanity-check the numbers against realistic usage before they ship.

## Discussion

Jan walked through the draft bucket table: `member:invite` at 20 capacity / 2 refill per
minute, `comment:create` at 60/20, `issue:create` at 60/20, `search:query` at 120/60,
`auth:password-reset` at 5/1, `webhook:deliver` at 100/50, and a default bucket of 30/10
for anything not explicitly listed. The group went through each one against a rough
mental model of real usage.

Rin flagged `member:invite` first — 20 capacity felt generous for a bucket whose whole
purpose is to prevent invite-spam, but she pointed out that a legitimate onboarding flow
where an admin bulk-invites a new team of fifteen people in one sitting needs headroom,
and 20 covers that with a small margin. The group kept 20/2 but agreed to revisit if
abuse patterns emerge in practice.

Kaya pushed on `search:query` at 120/60 — she was worried this was too generous given
that `advanced_search`-gated field syntax queries can be more expensive to evaluate than
a plain substring scan (`DES-213`). Jan noted the rate limiter charges by request count,
not by query cost, and the group discussed briefly whether cost-weighted limiting was
worth building now. Deji argued against — it adds real complexity (estimating a query's
cost before running it) for a problem that has not been observed yeat, and the group
agreed to ship flat per-request limiting for the first release and treat cost-aware
limiting as a candidate for a future pass if search load ever becomes a real operational
problem.

The most substantive discussion was about how bucket capacity should scale with plan.
Jan's proposal: capacity scales with `apiRequestsPerHour / 100`, capped at 100x the base
bucket size, so an enterprise org (`apiRequestsPerHour: 100000`) gets buckets sized
1000x... which immediately struck several people as too large. The group converged on
capping the multiplier at 100x rather than letting `apiRequestsPerHour / 100` grow
unbounded, specifically because an unbounded multiplier would let a single enterprise
org's burst traffic overwhelm downstream systems that the rate limiter is meant to
protect Taskflow's own database from, independent of what the org's raw hourly quota
technically allows. Rin asked whether this cap should differ per bucket rather than
being uniform; the group decided a single uniform cap was simpler to reason about and
explain to customers, and any bucket-specific tuning could be layered on later if
evidence supported it.

Deji raised `auth:password-reset` at 5/1 as worth scrutinizing separately from the rest,
since it is the one bucket explicitly not meant to scale with plan at all — it exists to
slow down credential-stuffing and password-reset abuse, which has nothing to do with an
organization's paid tier. The group confirmed this bucket should be charged per
requesting identity (email address attempted) rather than per organization, since an
attacker targeting `auth:password-reset` typically has no valid organization context at
all. This was noted as an implementation detail worth double-checking against the actual
code once written, since the org-scoped bucket model assumed by the rest of the table
does not cleanly apply here.

## Decisions

1. Bucket table ships as drafted: `member:invite` 20/2, `comment:create` 60/20,
   `issue:create` 60/20, `search:query` 120/60, `auth:password-reset` 5/1,
   `webhook:deliver` 100/50, default 30/10 (relates `REQ-096`, `REQ-161`, `REQ-176`).
2. Bucket capacity scales with `apiRequestsPerHour / 100`, capped at 100x the base
   bucket size — the cap is uniform across buckets rather than tuned per bucket.
3. Cost-weighted rate limiting for expensive search queries is explicitly deferred, not
   built for the first release.
4. `auth:password-reset` is charged per identity, not per organization, and does not
   scale with plan.

Rin also asked whether the default bucket (30/10, for any action not explicitly listed
in the table) was sized deliberately or just chosen as a round number. Jan admitted it
was closer to the latter — a reasonable-sounding default rather than a value derived
from any specific traffic model — and the group discussed briefly whether that was a
problem. Deji argued it was fine precisely because it is a *default*: any action that
turns out to need different treatment should get its own explicit bucket entry rather
than the team trying to perfectly tune a single fallback number in advance of real
usage data. The group agreed the right process going forward is to add a specific bucket
whenever an action's actual traffic pattern diverges meaningfully from the default,
rather than trying to anticipate every case now.

## Follow-ups

- Kaya to monitor search query cost in practice post-launch and bring evidence back if
  cost-weighted limiting becomes worth revisiting.
- Jan to confirm in code review that `auth:password-reset` is actually keyed by identity
  rather than accidentally inheriting the org-scoped bucket pattern used everywhere else.
- Rin to document the capped-multiplier scaling formula in the billing-facing docs so
  enterprise customers understand why their effective rate limit is not simply
  proportional to their `apiRequestsPerHour`.
