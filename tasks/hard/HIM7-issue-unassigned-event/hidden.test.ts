/**
 * HIM7 — `issue.unassigned` is a first-class domain event.
 *
 * Both producers (explicit un-assignment and member removal) and all three
 * consumers (audit log, notifications, outgoing webhooks) are exercised with
 * the production listener set attached.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { webhookEventTypeSchema } from "@/schemas/webhook";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import * as activityService from "@/server/services/activity-service";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import * as notificationService from "@/server/services/notification-service";
import * as webhookService from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IssueId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
const detachers: Unsubscribe[] = [];

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
  tenant = await createTenant("him7", "growth");
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

async function newIssue(title: string, assigneeId: UserId | null) {
  return issueService.createIssue(
    tenant.actors.admin,
    issueInput(tenant.org.id, tenant.project.id, { title, assigneeId }),
  );
}

async function unassignedActivityFor(issueId: IssueId) {
  const page = await activityService.listActivity(tenant.actors.owner, {
    orgId: tenant.org.id,
    action: ["issue.unassigned"],
    limit: 100,
    cursor: null,
  });
  return page.items.filter((row) => row.subjectId === issueId);
}

async function unassignedNotificationsFor(recipientId: UserId) {
  const page = await notificationService.listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    kind: ["issue_unassigned"],
    limit: 100,
    cursor: null,
  });
  return page.items.filter((row) => row.kind === "issue_unassigned");
}

describe("producing issue.unassigned", () => {
  it("is published instead of issue.updated when an assignee is cleared", async () => {
    const issue = await newIssue("Clear me", tenant.userIds.admin);
    const unassigned = capture("issue.unassigned");
    const updated = capture("issue.updated");

    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: null,
    });

    expect(updated).toHaveLength(0);
    expect(unassigned).toHaveLength(1);
    expect(unassigned[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      issueId: issue.id,
      projectId: tenant.project.id,
      previousAssigneeId: tenant.userIds.admin,
    });
    expect(unassigned[0]?.occurredAt).toEqual(expect.any(String));
  });

  it("is not published for a reassignment or for clearing an already empty assignee", async () => {
    const reassigned = await newIssue("Hand over", tenant.userIds.admin);
    const empty = await newIssue("Nobody's", null);
    const unassigned = capture("issue.unassigned");
    const updated = capture("issue.updated");

    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: reassigned.id,
      assigneeId: tenant.userIds.viewer,
    });
    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: empty.id,
      assigneeId: null,
    });

    expect(unassigned).toHaveLength(0);
    expect(updated).toHaveLength(0);
  });

  it("is published for each live issue of a member who is removed", async () => {
    const leaver = await userRepo.insertUser({
      email: "leaver@him7.test",
      name: "Leaver",
      passwordHash: "seed",
    });
    const membership = await memberRepo.insertMember(tenant.org.id, leaver.id, "member", null);

    const first = await newIssue("Leaver one", leaver.id);
    const second = await newIssue("Leaver two", leaver.id);
    const shelved = await newIssue("Leaver archived", leaver.id);
    await issueService.archiveIssue(tenant.actors.admin, tenant.org.id, shelved.id);
    const someoneElse = await newIssue("Not the leaver", tenant.userIds.viewer);

    const unassigned = capture("issue.unassigned");

    await memberService.removeMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: membership.id,
    });

    expect(unassigned.map((event) => event.issueId).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    for (const event of unassigned) {
      expect(event).toMatchObject({
        orgId: tenant.org.id,
        actorId: tenant.userIds.owner,
        projectId: tenant.project.id,
        previousAssigneeId: leaver.id,
      });
    }

    expect((await issueRepo.findIssueById(tenant.org.id, first.id))?.assigneeId).toBeNull();
    expect((await issueRepo.findIssueById(tenant.org.id, second.id))?.assigneeId).toBeNull();
    expect((await issueRepo.findIssueById(tenant.org.id, shelved.id))?.assigneeId).toBe(leaver.id);
    expect((await issueRepo.findIssueById(tenant.org.id, someoneElse.id))?.assigneeId).toBe(
      tenant.userIds.viewer,
    );

    expect(await unassignedActivityFor(first.id)).toHaveLength(1);
    expect(await unassignedActivityFor(second.id)).toHaveLength(1);
    expect(await unassignedActivityFor(shelved.id)).toHaveLength(0);
  });
});

describe("consuming issue.unassigned", () => {
  it("records one audit row against the issue", async () => {
    const issue = await newIssue("Audit me", tenant.userIds.admin);

    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: null,
    });

    const rows = await unassignedActivityFor(issue.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: "issue.unassigned",
      actorId: tenant.userIds.member,
      subjectKind: "issue",
      subjectId: issue.id,
      projectId: tenant.project.id,
    });
  });

  it("notifies the previous assignee, but not an actor who unassigned themselves", async () => {
    const byOther = await newIssue("Taken away", tenant.userIds.admin);
    const bySelf = await newIssue("Dropped", tenant.userIds.admin);
    const before = (await unassignedNotificationsFor(tenant.userIds.admin)).length;

    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: byOther.id,
      assigneeId: null,
    });

    const afterOther = await unassignedNotificationsFor(tenant.userIds.admin);
    expect(afterOther).toHaveLength(before + 1);
    expect(afterOther.filter((row) => row.actorId === tenant.userIds.member).length).toBeGreaterThan(0);
    expect(afterOther.every((row) => row.recipientId === tenant.userIds.admin)).toBe(true);

    await issueService.assignIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: bySelf.id,
      assigneeId: null,
    });

    expect(await unassignedNotificationsFor(tenant.userIds.admin)).toHaveLength(before + 1);
  });

  it("is an event type webhook endpoints can subscribe to, and is delivered only to them", async () => {
    expect(webhookEventTypeSchema.safeParse("issue.unassigned").success).toBe(true);

    const wanted = await webhookService.createWebhook(tenant.actors.admin, {
      orgId: tenant.org.id,
      url: "https://hooks.example.com/unassigned",
      eventTypes: ["issue.unassigned"],
    });
    const other = await webhookService.createWebhook(tenant.actors.admin, {
      orgId: tenant.org.id,
      url: "https://hooks.example.com/created",
      eventTypes: ["issue.created"],
    });

    const issue = await newIssue("Ship to hooks", tenant.userIds.viewer);
    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: null,
    });

    const deliveries = (await webhookRepo.claimPendingDeliveries(1_000)).filter(
      (row) =>
        row.orgId === tenant.org.id &&
        (JSON.parse(row.payload) as { issueId?: string }).issueId === issue.id,
    );

    const toWanted = deliveries.filter((row) => row.endpointId === wanted.id);
    expect(toWanted).toHaveLength(1);
    expect(toWanted[0]?.eventType).toBe("issue.unassigned");
    expect(JSON.parse(toWanted[0]?.payload ?? "{}")).toMatchObject({
      issueId: issue.id,
      projectId: tenant.project.id,
      previousAssigneeId: tenant.userIds.viewer,
    });

    const toOther = deliveries.filter((row) => row.endpointId === other.id);
    expect(toOther.map((row) => row.eventType)).toEqual(["issue.created"]);
  });
});
