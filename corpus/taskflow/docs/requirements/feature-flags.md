---
title: Feature flag requirements
id: REQ-FLAGS
status: approved
owners: [product-team, d.okafor]
last_updated: 2026-06-02
related: [REQ-005, REQ-131, ADR-012, DES-200]
---

## Scope

This document defines the requirements for the feature flag system: the registry, the single
evaluation function, the four rollout strategies, plan gating, non-overridable flags,
organization-level overrides, the client snapshot, and the closed set of flag keys. It is
consumed by nearly every other domain document — `REQ-050` (public projects), `REQ-079`
(CSV export), `REQ-120` (digest email), `REQ-136`/`REQ-152` (webhooks), `REQ-175`
(advanced search) and `REQ-024`'s issue-templates mention are all specific flags whose
general mechanics are defined here rather than repeated per document.

## Context

`src/config/feature-flags.ts` declares `FEATURE_FLAG_DEFINITIONS`, the one registry every
flag is declared in; `src/lib/feature-flags.ts`'s `isEnabled()` is the one function anything
in the app — server or client — calls to ask whether a flag is on for a given context, and
`snapshotFlags()` is how a server-resolved set of decisions crosses into client components
without shipping the registry itself. `feature-flag-service.ts` on the server builds the
`FlagContext` (`buildFlagContext`) from the actor and organization, and exposes
`getSnapshot`/`toggleFlag` for the settings page and its Server Action.

`ADR-012` documents the decision to support exactly four rollout strategies rather than a
general rules engine: plan-gated (the flag is on once the org's plan reaches a threshold,
per `PLAN_ORDER`), percentage rollout (deterministic per organization, not per user, so a
whole organization sees consistent behavior rather than individual members randomly
diverging), boolean-always-on (`command_palette`), and role-gated (the flag is on once the
acting user's role reaches a threshold, used by `issue_templates`). Every flag in the
registry declares exactly one of these strategies plus whether it is `overridable`.

Ten flags exist today: `kanban_board` (plan >= starter, overridable), `ai_issue_summary`
(percentage 25, overridable), `command_palette` (always on, not overridable),
`activity_feed` (plan >= growth, overridable), `public_projects` (plan >= enterprise,
overridable), `webhooks` (plan >= growth, not overridable), `csv_export` (plan >= starter,
overridable), `digest_email` (plan >= growth, overridable), `issue_templates` (role >=
admin, overridable), and `advanced_search` (plan >= enterprise, overridable). `webhooks` and
`command_palette` are the only two flags marked not overridable — for `command_palette`
because there is no reason to ever turn off a zero-cost client affordance, and for
`webhooks` because the plan-tier gate on webhooks is a monetization boundary the product
team does not want individual support interactions to erode by ad hoc override.

Organization-level overrides live in `Organization.settings` (`REQ-005`, defined in
`organizations.md`), which is why this document does not restate the storage location but
does define the override's evaluation semantics: an override only takes effect for flags
whose definition marks them `overridable`, and `toggleFlag` — the only mutator — requires
`org:manage_flags`, whose `ROLE_MATRIX` minimum is `admin`.

`src/config/nav.ts`'s `visibleNav` is a second, independent consumer of the flag system worth
naming here even though it belongs conceptually to navigation rather than to flags: each
`NavItem` optionally names both a `PermissionAction` and a `FeatureFlagKey`, and `visibleNav`
filters the sidebar and settings navigation trees by calling both `can()` and `isEnabled()`
for every item, so a flagged-off feature's settings link disappears from navigation the same
tick the flag itself would refuse the underlying action — there is no separate "hide the
nav item" maintenance step distinct from the flag definition driving the behavior it gates.

## Open questions

1. `REQ-189`'s percentage rollout is deterministic per organization, but this document does
   not specify the hashing input beyond "per organization" — whether it is stable across a
   flag's own lifetime (so an org does not flip in and out of a 25% rollout as unrelated
   registry changes are deployed) is an implementation property not independently pinned
   down by a requirement.
2. `REQ-187`'s four strategies do not include a strategy that combines two conditions (for
   example, plan-gated AND percentage), so a flag needing both would require either two
   flags or an ad hoc extension — not currently a real need, but a known limitation of the
   registry's shape.
3. Whether `toggleFlag`'s audit trail (`REQ-192`) distinguishes an override being set to
   `true` versus explicitly set to `false` (forcing a normally-on-by-plan flag off) from an
   override simply being cleared is not addressed here.
4. The role-gated strategy (`issue_templates`, `admin` minimum) evaluates against the
   acting user's role at request time, which raises a question none of the eleven
   requirements below directly answers: whether a snapshot taken for a page render should be
   invalidated the instant that user's role changes mid-session, or whether it is acceptable
   for a stale snapshot to grant access for the remainder of an already-rendered page.

### REQ-185 — Flags are declared in a single registry

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-012, REQ-195, DES-200
- **Implemented by:** `src/config/feature-flags.ts` — `FEATURE_FLAG_DEFINITIONS`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`FEATURE_FLAG_DEFINITIONS` in `src/config/feature-flags.ts` is the only place a flag's key,
strategy, and overridability are declared. No service defines its own ad hoc flag check;
every gated behavior in the product traces back to one entry in this table.

**Acceptance criteria**

1. Every `FeatureFlagKey` used anywhere in the codebase has a corresponding entry in
   `FEATURE_FLAG_DEFINITIONS`.
2. Adding a new gated feature requires exactly one new registry entry, not scattered
   conditionals.
3. The registry is a plain data structure, not a function, so its contents can be
   enumerated and documented without executing code.

### REQ-186 — Flag evaluation goes through one function

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-185, DES-200

`isEnabled(key, context)` in `src/lib/feature-flags.ts` is the sole evaluator, called from
both server code (services, jobs) and client components (through the snapshot, `REQ-194`).
No caller re-implements a strategy's logic locally; everything defers to this one function.

**Acceptance criteria**

1. Every call site checking a flag calls `isEnabled`, not a hand-rolled plan or role
   comparison that happens to match a flag's intent.
2. `isEnabled` is pure given its inputs — the same `(key, context)` pair always yields the
   same result for a given registry state.
3. `tests/lib/feature-flags.test.ts` exercises all four strategies through this one
   function.

**Implemented by:** `src/lib/feature-flags.ts`
**Verified by:** `tests/lib/feature-flags.test.ts`

### REQ-187 — Four evaluation strategies are supported

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-012, REQ-188, REQ-189
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/config/feature-flags.ts`
- **Verified by:** `tests/lib/feature-flags.test.ts`

Plan-gated, percentage rollout, always-on, and role-gated are the complete set. Every entry
in `FEATURE_FLAG_DEFINITIONS` declares exactly one; there is no flag with a hybrid or custom
strategy, which is the constraint `ADR-012` accepted in exchange for a registry simple enough
to audit at a glance.

**Acceptance criteria**

1. `isEnabled`'s implementation has exactly one branch per strategy kind, exhaustively
   covering the strategy union type.
2. A flag definition missing a strategy field fails validation at load time rather than
   defaulting to some implicit behavior.
3. Each of the ten current flags maps to exactly one of the four strategies as documented in
   the Context section above.

### REQ-188 — Plan-gated flags follow the plan ladder

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-131, REQ-050, REQ-120
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/config/plan-limits.ts` — `planAtLeast`
- **Verified by:** `tests/lib/feature-flags.test.ts`

A plan-gated flag's threshold is one of the four plan values, and evaluation uses
`planAtLeast(org.plan, threshold)` — the same ordering `PLAN_ORDER` establishes for
`REQ-131`'s downgrade logic — so a plan-gated flag is automatically consistent with billing's
own notion of "higher plan," rather than maintaining an independent comparison.

**Acceptance criteria**

1. `kanban_board`, `activity_feed`, `public_projects`, `csv_export`, `digest_email` and
   `advanced_search` all evaluate via `planAtLeast`.
2. An org's plan-gated flag state changes automatically and immediately when
   `billing.plan_changed` takes effect, without a separate flag-specific update step.
3. `webhooks` is plan-gated at `growth` exactly like `activity_feed` and `digest_email`, but
   is additionally marked non-overridable, distinguishing the gating threshold from the
   override policy.

### REQ-189 — Percentage rollout is deterministic per organization

- **Priority:** should
- **Status:** implemented
- **Related:** REQ-187, DES-210
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`ai_issue_summary`'s percentage-25 strategy hashes the organization's id (not the acting
user's) to decide whether that org falls inside the rollout percentage, so every member of a
given organization sees the same on/off state for the flag — there is no scenario where two
members of the same org disagree about whether `ai_issue_summary` is available to them
because of random per-request evaluation.

**Acceptance criteria**

1. Repeated evaluations of `isEnabled('ai_issue_summary', context)` for the same
   organization return the same result across calls, absent a registry change.
2. Two organizations, given a large enough sample, land in the rollout at approximately the
   registry's configured percentage.
3. The rollout decision does not depend on the acting user, only the organization.

### REQ-190 — Some flags are not overridable

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-152, REQ-191, DES-220
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/server/services/feature-flag-service.ts` — `toggleFlag`, `buildFlagContext`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`command_palette` and `webhooks` are marked `overridable: false` in their registry entries;
`toggleFlag` and `buildFlagContext`'s override lookup both must respect this — an override
value stored in `Organization.settings` for a non-overridable flag, however it might get
there, has no effect on evaluation.

**Acceptance criteria**

1. `isEnabled` for a non-overridable flag ignores any stored override and evaluates purely
   by strategy.
2. `toggleFlag` on a non-overridable flag key is rejected before it writes anything to
   `Organization.settings`.
3. The distinction between "overridable but currently off" and "not overridable" is visible
   in the flags settings UI, so an admin is not left wondering why a toggle has no effect.

### REQ-191 — Per-organization overrides live in organization settings

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-005, REQ-192
- **Implemented by:** `src/lib/feature-flags.ts` — `isEnabled`, `src/server/services/feature-flag-service.ts` — `buildFlagContext`
- **Verified by:** `tests/lib/feature-flags.test.ts`

This document is the evaluation-side complement to `REQ-005` in `organizations.md`, which
describes the storage location. Here, the requirement is about precedence: when an override
exists for an overridable flag, `isEnabled` uses the override's value directly rather than
falling through to the strategy evaluation, regardless of what the strategy would have
computed.

**Acceptance criteria**

1. An override of `true` on a flag whose plan-gated strategy would otherwise evaluate
   `false` results in the flag being enabled for that org.
2. An override of `false` on a flag whose strategy would otherwise evaluate `true` results
   in the flag being disabled for that org.
3. Clearing the override reverts evaluation to the underlying strategy, with no residual
   effect from the cleared value.

### REQ-192 — Toggling a flag requires admin and emits flag.toggled

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-024, DES-071
- **Implemented by:** `src/server/services/feature-flag-service.ts` — `toggleFlag`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`toggleFlag(actor, input)` requires `org:manage_flags` (`admin` minimum) and, on success,
emits `flag.toggled` with the flag key and new override value, which the activity service
records — an important audit trail entry, since a flag override can enable or disable
product surface area for an entire organization in one action.

**Acceptance criteria**

1. A `member` calling `toggleFeatureFlagAction` is denied regardless of which flag they
   target.
2. `flag.toggled`'s payload identifies the flag key and the resulting override state
   (enabled, disabled, or cleared).
3. `toggleFlag` on a non-overridable flag fails before emitting the event (`REQ-190`), since
   no actual change occurred.

### REQ-193 — A disabled feature fails with FeatureDisabledError

- **Priority:** must
- **Status:** implemented
- **Related:** ADR-014, REQ-138
- **Implemented by:** `src/lib/errors.ts` — `toAppError`
- **Verified by:** `tests/lib/errors.test.ts`

Attempting a gated action while its flag is off throws `FeatureDisabledError`, mapped by
`toAppError` to a distinct, specific `AppErrorShape` — not folded into `forbidden` or
`validation_failed` — so a client can distinguish "you don't have permission" from "this
isn't available on your plan or hasn't been rolled out to you yet" and render the
appropriate upsell or explanation.

**Acceptance criteria**

1. Every gated Server Action checks `isEnabled` and throws `FeatureDisabledError` rather
   than silently no-opping when the flag is off.
2. `FeatureDisabledError`'s mapped error code is distinct from `forbidden` and
   `plan_limit_exceeded`.
3. `tests/lib/errors.test.ts` covers `FeatureDisabledError`'s mapping alongside every other
   domain error class.

### REQ-194 — The client receives a flag snapshot, not the registry

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-186, DES-230
- **Implemented by:** `src/lib/feature-flags.ts` — `snapshotFlags`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`snapshotFlags()` produces a `FeatureFlagSnapshot` — a plain map of flag key to resolved
boolean for the current actor and org — that server components pass down to client
components, rather than shipping `FEATURE_FLAG_DEFINITIONS` itself to the browser. This
keeps rollout percentages and plan thresholds server-side implementation detail, not
something inspectable from client-side JavaScript.

**Acceptance criteria**

1. No client bundle includes `FEATURE_FLAG_DEFINITIONS` or the percentage-rollout hash
   input.
2. `FeatureFlagSnapshot` is computed once per request server-side and passed down, not
   recomputed independently by client components calling `isEnabled` themselves with a
   client-only context.
3. The snapshot reflects the same overrides and strategy evaluation the server would apply
   to a Server Action call in the same request.

### REQ-195 — Flag keys are a closed union

- **Priority:** must
- **Status:** implemented
- **Related:** REQ-185, DES-200
- **Implemented by:** `src/types/feature-flag.ts`, `src/schemas/feature-flag.ts`
- **Verified by:** `tests/lib/feature-flags.test.ts`

`FeatureFlagKey` in `src/types/feature-flag.ts` is a closed string-literal union matching
exactly the ten keys in `FEATURE_FLAG_DEFINITIONS`; `src/schemas/feature-flag.ts` validates
any client-supplied flag key (for `toggleFeatureFlagAction`'s input) against this same union
at runtime, so a request naming an unknown flag key fails validation before it ever reaches
`toggleFlag`.

**Acceptance criteria**

1. `FeatureFlagKey`'s type and `FEATURE_FLAG_DEFINITIONS`'s keys are kept in lockstep; a
   registry entry without a corresponding type member is a type error.
2. `toggleFeatureFlagSchema` rejects any flag key not in the closed union at the schema
   layer, before authorization or business logic runs.
3. Adding an eleventh flag requires updating both the type and the registry in the same
   change, never one without the other.
