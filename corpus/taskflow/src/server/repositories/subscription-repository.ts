/**
 * Subscription rows; one active row per organization.
 */
import { and, eq, isNotNull, lte, ne } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, subscriptions } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { toSubscription } from "./_mappers";
import type { BillingInterval, PlanId, Subscription } from "@/types/billing";
import type { IsoTimestamp, OrgId } from "@/types/common";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 14;

export async function findSubscription(
  orgId: OrgId,
): Promise<Subscription | null> {
  const row = getDb()
    .select()
    .from(subscriptions)
    .where(orgPredicate(subscriptions.orgId, orgId))
    .get();
  return row ? toSubscription(row) : null;
}

/** New organizations start on a trial period rather than an active plan. */
export async function insertSubscription(
  orgId: OrgId,
  plan: PlanId,
  interval: BillingInterval,
): Promise<Subscription> {
  const now = new Date();
  const stamp = toIsoTimestamp(now);
  const periodEnd = toIsoTimestamp(
    new Date(now.getTime() + TRIAL_DAYS * MS_PER_DAY),
  );

  const row = getDb()
    .insert(subscriptions)
    .values({
      id: newId(),
      orgId,
      plan,
      interval,
      status: plan === "free" ? "active" : "trialing",
      seats: 1,
      currentPeriodStart: stamp,
      currentPeriodEnd: periodEnd,
      cancelAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toSubscription(row);
}

/** A plan change ends the trial: the org has made a deliberate choice. */
export async function updateSubscriptionPlan(
  orgId: OrgId,
  plan: PlanId,
  interval: BillingInterval,
): Promise<Subscription> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .update(subscriptions)
    .set({ plan, interval, status: "active", updatedAt: stamp })
    .where(orgPredicate(subscriptions.orgId, orgId))
    .returning()
    .get();

  if (!row) throw new Error(`Subscription for org ${orgId} not found`);
  return toSubscription(row);
}

export async function updateSeatCount(
  orgId: OrgId,
  seats: number,
): Promise<Subscription> {
  const row = getDb()
    .update(subscriptions)
    .set({ seats, updatedAt: toIsoTimestamp(new Date()) })
    .where(orgPredicate(subscriptions.orgId, orgId))
    .returning()
    .get();

  if (!row) throw new Error(`Subscription for org ${orgId} not found`);
  return toSubscription(row);
}

/** `cancelAt === null` reactivates a subscription scheduled for cancellation. */
export async function cancelSubscription(
  orgId: OrgId,
  cancelAt: IsoTimestamp | null,
): Promise<Subscription> {
  const row = getDb()
    .update(subscriptions)
    .set({
      cancelAt,
      status: cancelAt === null ? "active" : "canceled",
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(orgPredicate(subscriptions.orgId, orgId))
    .returning()
    .get();

  if (!row) throw new Error(`Subscription for org ${orgId} not found`);
  return toSubscription(row);
}

/** Feeds the trial-expiry job; cross-tenant by design, it sweeps every org. */
export async function listTrialsEndingBefore(
  before: IsoTimestamp,
): Promise<readonly Subscription[]> {
  const rows = getDb()
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "trialing"),
        isNotNull(subscriptions.currentPeriodEnd),
        lte(subscriptions.currentPeriodEnd, before),
        ne(subscriptions.plan, "free"),
      ),
    )
    .all();

  return rows.map(toSubscription);
}
