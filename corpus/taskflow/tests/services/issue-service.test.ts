/**
 * Issue creation authorization, quota refusal and emitted events.
 *
 * Owner C implements `@/server/services/issue-service`; the integration pass
 * fills these in once it exists. Fixtures: `tests/helpers/factories.ts`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as issueService from "@/server/services/issue-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";

let cleanup: () => void;
let tenant: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("issuesvc");
});

afterAll(() => {
  cleanup();
});

describe("services/issue-service", () => {
  it("refuses issue creation to an actor without issue:create", async () => {
    await expect(
      issueService.createIssue(
        tenant.actors.viewer,
        issueInput(tenant.org.id, tenant.project.id, { title: "Viewer can't do this" }),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("refuses creation when the project is at its plan issue quota", async () => {
    const quotaTenant = await createTenant("issuequota", "free");

    // The free plan allows 100 issues per project; seed that many directly
    // through the repository so the service boundary is the only thing under
    // test here.
    for (let number = 1; number <= 100; number += 1) {
      await issueRepo.insertIssue(
        issueInput(quotaTenant.org.id, quotaTenant.project.id, {
          title: `Seed issue ${number}`,
        }),
        quotaTenant.actors.member.userId,
        number,
      );
    }

    await expect(
      issueService.createIssue(
        quotaTenant.actors.member,
        issueInput(quotaTenant.org.id, quotaTenant.project.id, {
          title: "One too many",
        }),
      ),
    ).rejects.toThrow(/allows no more issues/);
  });

  it("emits issue.created with the persisted issue's fields", async () => {
    const received: unknown[] = [];
    const off = subscribe("issue.created", (payload) => {
      received.push(payload);
    });

    try {
      const issue = await issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, { title: "Ship the launch" }),
      );

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        issueId: issue.id,
        projectId: issue.projectId,
        title: issue.title,
        priority: issue.priority,
      });
    } finally {
      off();
    }
  });

  it("emits issue.status_changed with the previous and new status", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Status change target" }),
    );

    const received: unknown[] = [];
    const off = subscribe("issue.status_changed", (payload) => {
      received.push(payload);
    });

    try {
      await issueService.changeIssueStatus(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        status: "in_progress",
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        issueId: issue.id,
        from: "backlog",
        to: "in_progress",
      });
    } finally {
      off();
    }
  });

  it("emits issue.assigned with the previous and new assignee", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Assignment target" }),
    );

    const received: unknown[] = [];
    const off = subscribe("issue.assigned", (payload) => {
      received.push(payload);
    });

    try {
      await issueService.assignIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        assigneeId: tenant.userIds.member,
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        issueId: issue.id,
        previousAssigneeId: null,
        assigneeId: tenant.userIds.member,
      });
    } finally {
      off();
    }
  });

  it("archives rather than deletes, emitting issue.archived", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Archive target" }),
    );

    const received: unknown[] = [];
    const off = subscribe("issue.archived", (payload) => {
      received.push(payload);
    });

    try {
      const archived = await issueService.archiveIssue(
        tenant.actors.member,
        tenant.org.id,
        issue.id,
      );

      expect(archived.archivedAt).not.toBeNull();

      // Still reachable by id: archiving patches the row rather than deleting it.
      const stillThere = await issueRepo.findIssueById(tenant.org.id, issue.id);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.archivedAt).not.toBeNull();

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ issueId: issue.id, projectId: issue.projectId });
    } finally {
      off();
    }
  });
});
