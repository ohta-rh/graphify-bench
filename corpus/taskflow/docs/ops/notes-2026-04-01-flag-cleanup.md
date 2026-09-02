---
title: Notes — feature flag cleanup
id: OPS-NOTES-2026-04-01
status: approved
owners: [a.whitfield]
last_updated: 2026-04-01
related: [REQ-185, REQ-190, REQ-195, DES-176]
---

**Date:** 2026-04-01
**Attendees:** a.whitfield (chair), t.abara, s.duarte, d.okafor

## Agenda

1. Review the ten flags currently in `FEATURE_FLAG_DEFINITIONS` and decide which, if
   any, are candidates for removal or graduation to always-on.
2. Discuss whether `command_palette` should ever become overridable, since it currently
   is not.
3. Decide a general policy for how long a flag should live before it must be either
   removed or formally graduated.

## Discussion

Ada opened with a straightforward inventory: `kanban_board` (plan >= starter,
overridable), `ai_issue_summary` (25% rollout, overridable), `command_palette` (on, not
overridable), `activity_feed` (plan >= growth, overridable), `public_projects` (plan >=
enterprise, overridable), `webhooks` (plan >= growth, not overridable), `csv_export`
(plan >= starter, overridable), `digest_email` (plan >= growth, overridable),
`issue_templates` (role >= admin, overridable), `advanced_search` (plan >= enterprise,
overridable). She asked which of these are still doing meaningful gating work versus
which have effectively become permanent product behavior that just happens to still be
wrapped in an `isEnabled()` check.

Sofia made the case that `command_palette` should graduate to no flag at all — it has
been on for every organization since launch, was never plan-gated, and the design team
has stopped treating it as an experimental surface in any of their current work. Tomas
agreed it was a reasonable graduation candidate but flagged a practical reason to keep
the flag wrapper even after the rollout question is settled: several integration tests
use `command_palette`'s flag context as a convenient way to exercise the "always on,
not overridable" evaluation strategy path (`REQ-187`) in `feature-flags.ts`, and removing
the flag entirely would mean rewriting those tests against a different flag or a
synthetic one. The group agreed to leave `command_palette` in place structurally but
stop treating it as meaningful product signal — Sofia will note in the design system
that it should be treated as permanent UI, not a flag-gated experiment, regardless of
what the code still calls it.

Deji raised `ai_issue_summary`'s 25% rollout specifically: it has sat at 25% for months
with no decision to move it up or down. Ada admitted this was more an oversight than a
deliberate choice — the percentage rollout mechanism (`REQ-189`, deterministic per
organization via a hash of the org id) works correctly, but nobody had actually revisited
the rollout percentage since the initial launch decision. The group agreed this was the
real problem the meeting should solve: not any single flag's specific state, but the
absence of a review cadence.

The group settled on a lightweight policy: every flag review (this meeting, recurring
quarterly per `notes-2026-08-24-quarterly-architecture-review.md`'s broader review
cadence) should explicitly ask, for every flag, one of three questions — should this
graduate to always-on, should this be removed because the feature was rejected or
deprecated, or does it still need active gating and at what setting. A flag that has not
changed state in two consecutive quarterly reviews should be flagged for an explicit
decision rather than being silently carried forward a third time.

Sofia separately raised whether `issue_templates`'s role gate (`role >= admin`) made
sense as a flag dimension at all, since role is already an authorization concern
handled by `can()` — why route it through the flag evaluator instead of the permission
matrix? Deji explained the distinction: `issue_templates` gates whether the *feature
exists* for the org at all (a product-tier or rollout decision), while `can()` governs
who, once the feature exists, is allowed to configure it — the two questions happen to
both resolve to "admin" here but are conceptually separate axes, and `DES-048`
documents this as a deliberate separation, not an accident. The group agreed no change
was needed here, just a shared understanding of why the two systems overlap for this
one flag.

## Decisions

1. `command_palette` is treated as permanent UI, not an active flag-gated experiment,
   though the flag wrapper stays in code for test-infrastructure reasons.
2. `ai_issue_summary`'s rollout percentage needs an explicit owner decision, not a
   default carry-forward; Ada to bring a recommendation to the next quarterly review.
3. A quarterly flag-review policy is adopted: every flag gets an explicit
   graduate/remove/keep-gating decision each quarter, and a flag unchanged across two
   consecutive reviews must get a decision at the third, not silent continuation.
4. No change to `issue_templates`'s role-based gating; the overlap with `can()` is
   understood and intentional (relates `DES-048`).

Tomas closed the discussion with a process question: who actually owns deciding a
flag's rollout percentage or plan gate day to day — is it the engineer who built the
feature, product, or whoever happens to notice the flag in a review? The group agreed
this ambiguity was itself part of why `ai_issue_summary` had drifted unreviewed for
months; nobody was clearly on the hook for it. Ada proposed that going forward, every
new flag added to `FEATURE_FLAG_DEFINITIONS` should be assigned an explicit owner in the
PR that introduces it, recorded in a comment beside the flag definition, so the
quarterly review has someone specific to ask rather than falling to whoever is running
the meeting that quarter. The group adopted this as a lightweight process addition
alongside the quarterly cadence itself.

## Follow-ups

- Ada to bring an `ai_issue_summary` rollout recommendation to the next quarterly
  review.
- Sofia to update design system documentation to stop describing `command_palette` as
  experimental.
- Deji to add the quarterly flag-review checklist to the recurring architecture review
  agenda template.
