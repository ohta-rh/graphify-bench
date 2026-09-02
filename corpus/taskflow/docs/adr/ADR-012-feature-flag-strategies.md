---
title: Four feature flag strategies and one evaluator
id: ADR-012
status: accepted
owners: [platform-team, a.whitfield]
last_updated: 2026-02-05
related: [REQ-185, REQ-186, REQ-187, REQ-190, ADR-010, ADR-003]
---

# ADR-012 — Four feature flag strategies and one evaluator

## Status

Accepted, and unmodified since February 2026 apart from new flag entries
being added to the registry (ten flags as of this writing). No fifth
strategy kind has been proposed.

## Context

By late January 2026, Taskflow needed feature flags for genuinely different
reasons: `kanban_board` and `csv_export` gate a feature behind a plan tier;
`ai_issue_summary` needed a gradual, controlled rollout to a percentage of
organizations before committing to it product-wide; `issue_templates` was a
feature the team wanted available to admins only, regardless of plan, while
it was still being validated with early customers; and `command_palette` was
simply a flag the team wanted to be able to kill in an emergency without
being tied to any of the above conditions, always on unless someone flips it
off. Ada Whitfield, as product manager, pushed for these to be genuinely
independent knobs rather than one mechanism awkwardly repurposed for all four
— a plan-gate reused to fake a percentage rollout (by, say, defining a fake
plan tier) would have been legible to nobody maintaining the pricing page.

The team also wanted exactly one function anyone could call to ask "is this
flag on," used identically by server code deciding whether to execute a
gated code path and by the client UI deciding whether to render a gated
control — with no risk of the two disagreeing, which would show a control
the server would then reject, or hide a control the server would have
allowed. This mirrors the reasoning behind ADR-003's single permission entry
point directly: a scattered set of ad hoc "is this org on the growth plan"
checks sprinkled through the UI was judged the same kind of drift risk as
scattered role checks.

## Decision

`src/config/feature-flags.ts` declares `FEATURE_FLAG_DEFINITIONS`, a
`Readonly<Record<FeatureFlagKey, FeatureFlagDefinition>>` — REQ-195's closed
union of flag keys — where each definition carries a `strategy` of exactly
one of four kinds:

- `{ kind: "off" }` / `{ kind: "on" }` — unconditional. `command_palette` uses
  `"on"`, and is the one flag in the registry marked `overridable: false`
  since there is no plan or role condition to override in the first place
  that would make an override meaningful.
- `{ kind: "plan", minPlan }` — gated by `planAtLeast(ctx.plan, minPlan)`,
  reading directly from ADR-010's `PLAN_ORDER`. `kanban_board` (starter),
  `activity_feed` and `digest_email` and `webhooks` (growth), and
  `public_projects` and `advanced_search` (enterprise) all use this
  strategy.
- `{ kind: "role", minRole }` — gated by `ROLE_RANK[ctx.role] >=
  ROLE_RANK[minRole]`, reading the same role-rank table ADR-003's
  authorization decision uses. `issue_templates` (admin) is the one flag
  using this strategy today.
- `{ kind: "percentage", percent }` — a deterministic bucket, not a random
  roll per request: `bucketOf(flag, ctx)` FNV-1a-hashes the string
  `"${flag}:${orgId}:${userId}"` into a 0-99 bucket, and the flag is enabled
  if that bucket is below `percent`. `ai_issue_summary` is set at 25 percent.
  Determinism matters specifically so REQ-189 (percentage rollout is
  deterministic per organization) holds — a given org, or a given
  user-in-org, sees the same on/off answer on every request, never a flicker
  between page loads.

`isEnabled(flag, ctx)` in `src/lib/feature-flags.ts` is the sole evaluator.
It checks `definition.overridable && ctx.overrides?.includes(flag)` first —
REQ-191's per-organization override, stored in organization settings and
passed through the `FlagContext` — before falling through to the strategy
switch; `command_palette` and `webhooks` are the two flags marked
non-overridable (REQ-190), meaning an org cannot self-enable webhooks by
override alone even if it were somehow added to their settings, since
`webhooks` also requires the `growth` plan strategy to pass and overrides for
it are explicitly disabled at the definition level. `snapshotFlags(ctx)`
evaluates every flag at once and is what the dashboard layout serializes into
the client-side flag provider — REQ-194's requirement that the client
receives a flag snapshot, not the registry, meaning the client never sees
`FEATURE_FLAG_DEFINITIONS` itself, only the boolean outcome for the current
context, so a client cannot infer a competitor's rollout percentage or a
gated flag's exact plan requirement from inspecting the bundle.
`assertEnabled(flag, ctx)` is the throwing guard, raising
`FeatureDisabledError` (REQ-193), mapped by `src/lib/errors.ts` to a
`forbidden` `AppErrorShape` carrying the flag key in `meta`.

## Consequences

**What this buys the team.** `isEnabled()` being the single function called
by both server gates and the client snapshot means the two can never
disagree — the exact failure mode (a rendered control the server then
rejects) the team set out to prevent is structurally impossible as long as
nothing calls the strategy logic directly. Adding a new flag is declarative:
a new entry in `FEATURE_FLAG_DEFINITIONS` with the right strategy kind, no
new code path. `bucketOf()`'s determinism turned out to matter more than
anticipated once `ai_issue_summary` shipped — Ada Whitfield's rollout plan
depended on being able to tell a specific pilot customer "you're in the 25
percent," true for their whole organization consistently, which a
per-request random roll could never have promised. `webhooks` being both
plan-gated and explicitly non-overridable closed a real gap: without the
`overridable: false` flag, a support engineer adding an org to an override
list to unblock one customer's early access could have accidentally granted
a feature (webhooks) that has its own resourcing implications (ADR-011's
`webhook:deliver` rate-limit bucket, ADR-018's delivery infrastructure) that
a simple UI toggle was never meant to provision.

**What it costs.** Four strategy kinds mean `isEnabled()`'s switch statement
is the one place that has to stay correct for all of them simultaneously,
and a flag's evaluation now depends on the shape of `FlagContext` being
fully and correctly populated by every caller — a caller that forgets to
set `ctx.role` when checking a role-gated flag, or `ctx.plan` for a
plan-gated one, silently gets `false` from the relevant strategy branch
rather than an error, which is safe (fails closed) but has caused at least
one debugging session (February 2026, `issue_templates` appearing
unavailable for an admin) that traced back to a call site building
`FlagContext` from a stale actor object missing the current role. The
percentage strategy's hash-based bucketing is also opaque to manual
reasoning — there is no way to look at an org's id and immediately know
which bucket it falls in without running `bucketOf()`, which has occasionally
made support conversations ("why does this specific customer have AI
summaries and this one doesn't") require an engineer to run the function
rather than answer from memory.

## Alternatives considered

**Separate, purpose-built mechanisms per gating type** — a plan-check helper
for plan gates, a role-check helper for role gates, a dedicated rollout
service for percentage flags. This is roughly where the codebase started
before this ADR, in an earlier prototype of `kanban_board`'s gating. Rejected
for the same reason ADR-003 rejects per-resource permission guards: no single
evaluator, no single place the client and server can both call to guarantee
agreement.

**A third-party feature-flag SaaS.** The default choice at many companies,
and rejected immediately given the no-external-services constraint — there is
nowhere for a flag-evaluation SDK to phone home to in this build.

**True random percentage rollout** (roll the dice on every request rather
than hashing to a stable bucket). Rejected specifically because it fails
REQ-189's determinism requirement and would have made the pilot-customer
rollout scenario impossible to promise reliably — a flickering feature is
worse for a rollout than a slower one.

## References

- REQ-185 (flags declared in a single registry), REQ-186 (evaluation goes
  through one function), REQ-187 (four evaluation strategies), REQ-189
  (percentage rollout deterministic per organization), REQ-190 (some flags
  not overridable), REQ-191 (per-organization overrides in organization
  settings), REQ-193 (disabled feature fails with `FeatureDisabledError`),
  REQ-194 (client receives a snapshot, not the registry), REQ-195 (flag keys
  are a closed union)
- ADR-003 (the single-entry-point pattern this evaluator mirrors), ADR-010
  (`PLAN_ORDER`/`planAtLeast` the plan strategy reads from)
- Code: `src/config/feature-flags.ts` (`FEATURE_FLAG_DEFINITIONS`,
  `FEATURE_FLAG_KEYS`, `getFlagDefinition`, `isFeatureFlagKey`),
  `src/lib/feature-flags.ts` (`isEnabled`, `snapshotFlags`, `assertEnabled`,
  `FeatureDisabledError`, `bucketOf`), `src/types/feature-flag.ts`
