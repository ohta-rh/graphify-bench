/**
 * Hidden test for HFX7: detaching and re-attaching the event handlers (a dev
 * hot reload, a worker restart) must leave exactly one live copy of every
 * subscriber — no doubled webhooks, audit rows or usage deltas — while the
 * notification fan-out keeps working.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { emit, subscribe } from "@/lib/event-bus";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import { listNotifications } from "@/server/services/notification-service";
import * as webhookService from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IsoTimestamp, ProjectId } from "@/types/common";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let tenant: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("rewire", "growth");
  await usageRepo.recomputeUsage(tenant.org.id);
  await webhookService.createWebhook(tenant.actors.admin, {
    orgId: tenant.org.id,
    url: "https://hooks.example.test/taskflow",
    eventTypes: ["issue.created", "issue.status_changed"],
  });
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

/** Pending deliveries of one event type for one issue. */
async function deliveriesFor(eventType: string, issueId: string): Promise<number> {
  const pending = await webhookRepo.claimPendingDeliveries(500);
  return pending.filter(
    (row) =>
      row.orgId === tenant.org.id &&
      row.eventType === eventType &&
      row.payload.includes(issueId),
  ).length;
}

async function auditRows(issueId: string, action: string): Promise<number> {
  const rows = await activityRepo.listActivityForSubject(tenant.org.id, "issue", issueId);
  return rows.filter((row) => row.action === action).length;
}

async function assignedNotifications(issueId: string): Promise<number> {
  const page = await listNotifications(tenant.actors.member, {
    orgId: tenant.org.id,
    recipientId: tenant.userIds.member,
    unreadOnly: false,
    kind: ["issue_assigned"],
    limit: 100,
    cursor: null,
  });
  return page.items.filter((row) => row.href.includes(issueId)).length;
}

/** Creates an issue, moves it and assigns it to the member. */
async function exercise(title: string): Promise<Issue> {
  const issue = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title }),
  );
  await issueService.changeIssueStatus(tenant.actors.member, {
    orgId: tenant.org.id,
    issueId: issue.id,
    status: "in_progress",
  });
  await issueService.assignIssue(tenant.actors.admin, {
    orgId: tenant.org.id,
    issueId: issue.id,
    assigneeId: tenant.userIds.member,
  });
  return issue;
}

describe("the event bus", () => {
  it("detaches exactly the handler whose unsubscribe was called", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const third = vi.fn();
    const offFirst = subscribe("project.restored", first);
    const offSecond = subscribe("project.restored", second);
    const offThird = subscribe("project.restored", third);

    offFirst();
    offThird();

    await emit("project.restored", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: "2026-03-01T09:00:00.000Z" as IsoTimestamp,
      projectId: "01HZZZPPPPPPPPPPPPPPPPPPPP" as ProjectId,
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(third).not.toHaveBeenCalled();
    offSecond();
  });
});

describe("re-wiring the event handlers", () => {
  it("delivers every reaction once after the handlers were detached and re-attached", async () => {
    registerEventHandlers();
    unregisterEventHandlers();
    registerEventHandlers();
    unregisterEventHandlers();
    registerEventHandlers();

    const before = await usageRepo.getUsage(tenant.org.id);
    const issue = await exercise("Rewired once");

    expect(await deliveriesFor("issue.created", issue.id)).toBe(1);
    expect(await deliveriesFor("issue.status_changed", issue.id)).toBe(1);

    expect(await auditRows(issue.id, "issue.created")).toBe(1);
    expect(await auditRows(issue.id, "issue.status_changed")).toBe(1);
    expect(await auditRows(issue.id, "issue.assigned")).toBe(1);

    const after = await usageRepo.getUsage(tenant.org.id);
    expect(after.issuesUsed).toBe(before.issuesUsed + 1);

    expect(await assignedNotifications(issue.id)).toBe(1);
  });

  it("stays idempotent when registration is repeated without a detach", async () => {
    registerEventHandlers();
    registerEventHandlers();

    const before = await usageRepo.getUsage(tenant.org.id);
    const issue = await exercise("Registered twice");

    expect(await deliveriesFor("issue.created", issue.id)).toBe(1);
    expect(await auditRows(issue.id, "issue.created")).toBe(1);
    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(
      before.issuesUsed + 1,
    );
    expect(await assignedNotifications(issue.id)).toBe(1);
  });

  it("records nothing while detached, but in-app notifications still flow", async () => {
    unregisterEventHandlers();

    const before = await usageRepo.getUsage(tenant.org.id);
    const issue = await exercise("While detached");

    expect(await deliveriesFor("issue.created", issue.id)).toBe(0);
    expect(await auditRows(issue.id, "issue.created")).toBe(0);
    expect(await auditRows(issue.id, "issue.assigned")).toBe(0);
    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(before.issuesUsed);

    expect(await assignedNotifications(issue.id)).toBe(1);

    registerEventHandlers();
    const again = await exercise("Attached again");
    expect(await deliveriesFor("issue.created", again.id)).toBe(1);
    expect(await auditRows(again.id, "issue.created")).toBe(1);
    expect(await assignedNotifications(again.id)).toBe(1);
  });
});
