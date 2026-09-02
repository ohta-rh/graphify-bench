import type { LimitedResource, PlanId } from "@/types/billing";
import type { FeatureFlagKey } from "@/types/feature-flag";

/**
 * The one place plan quotas are declared.
 *
 * `BillingService`, the invite flow, the project-create action, the webhook
 * settings page, the usage meter component and the seat-limit job all read
 * their numbers from here via `getPlanLimits()`. Adding a field to
 * `PlanLimits` therefore ripples into every one of those call sites — that
 * ripple is intentional and is what keeps the quotas honest.
 */
export interface PlanLimits {
  readonly plan: PlanId;
  readonly seats: number;
  readonly projects: number;
  readonly issuesPerProject: number;
  readonly storageMb: number;
  readonly apiRequestsPerHour: number;
  readonly webhooks: number;
  readonly retentionDays: number;
  readonly includedFlags: readonly FeatureFlagKey[];
  readonly priceCentsPerSeatMonthly: number;
}

/** `Infinity` is the sanctioned representation of "no limit". */
export const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Readonly<Record<PlanId, PlanLimits>> = {
  free: {
    plan: "free",
    seats: 3,
    projects: 2,
    issuesPerProject: 100,
    storageMb: 100,
    apiRequestsPerHour: 100,
    webhooks: 0,
    retentionDays: 30,
    includedFlags: ["command_palette"],
    priceCentsPerSeatMonthly: 0,
  },
  starter: {
    plan: "starter",
    seats: 10,
    projects: 10,
    issuesPerProject: 1_000,
    storageMb: 2_000,
    apiRequestsPerHour: 1_000,
    webhooks: 2,
    retentionDays: 90,
    includedFlags: ["command_palette", "kanban_board", "csv_export"],
    priceCentsPerSeatMonthly: 900,
  },
  growth: {
    plan: "growth",
    seats: 50,
    projects: 100,
    issuesPerProject: 10_000,
    storageMb: 20_000,
    apiRequestsPerHour: 10_000,
    webhooks: 10,
    retentionDays: 365,
    includedFlags: [
      "command_palette",
      "kanban_board",
      "csv_export",
      "activity_feed",
      "digest_email",
      "webhooks",
      "issue_templates",
    ],
    priceCentsPerSeatMonthly: 1_900,
  },
  enterprise: {
    plan: "enterprise",
    seats: UNLIMITED,
    projects: UNLIMITED,
    issuesPerProject: UNLIMITED,
    storageMb: 500_000,
    apiRequestsPerHour: 100_000,
    webhooks: UNLIMITED,
    retentionDays: 2_555,
    includedFlags: [
      "command_palette",
      "kanban_board",
      "csv_export",
      "activity_feed",
      "digest_email",
      "webhooks",
      "issue_templates",
      "advanced_search",
      "public_projects",
      "ai_issue_summary",
    ],
    priceCentsPerSeatMonthly: 3_900,
  },
};

/** Plans ordered cheapest → richest; used for "at least this plan" checks. */
export const PLAN_ORDER: readonly PlanId[] = [
  "free",
  "starter",
  "growth",
  "enterprise",
];

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_LIMITS[plan];
}

/** Reads one numeric quota without the caller destructuring `PlanLimits`. */
export function getLimit(plan: PlanId, resource: LimitedResource): number {
  return getPlanLimits(plan)[resource];
}

/** True when `plan` is at least as rich as `minPlan`. */
export function planAtLeast(plan: PlanId, minPlan: PlanId): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(minPlan);
}

/** True when consuming `requested` more units would breach the quota. */
export function wouldExceedLimit(
  plan: PlanId,
  resource: LimitedResource,
  used: number,
  requested = 1,
): boolean {
  return used + requested > getLimit(plan, resource);
}
