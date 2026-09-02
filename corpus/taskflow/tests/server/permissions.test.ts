/**
 * Authorization at the service boundary.
 *
 * `can()` is unit-tested against the role matrix elsewhere; what matters here
 * is that every mutating service actually consults it. A Viewer is the sharp
 * case: they may read everything in their organization and change nothing.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("./_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);
vi.mock("@/lib/hash", async () => (await import("./_support/doubles/misc")).hashModule);
vi.mock("@/lib/rate-limit", async () => (await import("./_support/doubles/misc")).rateLimitModule);
vi.mock("@/lib/mentions", async () => (await import("./_support/doubles/misc")).mentionsModule);

import { PermissionDeniedError } from "@/lib/permissions";
import * as commentService from "@/server/services/comment-service";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let tenant: Tenant;
let issue: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("permissions");

  issue = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title: "Owned by member" }),
  );
});

afterAll(() => {
  cleanup();
});

describe("a Viewer", () => {
  it("may read an issue", async () => {
    const found = await issueService.getIssue(
      tenant.actors.viewer,
      tenant.org.id,
      issue.id,
    );
    expect(found.issue.id).toBe(issue.id);
  });

  it("may not create an issue", async () => {
    await expect(
      issueService.createIssue(
        tenant.actors.viewer,
        issueInput(tenant.org.id, tenant.project.id),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("may not change an issue they do not own", async () => {
    await expect(
      issueService.changeIssueStatus(tenant.actors.viewer, {
        orgId: tenant.org.id,
        issueId: issue.id,
        status: "done",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("may not comment", async () => {
    await expect(
      commentService.createComment(tenant.actors.viewer, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "Can I say this?",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("may not create a project", async () => {
    await expect(
      projectService.createProject(tenant.actors.viewer, {
        orgId: tenant.org.id,
        name: "Viewer project",
        slug: "viewer-project",
        key: "VP",
        description: null,
        visibility: "org",
        leadId: null,
        color: "#6366f1",
        targetDate: null,
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("may not invite anyone", async () => {
    await expect(
      invitationService.inviteMember(tenant.actors.viewer, {
        orgId: tenant.org.id,
        email: "newcomer@example.test",
        role: "member",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});

describe("ownership escalation", () => {
  it("lets an assignee update an issue their role alone would not allow", async () => {
    const assigned = await issueService.assignIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      assigneeId: tenant.userIds.viewer,
    });
    expect(assigned.assigneeId).toBe(tenant.userIds.viewer);

    const moved = await issueService.changeIssueStatus(tenant.actors.viewer, {
      orgId: tenant.org.id,
      issueId: issue.id,
      status: "in_progress",
    });
    expect(moved.status).toBe("in_progress");
  });
});

describe("role hierarchy", () => {
  it("stops an admin from granting a role above their own", async () => {
    const members = await memberService.listMembers(tenant.actors.admin, {
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });
    const target = members.items.find((row) => row.role === "member");
    expect(target).toBeDefined();

    await expect(
      memberService.updateMemberRole(tenant.actors.admin, {
        orgId: tenant.org.id,
        memberId: target!.id,
        role: "owner",
      }),
    ).rejects.toThrow(/cannot grant/i);
  });

  it("refuses to demote the last owner", async () => {
    const members = await memberService.listMembers(tenant.actors.owner, {
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });
    const owner = members.items.find((row) => row.role === "owner");
    expect(owner).toBeDefined();

    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: owner!.id,
        role: "admin",
      }),
    ).rejects.toThrow(/at least one owner/i);
  });
});
