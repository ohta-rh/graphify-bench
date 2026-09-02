/**
 * Plan changes and quota arithmetic. The single reader of `PLAN_LIMITS` on the server; every other layer asks this service.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, getPlanLimits, wouldExceedLimit, getLimit
 */
import {
  getLimit,
  getPlanLimits,
  wouldExceedLimit,
} from "@/config/plan-limits";
import { emit } from "@/lib/event-bus";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as invoiceRepo from "@/server/repositories/invoice-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { toIsoTimestamp } from "@/types/common";
import { actorEnvelope, billingResource, requireFound } from "./_support";
import type {
  CancelSubscriptionInput,
  ChangePlanInput,
  UpdateSeatsInput,
} from "@/schemas/billing";
import type {
  BillingSummary,
  Invoice,
  LimitCheck,
  LimitedResource,
  PlanId,
  Subscription,
} from "@/types/billing";
import type { OrgId } from "@/types/common";
import type { Actor } from "@/types/member";

/** The dimensions the billing page shows a meter for. */
const SUMMARY_RESOURCES: readonly LimitedResource[] = [
  "seats",
  "projects",
  "storageMb",
  "webhooks",
];

export async function getBillingSummary(
  actor: Actor,
  orgId: OrgId,
): Promise<BillingSummary> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "org:manage_billing", billingResource(orgId));

  const subscription = requireFound(
    await subscriptionRepo.findSubscription(orgId),
    "Subscription",
    orgId,
  );

  const checks = await Promise.all(
    SUMMARY_RESOURCES.map((resource) => checkLimit(orgId, resource, 0)),
  );

  const limits = getPlanLimits(subscription.plan);

  return {
    orgId,
    subscription,
    checks,
    upcomingInvoiceCents:
      limits.priceCentsPerSeatMonthly *
      subscription.seats *
      (subscription.interval === "annual" ? 12 : 1),
  };
}

/**
 * The one place a quota is evaluated. Every guard elsewhere calls this rather
 * than reading `PLAN_LIMITS` itself, so a new plan dimension needs changing in
 * exactly two files: `plan-limits.ts` and `usageFor()` below.
 */
export async function checkLimit(
  orgId: OrgId,
  resource: LimitedResource,
  requested = 1,
): Promise<LimitCheck> {
  const plan = await planFor(orgId);
  const used = await usageFor(orgId, resource);
  const limit = getLimit(plan, resource);

  return {
    resource,
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    exceeded: wouldExceedLimit(plan, resource, used, requested),
  };
}

/** Throwing form used by the create paths, and it emits the breach event. */
export async function assertWithinLimit(
  orgId: OrgId,
  resource: LimitedResource,
  requested = 1,
): Promise<void> {
  const check = await checkLimit(orgId, resource, requested);
  if (!check.exceeded) return;

  await emit("billing.limit_exceeded", {
    orgId,
    actorId: null,
    occurredAt: toIsoTimestamp(new Date()),
    resource,
    limit: check.limit,
    used: check.used,
  });

  throw new Error(
    `Plan ${check.plan} allows ${check.limit} ${resource}; ${check.used} are in use`,
  );
}

/**
 * A downgrade is refused while the org is over the target plan's quota — the
 * alternative is silently breaking their workspace at the next write.
 */
export async function changePlan(
  actor: Actor,
  input: ChangePlanInput,
): Promise<Subscription> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "org:manage_billing", billingResource(input.orgId));

  const currentPlan = await planFor(input.orgId);

  for (const resource of SUMMARY_RESOURCES) {
    const used = await usageFor(input.orgId, resource);
    if (wouldExceedLimit(input.plan, resource, used, 0)) {
      throw new Error(
        `Cannot move to ${input.plan}: ${used} ${resource} exceeds its limit of ${getLimit(input.plan, resource)}`,
      );
    }
  }

  const subscription = await subscriptionRepo.updateSubscriptionPlan(
    input.orgId,
    input.plan,
    input.interval,
  );

  await emit("billing.plan_changed", {
    ...actorEnvelope(actor),
    from: currentPlan,
    to: input.plan,
  });

  return subscription;
}

export async function updateSeats(
  actor: Actor,
  input: UpdateSeatsInput,
): Promise<Subscription> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "org:manage_billing", billingResource(input.orgId));

  const plan = await planFor(input.orgId);

  if (input.seats > getLimit(plan, "seats")) {
    throw new Error(`Plan ${plan} tops out at ${getLimit(plan, "seats")} seats`);
  }

  return subscriptionRepo.updateSeatCount(input.orgId, input.seats);
}

/** Cancels at period end by default; `cancelImmediately` ends it now. */
export async function cancelSubscription(
  actor: Actor,
  input: CancelSubscriptionInput,
): Promise<Subscription> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "org:manage_billing", billingResource(input.orgId));

  const subscription = requireFound(
    await subscriptionRepo.findSubscription(input.orgId),
    "Subscription",
    input.orgId,
  );

  return subscriptionRepo.cancelSubscription(
    input.orgId,
    input.cancelImmediately
      ? toIsoTimestamp(new Date())
      : subscription.currentPeriodEnd,
  );
}

export async function listInvoices(
  actor: Actor,
  orgId: OrgId,
): Promise<readonly Invoice[]> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "org:manage_billing", billingResource(orgId));
  return invoiceRepo.listInvoices(orgId);
}

/**
 * The subscription row is the authority on which plan an org is on; the
 * denormalised `organizations.plan` column is only a display convenience, so
 * every quota decision reads the subscription first.
 */
async function planFor(orgId: OrgId): Promise<PlanId> {
  const subscription = await subscriptionRepo.findSubscription(orgId);
  if (subscription) return subscription.plan;

  const org = requireFound(
    await orgRepo.findOrgById(orgId),
    "Organization",
    orgId,
  );
  return org.plan;
}

/** Maps a quota dimension onto the counter that measures it. */
async function usageFor(
  orgId: OrgId,
  resource: LimitedResource,
): Promise<number> {
  const usage = await usageRepo.getUsage(orgId);

  switch (resource) {
    case "seats":
      return usage.seatsUsed;
    case "projects":
      return usage.projectsUsed;
    case "issuesPerProject":
      return usage.issuesUsed;
    case "storageMb":
      return usage.storageMbUsed;
    case "webhooks":
      return webhookRepo.countEndpoints(orgId);
    case "apiRequestsPerHour":
      return 0;
  }
}
