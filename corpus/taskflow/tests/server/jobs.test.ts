/**
 * The background job layer: the in-process queue, the scheduler's cadence and
 * the two jobs whose behaviour other layers depend on — the overdue scan that
 * feeds the notification fan-out, and the trial expiry that moves plans.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import {
  drain,
  enqueue,
  isSchedulerRunning,
  pendingCount,
  resetQueue,
  startScheduler,
  stopScheduler,
} from "@/server/jobs";
import { backoffMs } from "@/server/jobs/webhook-delivery-job";
import { shouldRunForOrg } from "@/server/jobs/digest-email-job";
import { runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as issueService from "@/server/services/issue-service";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, issueInput, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
const detachers: Unsubscribe[] = [];

const PAST = "2026-01-01T00:00:00.000Z";
const NOW = new Date("2026-06-01T07:00:00.000Z");

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("jobs");
  await usageRepo.recomputeUsage(tenant.org.id);
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  resetQueue();
  stopScheduler();
});

afterAll(() => {
  cleanup();
});

describe("the in-process queue", () => {
  it("is idempotent on the job id", () => {
    const job = {
      id: "usage-rollup:1",
      kind: "usage-rollup" as const,
      runAt: toIsoTimestamp(NOW),
      attempts: 0,
      payload: {},
    };

    enqueue(job);
    enqueue(job);

    expect(pendingCount()).toBe(1);
  });

  it("leaves jobs scheduled in the future alone", async () => {
    enqueue({
      id: "usage-rollup:future",
      kind: "usage-rollup",
      runAt: toIsoTimestamp(new Date(Date.now() + 3_600_000)),
      attempts: 0,
      payload: {},
    });

    await expect(drain()).resolves.toBe(0);
    expect(pendingCount()).toBe(1);
  });

  it("runs a due job and removes it", async () => {
    enqueue({
      id: "usage-rollup:due",
      kind: "usage-rollup",
      runAt: toIsoTimestamp(new Date(Date.now() - 1_000)),
      attempts: 0,
      payload: {},
    });

    await expect(drain()).resolves.toBe(1);
    expect(pendingCount()).toBe(0);
  });
});

describe("the scheduler", () => {
  it("reports whether it is running and stops cleanly", () => {
    expect(isSchedulerRunning()).toBe(false);
    startScheduler();
    expect(isSchedulerRunning()).toBe(true);
    stopScheduler();
    expect(isSchedulerRunning()).toBe(false);
  });
});

describe("the overdue scan", () => {
  it("emits issue.overdue for a past-due open issue, once", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late already",
        assigneeId: tenant.userIds.member,
        dueAt: PAST,
      }),
    );

    const seen: string[] = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push(payload.issueId);
      }),
    );

    const result = await runOverdueIssueJob(NOW);

    expect(seen).toEqual([issue.id]);
    expect(result.kind).toBe("overdue-issues");
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("ignores an overdue issue once it is archived", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late but archived",
        dueAt: PAST,
      }),
    );
    await issueService.archiveIssue(
      tenant.actors.member,
      tenant.org.id,
      issue.id,
    );

    const overdue = await issueRepo.listOverdueIssues(
      tenant.org.id,
      toIsoTimestamp(NOW),
    );

    expect(overdue.map((row) => row.id)).not.toContain(issue.id);
  });

  it("ignores an overdue issue once it is closed", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late but done",
        dueAt: PAST,
      }),
    );
    await issueService.changeIssueStatus(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      status: "done",
    });

    const overdue = await issueRepo.listOverdueIssues(
      tenant.org.id,
      toIsoTimestamp(NOW),
    );

    expect(overdue.map((row) => row.id)).not.toContain(issue.id);
  });
});

describe("the usage rollup", () => {
  it("recounts the tenant's live rows", async () => {
    const result = await runUsageRollupJob(NOW);
    expect(result.processed).toBeGreaterThan(0);

    const usage = await usageRepo.getUsage(tenant.org.id);
    const live = await issueRepo.listIssues({
      orgId: tenant.org.id,
      limit: 100,
      cursor: null,
    });

    expect(usage.issuesUsed).toBe(live.total);
    expect(usage.seatsUsed).toBe(4);
  });
});

describe("pure job helpers", () => {
  it("backs delivery attempts off exponentially, with a ceiling", () => {
    expect(backoffMs(0)).toBe(0);
    expect(backoffMs(1)).toBe(1_000);
    expect(backoffMs(2)).toBe(2_000);
    expect(backoffMs(3)).toBe(4_000);
    expect(backoffMs(30)).toBe(300_000);
  });

  it("runs the digest only during the org's configured UTC hour", () => {
    const org = {
      ...tenant.org,
      settings: { ...tenant.org.settings, digestHourUtc: 7 },
    };

    expect(shouldRunForOrg(org, NOW)).toBe(true);
    expect(
      shouldRunForOrg(org, new Date("2026-06-01T08:00:00.000Z")),
    ).toBe(false);
    expect(
      shouldRunForOrg({ ...org, archivedAt: toIsoTimestamp(NOW) }, NOW),
    ).toBe(false);
  });
});
