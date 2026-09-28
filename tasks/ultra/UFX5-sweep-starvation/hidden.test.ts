/**
 * Hidden test for UFX5-sweep-starvation: the background sweeps (overdue alerts,
 * daily digests, retention cleanup) visit every live workspace on every run,
 * while the usage recount stays incremental and fair.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { runCleanupArchivedJob } from "@/server/jobs/cleanup-archived-job";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as emailService from "@/server/services/email-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { OrgId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

function at(iso: string): void {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** A tenant the way sign-up leaves it: with its usage counters materialised. */
async function workspace(slug: string): Promise<Tenant> {
  const tenant = await createTenant(slug, "growth");
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function insertIssue(tenant: Tenant, title: string, dueAt: string | null = null) {
  const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
  return issueRepo.insertIssue(
    issueInput(tenant.org.id, tenant.project.id, {
      title,
      dueAt,
      assigneeId: tenant.userIds.member,
    }),
    tenant.userIds.owner,
    number,
  );
}

function collectOverdue(): { orgId: OrgId; issueId: string }[] {
  const seen: { orgId: OrgId; issueId: string }[] = [];
  detachers.push(
    subscribe("issue.overdue", (payload) => {
      seen.push({ orgId: payload.orgId, issueId: payload.issueId });
    }),
  );
  return seen;
}

// The recount tests run first, while their thirty workspaces are the only
// ones in the database.
describe("UFX5 usage recount stays incremental and fair", () => {
  const tenants: Tenant[] = [];

  it("recounts the 25 least recently recounted workspaces, however busy the others are", async () => {
    for (let i = 0; i < 30; i += 1) {
      at(`2026-02-01T08:${String(i).padStart(2, "0")}:00.000Z`);
      const tenant = await createTenant(`ufx5-rollup-${i}`, "growth");
      await usageRepo.recomputeUsage(tenant.org.id);
      tenants.push(tenant);
    }

    // Later, every workspace records writes whose deltas drift from the truth,
    // in an order unrelated to when each was last recounted.
    const writeOrder = [
      ...tenants.slice(0, 12),
      ...tenants.slice(25),
      ...tenants.slice(12, 25),
    ];
    for (const [n, tenant] of writeOrder.entries()) {
      at(`2026-02-02T09:${String(n).padStart(2, "0")}:00.000Z`);
      await usageRepo.incrementUsage(tenant.org.id, { issuesUsed: 7 });
    }

    at("2026-02-02T10:00:00.000Z");
    const result = await runUsageRollupJob(new Date("2026-02-02T10:00:00.000Z"));
    expect(result.processed).toBe(25);

    const corrected: number[] = [];
    for (const [i, tenant] of tenants.entries()) {
      if ((await usageRepo.getUsage(tenant.org.id)).issuesUsed === 0) corrected.push(i);
    }
    expect(corrected).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });

  it("moves a recounted workspace to the back of the queue", async () => {
    at("2026-02-02T11:00:00.000Z");
    const result = await runUsageRollupJob(new Date("2026-02-02T11:00:00.000Z"));
    expect(result.processed).toBe(25);

    for (const tenant of tenants) {
      expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(0);
    }
  });

  it("a write alone never lets a workspace skip its turn", async () => {
    // Recount everything once more, one workspace per minute, 0 first.
    for (const [i, tenant] of tenants.entries()) {
      at(`2026-02-03T08:${String(i).padStart(2, "0")}:00.000Z`);
      await usageRepo.recomputeUsage(tenant.org.id);
    }
    // The five least recently recounted workspaces then get busy.
    at("2026-02-03T12:00:00.000Z");
    for (const tenant of tenants.slice(0, 5)) {
      await usageRepo.incrementUsage(tenant.org.id, { projectsUsed: 3 });
    }

    at("2026-02-03T13:00:00.000Z");
    const result = await runUsageRollupJob(new Date("2026-02-03T13:00:00.000Z"));
    expect(result.processed).toBe(25);

    for (const tenant of tenants.slice(0, 5)) {
      expect((await usageRepo.getUsage(tenant.org.id)).projectsUsed).toBe(1);
    }
  });
});

describe("UFX5 overdue alerts reach every workspace", () => {
  it("announces the overdue issues of every workspace in a single run", async () => {
    const tenants: Tenant[] = [];
    const expected = new Map<string, OrgId>();
    for (let i = 0; i < 55; i += 1) {
      const tenant = await workspace(`ufx5-overdue-${i}`);
      const issue = await insertIssue(tenant, `Late ${i}`, "2026-03-01T00:00:00.000Z");
      expected.set(issue.id, tenant.org.id);
      tenants.push(tenant);
    }
    // Busy workspaces keep writing right up to the sweep.
    for (const tenant of tenants.slice(40)) {
      await insertIssue(tenant, "Fresh work");
      await usageRepo.incrementUsage(tenant.org.id, { issuesUsed: 1 });
    }

    const seen = collectOverdue();
    await runOverdueIssueJob(new Date("2026-03-02T00:00:00.000Z"));

    const mine = seen.filter((event) => expected.has(event.issueId));
    expect(mine).toHaveLength(55);
    for (const event of mine) {
      expect(event.orgId).toBe(expected.get(event.issueId));
    }
  });

  it("still announces each overdue issue only once across runs", async () => {
    const tenant = await workspace("ufx5-overdue-once");
    const issue = await insertIssue(tenant, "Late once", "2026-03-01T00:00:00.000Z");

    const seen = collectOverdue();
    await runOverdueIssueJob(new Date("2026-03-02T00:00:00.000Z"));
    await runOverdueIssueJob(new Date("2026-03-02T01:00:00.000Z"));

    expect(seen.filter((event) => event.issueId === issue.id)).toHaveLength(1);
  });

  it("never alerts about a deleted workspace", async () => {
    const tenant = await workspace("ufx5-overdue-deleted");
    const issue = await insertIssue(tenant, "Late in a deleted workspace", "2026-03-01T00:00:00.000Z");
    await orgRepo.archiveOrg(tenant.org.id);

    const seen = collectOverdue();
    await runOverdueIssueJob(new Date("2026-03-03T00:00:00.000Z"));

    expect(seen.filter((event) => event.issueId === issue.id)).toHaveLength(0);
  });
});

describe("UFX5 daily digests reach every workspace", () => {
  it("sends every subscribed member of every workspace their digest in one run", async () => {
    const recipients = new Set<string>();
    for (let i = 0; i < 55; i += 1) {
      const tenant = await workspace(`ufx5-digest-${i}`);
      await orgRepo.updateOrg(tenant.org.id, {
        orgId: tenant.org.id,
        settings: { digestHourUtc: 13 },
      });
      await preferenceRepo.upsertPreference({
        orgId: tenant.org.id,
        userId: tenant.userIds.member,
        kind: "comment_created",
        inApp: false,
        email: false,
        digestOnly: true,
      });
      at("2026-04-01T12:00:00.000Z");
      await notificationRepo.insertNotification(tenant.org.id, {
        orgId: tenant.org.id,
        recipientId: tenant.userIds.member,
        kind: "comment_created",
        title: `Update ${i}`,
        body: `Update ${i}`,
        href: "/issues/1",
        actorId: null,
        channels: ["email"],
      });
      vi.useRealTimers();
      recipients.add(`member@ufx5-digest-${i}.test`);
    }

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-04-01T13:05:00.000Z"));

    const sentTo = sendSpy.mock.calls
      .map((call) => call[0].to)
      .filter((to) => recipients.has(to));
    expect(new Set(sentTo).size).toBe(55);
    expect(sentTo).toHaveLength(55);
  });

  it("does not send a second digest in a later run inside the same hour", async () => {
    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-04-01T13:35:00.000Z"));

    const repeated = sendSpy.mock.calls.filter((call) =>
      call[0].to.startsWith("member@ufx5-digest-"),
    );
    expect(repeated).toHaveLength(0);
  });
});

describe("UFX5 retention cleanup reaches every workspace", () => {
  it("drops expired search entries in every workspace in one run", async () => {
    const tenants: Tenant[] = [];
    for (let i = 0; i < 30; i += 1) {
      const tenant = await workspace(`ufx5-cleanup-${i}`);
      const issue = await insertIssue(tenant, `Old ${i}`);
      await searchRepo.upsertSearchDocument(tenant.org.id, "issue", issue.id, `Old ${i}`, tenant.project.id);
      at("2024-01-01T00:00:00.000Z");
      await issueRepo.archiveIssue(tenant.org.id, issue.id);
      vi.useRealTimers();
      tenants.push(tenant);
    }

    await runCleanupArchivedJob(new Date("2026-05-01T00:00:00.000Z"));

    const leftovers: string[] = [];
    for (const tenant of tenants) {
      if ((await searchRepo.countIndexed(tenant.org.id)) !== 0) leftovers.push(tenant.org.slug);
    }
    expect(leftovers).toEqual([]);
  });
});
