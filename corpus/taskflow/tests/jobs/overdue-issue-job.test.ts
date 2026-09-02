/**
 * Emits `issue.overdue` exactly once per overdue issue.
 *
 * Owner C implements `@/server/jobs/overdue-issue-job`. `isOverdue()` itself is
 * covered by `tests/lib/date.test.ts`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

const PAST = "2026-01-01T00:00:00.000Z";
const FUTURE = "2026-12-31T00:00:00.000Z";
const NOW = new Date("2026-06-01T07:00:00.000Z");

async function makeTenant(slug: string): Promise<Tenant> {
  const tenant = await createTenant(slug);
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function insertIssue(
  tenant: Tenant,
  overrides: Partial<{ title: string; assigneeId: (typeof tenant.userIds)["member"] | null; dueAt: string | null }>,
) {
  const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
  return issueRepo.insertIssue(
    issueInput(tenant.org.id, tenant.project.id, overrides),
    tenant.userIds.owner,
    number,
  );
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  cleanup();
});

describe("jobs/overdue-issue-job", () => {
  it("selects only issues whose due date has passed", async () => {
    const tenant = await makeTenant("overdue-select");
    const overdue = await insertIssue(tenant, { title: "Late", dueAt: PAST });
    await insertIssue(tenant, { title: "Not yet", dueAt: FUTURE });

    const seen: string[] = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push(payload.issueId);
      }),
    );

    await runOverdueIssueJob(NOW);

    expect(seen).toEqual([overdue.id]);
  });

  it("ignores issues in a closed status", async () => {
    const tenant = await makeTenant("overdue-closed");
    const issue = await insertIssue(tenant, { title: "Closed but late", dueAt: PAST });
    await issueRepo.setIssueStatus(tenant.org.id, issue.id, "done");

    const seen: string[] = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push(payload.issueId);
      }),
    );

    await runOverdueIssueJob(NOW);

    expect(seen).not.toContain(issue.id);
  });

  it("ignores issues without a due date", async () => {
    const tenant = await makeTenant("overdue-no-due");
    const issue = await insertIssue(tenant, { title: "No due date", dueAt: null });

    const seen: string[] = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push(payload.issueId);
      }),
    );

    await runOverdueIssueJob(NOW);

    expect(seen).not.toContain(issue.id);
  });

  it("emits issue.overdue once per overdue issue", async () => {
    const tenant = await makeTenant("overdue-payload");
    const issue = await insertIssue(tenant, {
      title: "Assigned and late",
      dueAt: PAST,
      assigneeId: tenant.userIds.member,
    });

    const seen: Array<{ issueId: string; dueAt: string; assigneeId: string | null }> = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push({
          issueId: payload.issueId,
          dueAt: payload.dueAt,
          assigneeId: payload.assigneeId,
        });
      }),
    );

    const result = await runOverdueIssueJob(NOW);

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      issueId: issue.id,
      dueAt: toIsoTimestamp(new Date(PAST)),
      assigneeId: tenant.userIds.member,
    });
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("does not re-emit for an issue already reported", async () => {
    const tenant = await makeTenant("overdue-dedupe");
    const issue = await insertIssue(tenant, { title: "Still late", dueAt: PAST });

    const seen: string[] = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push(payload.issueId);
      }),
    );

    await runOverdueIssueJob(NOW);
    await runOverdueIssueJob(new Date(NOW.getTime() + 60_000));

    expect(seen).toEqual([issue.id]);
  });

  it("keeps each organization's issues in its own batch", async () => {
    const north = await makeTenant("overdue-north");
    const acme = await makeTenant("overdue-acme");
    const northIssue = await insertIssue(north, { title: "North late", dueAt: PAST });
    const acmeIssue = await insertIssue(acme, { title: "Acme late", dueAt: PAST });

    const seen: Array<{ orgId: string; issueId: string }> = [];
    detachers.push(
      subscribe("issue.overdue", (payload) => {
        seen.push({ orgId: payload.orgId, issueId: payload.issueId });
      }),
    );

    await runOverdueIssueJob(NOW);

    expect(seen).toContainEqual({ orgId: north.org.id, issueId: northIssue.id });
    expect(seen).toContainEqual({ orgId: acme.org.id, issueId: acmeIssue.id });
    for (const entry of seen) {
      if (entry.issueId === northIssue.id) expect(entry.orgId).toBe(north.org.id);
      if (entry.issueId === acmeIssue.id) expect(entry.orgId).toBe(acme.org.id);
    }
  });
});
