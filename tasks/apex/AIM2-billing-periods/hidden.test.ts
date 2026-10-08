/**
 * Hidden test for AIM2-billing-periods: paid subscriptions renew period by
 * period and are invoiced once per period (catching up missed periods, with
 * month-end and leap-day clamping), cancellations take effect on their date,
 * free and trialing subscriptions are never invoiced, deleted workspaces are
 * skipped, the job is replay-safe and covers every workspace, and mid-period
 * seat and plan changes are charged through one proration rule.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getPlanLimits } from "@/config/plan-limits";
import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { resetRateLimits } from "@/lib/rate-limit";
import { getDb, subscriptions } from "@/server/db";
import { runMigrations } from "@/server/db/migrate";
import { runBillingRenewalJob } from "@/server/jobs/billing-renewal-job";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as activityService from "@/server/services/activity-service";
import * as billingService from "@/server/services/billing-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as notificationService from "@/server/services/notification-service";
import type { BillingInterval, Invoice, PlanId, Subscription, SubscriptionStatus } from "@/types/billing";
import type { IsoTimestamp, OrgId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Actor, Role } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const T0 = new Date("2026-06-02T10:00:00.000Z");
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const DAY = 24 * HOUR;

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

interface Tenant {
  readonly org: Organization;
  readonly project: Project;
  readonly actors: Readonly<Record<Role, Actor>>;
  readonly userIds: Readonly<Record<Role, UserId>>;
}

let dir: string;
let clockMs = T0.getTime();
const detachers: Unsubscribe[] = [];

function tick(ms = SECOND): void {
  clockMs += ms;
  vi.setSystemTime(new Date(clockMs));
}

function at(iso: string): void {
  clockMs = new Date(iso).getTime();
  vi.setSystemTime(new Date(clockMs));
}

function now(): Date {
  return new Date(clockMs);
}

function stamp(iso: string): IsoTimestamp {
  return new Date(iso).toISOString() as IsoTimestamp;
}

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

const price = (plan: PlanId): number => getPlanLimits(plan).priceCentsPerSeatMonthly;

async function createTenant(slug: string, plan: PlanId = "growth"): Promise<Tenant> {
  const owner = await userRepo.insertUser({ email: `owner@${slug}.test`, name: `${slug} owner`, passwordHash: "seed" });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");

  const userIds: Partial<Record<Role, UserId>> = {};
  const actors: Partial<Record<Role, Actor>> = {};
  for (const role of ROLES) {
    const user =
      role === "owner"
        ? owner
        : await userRepo.insertUser({ email: `${role}@${slug}.test`, name: `${slug} ${role}`, passwordHash: "seed" });
    tick();
    await memberRepo.insertMember(org.id, user.id, role, null);
    userIds[role] = user.id;
    actors[role] = { userId: user.id, orgId: org.id, role };
  }

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: owner.id,
    color: "#6366f1",
    targetDate: null,
  });

  return {
    org,
    project,
    actors: actors as Readonly<Record<Role, Actor>>,
    userIds: userIds as Readonly<Record<Role, UserId>>,
  };
}

/** A workspace with only an owner, for the many-workspaces case. */
async function lightTenant(slug: string): Promise<OrgId> {
  const owner = await userRepo.insertUser({ email: `owner@${slug}.test`, name: slug, passwordHash: "seed" });
  const org = await orgRepo.insertOrg({ name: slug, slug, plan: "growth" }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, "growth", "monthly");
  await memberRepo.insertMember(org.id, owner.id, "owner", null);
  return org.id;
}

/** Writes the subscription row the way a long-running system would have left it. */
async function setSubscription(
  orgId: OrgId,
  patch: Partial<{
    plan: PlanId;
    status: SubscriptionStatus;
    interval: BillingInterval;
    seats: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAt: string | null;
  }>,
): Promise<Subscription> {
  getDb()
    .update(subscriptions)
    .set({
      ...(patch.plan === undefined ? {} : { plan: patch.plan }),
      ...(patch.status === undefined ? {} : { status: patch.status }),
      ...(patch.interval === undefined ? {} : { interval: patch.interval }),
      ...(patch.seats === undefined ? {} : { seats: patch.seats }),
      ...(patch.currentPeriodStart === undefined ? {} : { currentPeriodStart: stamp(patch.currentPeriodStart) }),
      ...(patch.currentPeriodEnd === undefined ? {} : { currentPeriodEnd: stamp(patch.currentPeriodEnd) }),
      ...(patch.cancelAt === undefined ? {} : { cancelAt: patch.cancelAt === null ? null : stamp(patch.cancelAt) }),
    })
    .where(eq(subscriptions.orgId, orgId))
    .run();
  const row = await subscriptionRepo.findSubscription(orgId);
  if (!row) throw new Error("subscription missing");
  return row;
}

async function paidActive(
  t: Tenant,
  options: Partial<{ plan: PlanId; interval: BillingInterval; seats: number; start: string; end: string }> = {},
): Promise<Subscription> {
  return setSubscription(t.org.id, {
    plan: options.plan ?? "growth",
    status: "active",
    interval: options.interval ?? "monthly",
    seats: options.seats ?? 1,
    currentPeriodStart: options.start ?? "2026-05-01T10:00:00.000Z",
    currentPeriodEnd: options.end ?? "2026-06-01T10:00:00.000Z",
    cancelAt: null,
  });
}

async function invoices(t: Tenant): Promise<readonly Invoice[]> {
  return billingService.listInvoices(t.actors.owner, t.org.id);
}

async function subscription(t: Tenant): Promise<Subscription> {
  const row = await subscriptionRepo.findSubscription(t.org.id);
  if (!row) throw new Error("subscription missing");
  return row;
}

async function invoiceAlerts(t: Tenant, role: Role) {
  const page = await notificationService.listNotifications(t.actors[role], {
    orgId: t.org.id,
    recipientId: t.userIds[role],
    unreadOnly: false,
    kind: ["invoice_issued"],
    limit: 100,
    cursor: null,
  });
  return page.items;
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-aim2-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  registerEventHandlers();
});

beforeEach(() => {
  at("2026-06-02T10:00:00.000Z");
  resetRateLimits();
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

describe("renewal", () => {
  it("renews an ended paid period once: invoice, new period, announcement, alert, audit row", async () => {
    const t = await createTenant("renew-once");
    await paidActive(t, { seats: 3 });
    const issued = capture("billing.invoice_issued");

    const result = await runBillingRenewalJob(now());

    expect(result.processed).toBe(1);
    const list = await invoices(t);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      orgId: t.org.id,
      amountCents: price("growth") * 3,
      currency: "usd",
      periodStart: stamp("2026-06-01T10:00:00.000Z"),
      periodEnd: stamp("2026-07-01T10:00:00.000Z"),
      paidAt: null,
    });
    expect(await subscription(t)).toMatchObject({
      status: "active",
      plan: "growth",
      currentPeriodStart: stamp("2026-06-01T10:00:00.000Z"),
      currentPeriodEnd: stamp("2026-07-01T10:00:00.000Z"),
    });
    expect(issued).toHaveLength(1);
    expect(issued[0]).toMatchObject({ orgId: t.org.id, invoiceId: list[0]?.id, amountCents: price("growth") * 3 });
    expect(await invoiceAlerts(t, "owner")).toHaveLength(1);
    expect(await invoiceAlerts(t, "admin")).toHaveLength(0);

    const audit = await activityService.listActivity(t.actors.admin, {
      orgId: t.org.id,
      action: ["billing.invoice_issued"],
      limit: 25,
      cursor: null,
    });
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]).toMatchObject({ subjectKind: "subscription", subjectId: t.org.id });
  });

  it("changes nothing when run again at the same instant", async () => {
    const t = await createTenant("renew-replay");
    await paidActive(t);

    await runBillingRenewalJob(now());
    const after = await subscription(t);
    tick();
    await runBillingRenewalJob(now());
    await runBillingRenewalJob(now());

    expect(await invoices(t)).toHaveLength(1);
    expect(await subscription(t)).toMatchObject({
      currentPeriodStart: after.currentPeriodStart,
      currentPeriodEnd: after.currentPeriodEnd,
    });
    expect(await invoiceAlerts(t, "owner")).toHaveLength(1);
  });

  it("catches up one period per missed interval, with consecutive periods", async () => {
    const t = await createTenant("renew-catchup");
    await paidActive(t, { start: "2026-02-01T10:00:00.000Z", end: "2026-03-01T10:00:00.000Z" });

    await runBillingRenewalJob(now());

    const list = [...(await invoices(t))].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
    expect(list.map((row) => [row.periodStart, row.periodEnd])).toEqual([
      [stamp("2026-03-01T10:00:00.000Z"), stamp("2026-04-01T10:00:00.000Z")],
      [stamp("2026-04-01T10:00:00.000Z"), stamp("2026-05-01T10:00:00.000Z")],
      [stamp("2026-05-01T10:00:00.000Z"), stamp("2026-06-01T10:00:00.000Z")],
      [stamp("2026-06-01T10:00:00.000Z"), stamp("2026-07-01T10:00:00.000Z")],
    ]);
    expect(list.every((row) => row.amountCents === price("growth"))).toBe(true);
    expect((await subscription(t)).currentPeriodEnd).toBe(stamp("2026-07-01T10:00:00.000Z"));
    expect(await invoiceAlerts(t, "owner")).toHaveLength(4);
  });

  it("charges twelve months for an annual period and moves a year ahead", async () => {
    const t = await createTenant("renew-annual");
    await paidActive(t, { interval: "annual", seats: 2, start: "2025-06-01T10:00:00.000Z", end: "2026-06-01T10:00:00.000Z" });

    await runBillingRenewalJob(now());

    const list = await invoices(t);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      amountCents: price("growth") * 2 * 12,
      periodStart: stamp("2026-06-01T10:00:00.000Z"),
      periodEnd: stamp("2027-06-01T10:00:00.000Z"),
    });
  });

  it("clamps a month-end start to the next month's last day, and carries the clamped day forward", async () => {
    const t = await createTenant("renew-clamp");
    await paidActive(t, { start: "2025-12-31T10:00:00.000Z", end: "2026-01-31T10:00:00.000Z" });
    at("2026-03-01T00:00:00.000Z");

    await runBillingRenewalJob(now());

    const list = [...(await invoices(t))].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
    expect(list.map((row) => [row.periodStart, row.periodEnd])).toEqual([
      [stamp("2026-01-31T10:00:00.000Z"), stamp("2026-02-28T10:00:00.000Z")],
      [stamp("2026-02-28T10:00:00.000Z"), stamp("2026-03-28T10:00:00.000Z")],
    ]);
  });

  it("turns a 29 February start into 28 February a year later", async () => {
    const t = await createTenant("renew-leap");
    await paidActive(t, { interval: "annual", start: "2027-02-28T10:00:00.000Z", end: "2028-02-29T10:00:00.000Z" });
    at("2028-03-01T00:00:00.000Z");

    await runBillingRenewalJob(now());

    expect((await invoices(t)).map((row) => [row.periodStart, row.periodEnd])).toEqual([
      [stamp("2028-02-29T10:00:00.000Z"), stamp("2029-02-28T10:00:00.000Z")],
    ]);
  });

  it("advances a free subscription's period without an invoice or an alert", async () => {
    const t = await createTenant("renew-free", "free");
    await setSubscription(t.org.id, {
      plan: "free",
      status: "active",
      currentPeriodStart: "2026-05-01T10:00:00.000Z",
      currentPeriodEnd: "2026-06-01T10:00:00.000Z",
    });

    await runBillingRenewalJob(now());

    expect(await invoices(t)).toHaveLength(0);
    expect(await invoiceAlerts(t, "owner")).toHaveLength(0);
    expect((await subscription(t)).currentPeriodEnd).toBe(stamp("2026-07-01T10:00:00.000Z"));
  });

  it("leaves trialing and past-due subscriptions alone", async () => {
    const trial = await createTenant("renew-trial");
    await setSubscription(trial.org.id, {
      status: "trialing",
      currentPeriodStart: "2026-05-01T10:00:00.000Z",
      currentPeriodEnd: "2026-05-15T10:00:00.000Z",
    });
    const overdue = await createTenant("renew-pastdue");
    await setSubscription(overdue.org.id, {
      status: "past_due",
      currentPeriodStart: "2026-04-01T10:00:00.000Z",
      currentPeriodEnd: "2026-05-01T10:00:00.000Z",
    });

    await runBillingRenewalJob(now());

    expect(await invoices(trial)).toHaveLength(0);
    expect((await subscription(trial)).currentPeriodEnd).toBe(stamp("2026-05-15T10:00:00.000Z"));
    expect(await invoices(overdue)).toHaveLength(0);
    expect((await subscription(overdue)).currentPeriodEnd).toBe(stamp("2026-05-01T10:00:00.000Z"));
  });

  it("does nothing before a period has ended, and renews at the very instant it does", async () => {
    const t = await createTenant("renew-boundary");
    await paidActive(t, { start: "2026-05-02T10:00:00.000Z", end: "2026-06-02T11:00:00.000Z" });

    await runBillingRenewalJob(now());
    expect(await invoices(t)).toHaveLength(0);

    at("2026-06-02T11:00:00.000Z");
    await runBillingRenewalJob(now());
    expect(await invoices(t)).toHaveLength(1);
  });

  it("skips a deleted workspace entirely", async () => {
    const t = await createTenant("renew-deleted");
    await paidActive(t);
    tick();
    await orgRepo.archiveOrg(t.org.id);

    await runBillingRenewalJob(now());

    expect(await invoices(t)).toHaveLength(0);
    expect((await subscription(t)).currentPeriodEnd).toBe(stamp("2026-06-01T10:00:00.000Z"));
  });

  it("covers every due workspace in one run, however many", async () => {
    const orgIds: OrgId[] = [];
    for (let i = 0; i < 60; i += 1) {
      const orgId = await lightTenant(`many-${i}`);
      await setSubscription(orgId, {
        status: "active",
        currentPeriodStart: "2026-05-01T10:00:00.000Z",
        currentPeriodEnd: "2026-06-01T10:00:00.000Z",
      });
      orgIds.push(orgId);
    }

    await runBillingRenewalJob(now());

    for (const orgId of orgIds) {
      const row = await subscriptionRepo.findSubscription(orgId);
      expect(row?.currentPeriodEnd).toBe(stamp("2026-07-01T10:00:00.000Z"));
    }
  });
});

describe("cancellation", () => {
  it("ends a subscription on its cancellation date, not before, and only once", async () => {
    const t = await createTenant("cancel-period-end");
    await paidActive(t, { start: "2026-05-15T10:00:00.000Z", end: "2026-06-15T10:00:00.000Z" });
    tick();
    await billingService.cancelSubscription(t.actors.owner, { orgId: t.org.id, cancelImmediately: false });
    const changed = capture("billing.plan_changed");

    await runBillingRenewalJob(now());
    expect(await subscription(t)).toMatchObject({ status: "canceled", plan: "growth", cancelAt: stamp("2026-06-15T10:00:00.000Z") });
    expect(changed).toHaveLength(0);

    at("2026-06-15T10:00:00.000Z");
    await runBillingRenewalJob(now());
    expect(await subscription(t)).toMatchObject({
      status: "active",
      plan: "free",
      cancelAt: null,
      currentPeriodStart: stamp("2026-06-15T10:00:00.000Z"),
      currentPeriodEnd: stamp("2026-07-15T10:00:00.000Z"),
    });
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ orgId: t.org.id, from: "growth", to: "free" });
    expect(await invoices(t)).toHaveLength(0);

    tick();
    await runBillingRenewalJob(now());
    expect(changed).toHaveLength(1);
    expect((await subscription(t)).currentPeriodEnd).toBe(stamp("2026-07-15T10:00:00.000Z"));
  });

  it("ends an immediate cancellation on the next run", async () => {
    const t = await createTenant("cancel-now");
    await paidActive(t, { start: "2026-05-15T10:00:00.000Z", end: "2026-06-15T10:00:00.000Z" });
    tick();
    await billingService.cancelSubscription(t.actors.owner, { orgId: t.org.id, cancelImmediately: true });
    const cancelAt = (await subscription(t)).cancelAt;

    tick();
    await runBillingRenewalJob(now());

    expect(await subscription(t)).toMatchObject({ status: "active", plan: "free", cancelAt: null, currentPeriodStart: cancelAt });
    expect(await invoices(t)).toHaveLength(0);
  });
});

describe("mid-period changes", () => {
  it("charges added seats for the rest of the period, through the owner's alert", async () => {
    const t = await createTenant("seats-up");
    await paidActive(t, { seats: 2, start: "2026-05-02T10:00:00.000Z", end: "2026-06-01T10:00:00.000Z" });
    at("2026-05-17T12:00:00.000Z");
    const issued = capture("billing.invoice_issued");

    await billingService.updateSeats(t.actors.owner, { orgId: t.org.id, seats: 5 });

    const remaining = 15; // 14 days 22 hours left -> 15 started days
    const periodDays = 30;
    const expected = Math.floor((price("growth") * 3 * remaining) / periodDays);
    const list = await invoices(t);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      amountCents: expected,
      periodStart: stamp("2026-05-02T10:00:00.000Z"),
      periodEnd: stamp("2026-06-01T10:00:00.000Z"),
    });
    expect(issued).toHaveLength(1);
    expect(await subscription(t)).toMatchObject({ seats: 5, currentPeriodEnd: stamp("2026-06-01T10:00:00.000Z") });
    expect(await invoiceAlerts(t, "owner")).toHaveLength(1);
  });

  it("charges nothing for removed seats, on the free plan, or during a trial", async () => {
    const paid = await createTenant("seats-down");
    await paidActive(paid, { seats: 5 });
    at("2026-05-10T10:00:00.000Z");
    await billingService.updateSeats(paid.actors.owner, { orgId: paid.org.id, seats: 2 });
    expect(await invoices(paid)).toHaveLength(0);

    const free = await createTenant("seats-free", "free");
    await setSubscription(free.org.id, { plan: "free", status: "active", currentPeriodStart: "2026-05-01T10:00:00.000Z", currentPeriodEnd: "2026-06-01T10:00:00.000Z" });
    await billingService.updateSeats(free.actors.owner, { orgId: free.org.id, seats: 3 });
    expect(await invoices(free)).toHaveLength(0);

    const trial = await createTenant("seats-trial");
    await setSubscription(trial.org.id, { status: "trialing", currentPeriodStart: "2026-05-01T10:00:00.000Z", currentPeriodEnd: "2026-05-15T10:00:00.000Z" });
    await billingService.updateSeats(trial.actors.owner, { orgId: trial.org.id, seats: 4 });
    expect(await invoices(trial)).toHaveLength(0);
  });

  it("charges the price difference for an upgrade between paid plans, nothing for a downgrade or no change", async () => {
    const t = await createTenant("plan-upgrade", "starter");
    await paidActive(t, { plan: "starter", seats: 4, start: "2026-05-02T10:00:00.000Z", end: "2026-06-01T10:00:00.000Z" });
    at("2026-05-22T10:00:00.000Z");

    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "growth", interval: "monthly" });

    const remaining = 10;
    const periodDays = 30;
    const expected = Math.floor(((price("growth") - price("starter")) * 4 * remaining) / periodDays);
    const list = await invoices(t);
    expect(list).toHaveLength(1);
    expect(list[0]?.amountCents).toBe(expected);
    expect(await subscription(t)).toMatchObject({
      plan: "growth",
      currentPeriodStart: stamp("2026-05-02T10:00:00.000Z"),
      currentPeriodEnd: stamp("2026-06-01T10:00:00.000Z"),
    });

    tick();
    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "growth", interval: "monthly" });
    expect(await invoices(t)).toHaveLength(1);

    tick();
    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "starter", interval: "monthly" });
    expect(await invoices(t)).toHaveLength(1);
  });

  it("starts a fresh, fully invoiced period when a workspace leaves the free plan", async () => {
    const t = await createTenant("plan-from-free", "free");
    await setSubscription(t.org.id, { plan: "free", status: "active", seats: 2, currentPeriodStart: "2026-05-20T10:00:00.000Z", currentPeriodEnd: "2026-06-20T10:00:00.000Z" });
    at("2026-06-02T10:00:00.000Z");

    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "growth", interval: "monthly" });

    expect(await subscription(t)).toMatchObject({
      plan: "growth",
      status: "active",
      currentPeriodStart: stamp("2026-06-02T10:00:00.000Z"),
      currentPeriodEnd: stamp("2026-07-02T10:00:00.000Z"),
    });
    const list = await invoices(t);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      amountCents: price("growth") * 2,
      periodStart: stamp("2026-06-02T10:00:00.000Z"),
      periodEnd: stamp("2026-07-02T10:00:00.000Z"),
    });
  });

  it("prorates an annual period against its twelve-month charge", async () => {
    const t = await createTenant("prorate-annual");
    await paidActive(t, { interval: "annual", seats: 1, start: "2026-01-01T10:00:00.000Z", end: "2027-01-01T10:00:00.000Z" });
    at("2026-07-01T10:00:00.000Z");

    await billingService.updateSeats(t.actors.owner, { orgId: t.org.id, seats: 2 });

    const expected = Math.floor((price("growth") * 12 * 1 * 184) / 365);
    expect((await invoices(t)).map((row) => row.amountCents)).toEqual([expected]);
  });

  it("charges nothing for choosing a plan during the trial and keeps the trial period", async () => {
    const t = await createTenant("plan-in-trial", "starter");
    await setSubscription(t.org.id, {
      plan: "starter",
      status: "trialing",
      currentPeriodStart: "2026-05-25T10:00:00.000Z",
      currentPeriodEnd: "2026-06-08T10:00:00.000Z",
    });

    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "growth", interval: "monthly" });

    expect(await invoices(t)).toHaveLength(0);
    expect(await subscription(t)).toMatchObject({
      plan: "growth",
      status: "active",
      currentPeriodEnd: stamp("2026-06-08T10:00:00.000Z"),
    });
  });

  it("charges nothing at the very end of a period", async () => {
    const t = await createTenant("prorate-end");
    await paidActive(t, { seats: 1, start: "2026-05-02T10:00:00.000Z", end: "2026-06-02T10:00:00.000Z" });

    await billingService.updateSeats(t.actors.owner, { orgId: t.org.id, seats: 4 });

    expect(await invoices(t)).toHaveLength(0);
    expect((await subscription(t)).seats).toBe(4);
  });

  it("applies the same rule to a seat change and a plan change in one period, and renews with the new seats", async () => {
    const t = await createTenant("both-changes", "starter");
    await paidActive(t, { plan: "starter", seats: 1, start: "2026-05-02T10:00:00.000Z", end: "2026-06-01T10:00:00.000Z" });
    at("2026-05-12T10:00:00.000Z");

    await billingService.updateSeats(t.actors.owner, { orgId: t.org.id, seats: 3 });
    tick();
    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "growth", interval: "monthly" });

    const list = [...(await invoices(t))].sort((a, b) => a.amountCents - b.amountCents);
    expect(list).toHaveLength(2);
    const seatsCharge = Math.floor((price("starter") * 2 * 20) / 30);
    const planCharge = Math.floor(((price("growth") - price("starter")) * 3 * 20) / 30);
    expect(list.map((row) => row.amountCents).sort((a, b) => a - b)).toEqual([seatsCharge, planCharge].sort((a, b) => a - b));

    at("2026-06-01T10:00:00.000Z");
    await runBillingRenewalJob(now());
    const renewal = (await invoices(t)).find((row) => row.periodStart === stamp("2026-06-01T10:00:00.000Z"));
    expect(renewal?.amountCents).toBe(price("growth") * 3);
  });

  it("numbers invoices uniquely within a workspace, lists them newest first, and only for the owner", async () => {
    const t = await createTenant("numbers");
    await paidActive(t, { start: "2026-03-01T10:00:00.000Z", end: "2026-04-01T10:00:00.000Z" });

    await runBillingRenewalJob(now());

    const list = await invoices(t);
    expect(list).toHaveLength(3);
    expect(new Set(list.map((row) => row.number)).size).toBe(3);
    expect(list.map((row) => row.periodStart)).toEqual([...list.map((row) => row.periodStart)].sort().reverse());
    await expect(billingService.listInvoices(t.actors.admin, t.org.id)).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});
