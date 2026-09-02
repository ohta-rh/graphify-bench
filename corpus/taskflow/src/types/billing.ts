import type {
  IsoTimestamp,
  OrgId,
  SubscriptionId,
  TenantScoped,
  Timestamps,
} from "./common";

export type PlanId = "free" | "starter" | "growth" | "enterprise";

export const PLAN_IDS: readonly PlanId[] = [
  "free",
  "starter",
  "growth",
  "enterprise",
];

export type BillingInterval = "monthly" | "annual";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export interface Subscription extends Timestamps, TenantScoped {
  readonly id: SubscriptionId;
  readonly plan: PlanId;
  readonly interval: BillingInterval;
  readonly status: SubscriptionStatus;
  readonly seats: number;
  readonly currentPeriodStart: IsoTimestamp;
  readonly currentPeriodEnd: IsoTimestamp;
  readonly cancelAt: IsoTimestamp | null;
}

/** The resource dimensions every plan caps. Adding a field here ripples into
 *  `PLAN_LIMITS`, `BillingService`, the usage UI and the limit guards. */
export type LimitedResource =
  | "seats"
  | "projects"
  | "issuesPerProject"
  | "storageMb"
  | "apiRequestsPerHour"
  | "webhooks";

/** Result of a single quota check, returned by `BillingService.checkLimit`. */
export interface LimitCheck {
  readonly resource: LimitedResource;
  readonly plan: PlanId;
  readonly limit: number;
  readonly used: number;
  readonly remaining: number;
  readonly exceeded: boolean;
}

export interface Invoice extends Timestamps, TenantScoped {
  readonly id: string;
  readonly number: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly periodStart: IsoTimestamp;
  readonly periodEnd: IsoTimestamp;
  readonly paidAt: IsoTimestamp | null;
}

export interface BillingSummary {
  readonly orgId: OrgId;
  readonly subscription: Subscription;
  readonly checks: readonly LimitCheck[];
  readonly upcomingInvoiceCents: number;
}
