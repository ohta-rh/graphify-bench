/**
 * Domain events published by the service layer.
 *
 * Services stay decoupled from notifications, search, the audit log and
 * webhooks by announcing facts on the bus. If an event stops firing — or fires
 * with the wrong payload — every one of those concerns silently stops working,
 * which is why the contract is pinned here rather than through its consumers.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("./_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);
vi.mock("@/lib/mentions", async () => (await import("./_support/doubles/misc")).mentionsModule);

import { subscribe } from "@/lib/event-bus";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
const detachers: Unsubscribe[] = [];

/** Collects every payload delivered for one event type during a test. */
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
  tenant = await createTenant("events");
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  cleanup();
});

describe("issue.created", () => {
  it("is emitted once per created issue, carrying the actor and the issue", async () => {
    const seen = capture("issue.created");

    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Emit me",
        assigneeId: tenant.userIds.admin,
      }),
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      issueId: issue.id,
      projectId: tenant.project.id,
      title: "Emit me",
      assigneeId: tenant.userIds.admin,
      priority: "none",
    });
    expect(seen[0]?.occurredAt).toEqual(expect.any(String));
  });

  it("is not emitted when the create is rejected", async () => {
    const seen = capture("issue.created");

    await expect(
      issueService.createIssue(
        tenant.actors.viewer,
        issueInput(tenant.org.id, tenant.project.id),
      ),
    ).rejects.toThrow();

    expect(seen).toHaveLength(0);
  });
});

describe("issue.status_changed", () => {
  it("carries both ends of the transition", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Move me" }),
    );

    const seen = capture("issue.status_changed");
    await issueService.changeIssueStatus(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      status: "in_progress",
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ from: "backlog", to: "in_progress" });
  });

  it("stays silent when the status did not actually move", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "No-op move" }),
    );

    const seen = capture("issue.status_changed");
    await issueService.changeIssueStatus(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      status: "backlog",
    });

    expect(seen).toHaveLength(0);
  });
});

describe("issue.assigned", () => {
  it("reports the previous assignee alongside the new one", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Reassign me",
        assigneeId: tenant.userIds.member,
      }),
    );

    const seen = capture("issue.assigned");
    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: tenant.userIds.admin,
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      previousAssigneeId: tenant.userIds.member,
      assigneeId: tenant.userIds.admin,
    });
  });

  it("falls back to issue.updated when the issue is un-assigned", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Unassign me",
        assigneeId: tenant.userIds.admin,
      }),
    );

    const assigned = capture("issue.assigned");
    const updated = capture("issue.updated");

    await issueService.assignIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: null,
    });

    expect(assigned).toHaveLength(0);
    expect(updated).toHaveLength(1);
    expect(updated[0]?.changedFields).toEqual(["assigneeId"]);
  });
});

describe("comment.created", () => {
  it("carries the mentions resolved server-side", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Discuss me" }),
    );

    const seen = capture("comment.created");
    await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Taking a look, @owner",
      parentId: null,
      mentionedUserIds: [],
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.mentionedUserIds).toEqual([tenant.userIds.owner]);
  });
});

describe("project.archived", () => {
  it("reports how many issues the cascade took with it", async () => {
    const project = await projectService.createProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      name: "Cascade",
      slug: "cascade",
      key: "CAS",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, project.id, { title: "Goes with it" }),
    );

    const seen = capture("project.archived");
    await projectService.archiveProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      projectId: project.id,
      archiveIssues: true,
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]?.issuesArchived).toBe(1);
  });
});
