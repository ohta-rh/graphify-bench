---
title: Settings — billing, flags and webhooks
id: UI-SETTINGS-BILLING
status: approved
owners: [r.saito, k.ferreira]
last_updated: 2026-08-13
related: [REQ-131, REQ-141, REQ-152, REQ-190, DES-136, DES-159, DES-177, ADR-010]
---

# Settings — billing, flags and webhooks

Four routes share this file: the billing page, invoice history, feature flag overrides, and
webhook endpoint management. Grouped together because all four are "plan-adjacent"
configuration screens — each one either changes what the org pays for or is itself gated by
what the org's plan already includes.

## SCR-020 — Billing

- **Route:** `/{orgSlug}/settings/billing`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/billing/page.tsx`
- **Server or client:** Server Component shell, plan-selection cards are interactive
- **Permission required:** `org:manage_billing` (owner only, per the `ROLE_MATRIX` table in
  `brief-common.md`) — 404 otherwise
- **Feature flag:** none
- **Data loaded:** `getBillingSummary(actor, org.id)` (`src/server/services/billing-service.ts`)
- **Components:** `BillingPlanCard` (`src/components/domain/billing/billing-plan-card.tsx`),
  `UsagePanel`
- **Actions invoked:** `changePlanAction` (`src/actions/billing/change-plan.ts`)
- **Satisfies:** REQ-130, REQ-131, REQ-140, REQ-141, REQ-142
- **Design:** DES-135, DES-136

### Layout

A header showing seats-on-plan and subscription status, a link to the invoice history route, a
"Usage" section rendering the full `UsagePanel` (identical component to the one on the org
overview, reused verbatim — see `screen-org-home.md`), and a "Plans" section: a two-column grid
of `BillingPlanCard`s, one per entry in `PLAN_IDS` (`src/types/billing.ts`), each rendered from
`getPlanLimits(plan)` so the numbers shown for every tier — free, starter, growth, enterprise —
come from the exact same `PlanLimits` table the quota guards elsewhere in the app enforce
against, never a separately maintained marketing copy of those numbers. A footer note under the
plan grid states the downgrade rule plainly: "Downgrading is refused while usage still exceeds
the target plan — free up seats or projects first."

### Downgrades are checked against the target plan's limits before the switch

`DES-136` is the design fact this screen's downgrade behavior visualizes: before a plan change
takes effect, every summary resource (seats, projects, issues, storage, API requests, webhooks)
is checked against the *target* plan's limits, not the current one — an org sitting at 40 seats
cannot downgrade to starter (10 seats) no matter how the request is framed, and the check runs
for the whole resource set at once rather than seat-by-seat. This page has no client-side
pre-check of its own; `selectPlan()` is a thin `"use server"` wrapper around `changePlanAction`,
so a downgrade attempt that would violate a limit surfaces only as the generic action error
`BillingPlanCard`'s `onSelect` handler receives — there is no separate warning rendered before
the click, which means an org close to a downgrade boundary discovers the refusal only by
attempting it. `REQ-141` is the requirement this enforces, and `REQ-140` is the companion
requirement covering the success path: a plan change, once accepted, emits `billing.plan_changed`.

### SCR-021 — Invoices

- **Route:** `/{orgSlug}/settings/billing/invoices`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/billing/invoices/page.tsx`
- **Server or client:** Server Component
- **Permission required:** `org:manage_billing`, the identical gate the billing page uses — the
  page's own doc comment notes this is deliberate, since invoices carry amounts and are not
  something a member should be able to browse even read-only
- **Feature flag:** none
- **Data loaded:** `listInvoices(actor, org.id)`
- **Components:** `InvoiceTable` (`src/components/domain/billing/invoice-table.tsx`),
  `EmptyState`
- **Actions invoked:** none — purely a read screen
- **Satisfies:** REQ-143
- **Design:** none directly at the design-doc layer beyond the billing service's general
  invoice generation coverage

A single flat table, one row per billing period, newest first. `REQ-143` (invoices generated per
billing period) is the requirement this table visualizes; a free-plan org sees an `EmptyState`
("No invoices yet — Organizations on the free plan are never invoiced") since free orgs never
accrue a billed period in the first place.

## SCR-022 — Feature flags

- **Route:** `/{orgSlug}/settings/flags`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/flags/page.tsx`, list in
  `src/app/(dashboard)/[orgSlug]/settings/flags/flag-toggle-list.tsx`
- **Server or client:** Server Component shell, interactive toggle list
- **Permission required:** `org:manage_flags` (admin and above) — 404 otherwise
- **Feature flag:** n/a — this page *is* the flag-management surface, not something a flag
  gates
- **Data loaded:** no service call beyond tenant context; the ten rows are built in-memory from
  `Object.values(FEATURE_FLAG_DEFINITIONS)` (`src/config/feature-flags.ts`) combined with
  `isEnabled()` evaluated once per flag and `org.settings.enabledFlagOverrides` (a `Set`) for
  the override state
- **Components:** `FlagToggleList`
- **Actions invoked:** `toggleFeatureFlagAction` (`src/actions/flags/toggle-flag.ts`)
- **Satisfies:** REQ-185, REQ-188, REQ-190, REQ-191, REQ-192
- **Design:** DES-175, DES-176, DES-177

### Three separate facts per row, deliberately not conflated

This page's own doc comment names the exact design tension it resolves: each row shows three
things that are easy to collapse into one but are not the same fact — what the flag definition's
*rollout strategy* says (rendered via a local `describeStrategy()` helper mapping `on`/`off`/
`plan`/`role`/`percentage` to plain-English labels: "Always on," "Off by default," "Included from
a certain plan," "Limited by role," "Percentage rollout"), whether the *organization has an
override* set (`overridden`, from the `enabledFlagOverrides` set), and what `isEnabled()`
*actually evaluates to right now* (`enabled`, which folds the override, the strategy, and the
org's current plan/role context together). A row can show "Included from a certain plan" as its
strategy while still showing `enabled: false` if the org's current plan does not meet the
threshold, and a row can show `enabled: true` purely because of an override even though its
strategy alone would evaluate false — the three columns exist precisely so an admin can tell
those cases apart rather than only seeing the final boolean.

Only `overridable` flags (per `FEATURE_FLAG_DEFINITIONS[key].overridable`) accept a toggle in
`FlagToggleList` — `command_palette` and `webhooks` are both `NOT overridable` per
`brief-common.md`'s registry, so their rows render without a working switch regardless of the
viewing admin's role. `DES-177` is the authorization fact behind the toggle itself: `toggleFlag`
checks overridability against the *registry*, not against role rank — an admin cannot force an
override onto a non-overridable flag no matter how the request is crafted, because the guard is a
property of the flag definition, not a permission check that a higher role could satisfy. `REQ-192`
requires that a successful toggle emits `flag.toggled`, and `DES-177` adds that the emitted event
carries a *re-evaluation* of the result rather than trusting whatever the client requested —
so a listener reacting to `flag.toggled` always sees the actual post-toggle state, not the
client's intent.

## SCR-023 — Webhooks

- **Route:** `/{orgSlug}/settings/webhooks`
- **Files:** `src/app/(dashboard)/[orgSlug]/settings/webhooks/page.tsx`, manager in
  `src/app/(dashboard)/[orgSlug]/settings/webhooks/webhook-manager.tsx`
- **Server or client:** Server Component shell, interactive manager
- **Permission required:** `webhook:manage` (admin and above) — 404 when absent
- **Feature flag:** `webhooks` (plan >= growth, **not** overridable)
- **Data loaded:** `getPlanLimits(org.plan)` for the endpoint ceiling, `listWebhooks(actor,
  org.id)` (`src/server/services/webhook-service.ts`) — but only once the flag check passes
- **Components:** `WebhookManager`, `EmptyState`
- **Actions invoked:** `createWebhookAction` (`src/actions/webhooks/create-webhook.ts`),
  `deleteWebhookAction` (`src/actions/webhooks/delete-webhook.ts`)
- **Satisfies:** REQ-150, REQ-151, REQ-152, REQ-153, REQ-159, REQ-161
- **Design:** DES-159, DES-160, DES-161, DES-257, DES-258

### Three gates, and only the first one is a wall

This page's own doc comment lays out its gating order deliberately: permission (`webhook:manage`
— may you manage webhooks at all), flag (`webhooks` — is the surface available on this plan),
and quota (`endpoints.length >= limits.webhooks` — how many more you may add). Only the first is
a hard `notFound()`; the other two render as *explanations* rather than blocking navigation. A
disabled `webhooks` flag produces an `EmptyState` ("Webhooks are not part of this plan — Upgrade
in Settings → Billing…") and skips `listWebhooks` entirely, identical in shape to the
`activity_feed` gate documented in `screen-activity.md`. A reached quota does not block the page
from rendering at all — `WebhookManager` receives `atLimit={endpoints.length >= limits.webhooks}`
as a prop and is expected to disable its own "add endpoint" affordance internally, so existing
endpoints remain fully manageable (editable, deletable, testable) even once the org can create no
more.

`DES-257` is the design fact that explains why this page checks the flag and the quota as two
genuinely independent conditions rather than deriving one from the other: an *override* can force
the flag on without touching the numeric ceiling, since `webhooks` (the flag) governs whether the
feature surface exists at all while `limits.webhooks` (the quota, from `PlanLimits`) governs how
many endpoints the plan permits — a growth-plan org with the flag on by its normal plan gate and
a starter-plan org with the flag force-enabled by an override face the same quota math once
they're both past the flag check, because the quota is read straight from `getPlanLimits(org.plan)`
regardless of how the flag itself was satisfied.

### Secret minted once, never regenerated

`DES-159` documents a fact this screen's create flow depends on but does not surface visually
beyond a one-time reveal (handled inside `WebhookManager`, not this page): an endpoint's signing
secret is minted exactly once at creation and never regenerated — there is no "rotate secret"
action anywhere in the manifest for this screen, `create-webhook.ts` and `delete-webhook.ts` are
the only two mutations wired here. `DES-258` explains why `deleteWebhookAction` is deliberately
**not** flag-gated the way creation is: a downgraded organization that has lost the `webhooks`
flag must still be able to clean up its existing endpoints, so delete works even when the create
button and the rest of the page's normal content have already fallen back to the "not part of
this plan" `EmptyState` — practically, this means an org that downgrades below growth still needs
some path back into this page to delete stale endpoints, which the flag-off `EmptyState` as
currently written does not obviously provide, since the whole manager (delete button included)
is skipped when the flag check fails before `listWebhooks` ever runs. This is a known rough edge
worth flagging rather than glossing over: the design intent (`DES-258`) and the page's literal
control flow (flag-off short-circuits to `EmptyState` before the manager renders at all) do not
fully agree, and reconciling them is open in the same ops backlog referenced in
`screen-search.md`'s notes on copy/behavior drift.

### States

| state | screen | trigger | what the user sees |
|---|---|---|---|
| empty | invoices | zero invoices, typically a free-plan org | `EmptyState`: "No invoices yet" |
| loading | all four | client navigation | `[orgSlug]/loading.tsx` — none of these four define a dedicated `loading.tsx` |
| error | all four | thrown error resolving tenant context or a service call | `[orgSlug]/error.tsx` |
| permission denied | all four | `org:manage_billing` / `org:manage_flags` / `webhook:manage` fails | `notFound()` |
| flag off | webhooks | `webhooks` flag false for the org's plan | `EmptyState`: "Webhooks are not part of this plan," no endpoint list fetched |
| plan limit reached | billing | downgrade target plan's limits exceeded by current usage | Generic action error on `selectPlan()`, no pre-emptive client-side warning |
| plan limit reached | webhooks | `endpoints.length >= limits.webhooks` | `WebhookManager` renders existing endpoints normally; its create control is disabled via `atLimit` |
