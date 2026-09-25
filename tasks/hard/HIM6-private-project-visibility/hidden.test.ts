/**
 * HIM6 — private projects are invisible to org members who are not on them.
 *
 * Exercised through the project, issue and comment services: single reads and
 * writes answer NotFoundError, listings silently drop the project and its
 * issues (rows and totals alike).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import * as projectMemberRepo from "@/server/repositories/project-member-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import { NotFoundError } from "@/server/services/_support";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";

let cleanup: () => void;
let tenant: Tenant;
/** Private, no lead; the viewer is an explicit project member. */
let secret: Project;
/** Private, led by the `member` user; nobody added explicitly. */
let ledByMember: Project;
/** An `org` project with no lead, as a control. */
let open: Project;
let secretIssue: Issue;
let openIssue: Issue;

function projectInput(
  name: string,
  slug: string,
  key: string,
  visibility: Project["visibility"],
  leadId: Project["leadId"],
) {
  return {
    orgId: tenant.org.id,
    name,
    slug,
    key,
    description: null,
    visibility,
    leadId,
    color: "#6366f1",
    targetDate: null,
  };
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("him6", "growth");

  secret = await projectRepo.insertProject(
    projectInput("Secret", "secret", "SEC", "private", null),
  );
  ledByMember = await projectRepo.insertProject(
    projectInput("Led", "led", "LED", "private", tenant.userIds.member),
  );
  open = await projectRepo.insertProject(
    projectInput("Open", "open", "OPN", "org", null),
  );
  await projectMemberRepo.addProjectMember(
    tenant.org.id,
    secret.id,
    tenant.userIds.viewer,
  );

  secretIssue = await issueService.createIssue(
    tenant.actors.admin,
    issueInput(tenant.org.id, secret.id, { title: "Hidden work" }),
  );
  openIssue = await issueService.createIssue(
    tenant.actors.admin,
    issueInput(tenant.org.id, open.id, { title: "Visible work" }),
  );
});

afterAll(() => {
  cleanup();
});

async function listedProjectIds(actor: Actor) {
  const page = await projectService.listProjects(actor, {
    orgId: tenant.org.id,
    limit: 50,
    cursor: null,
  });
  return { ids: page.items.map((row) => row.project.id).sort(), total: page.total };
}

async function listedIssueIds(actor: Actor) {
  const page = await issueService.listIssues(actor, {
    orgId: tenant.org.id,
    limit: 50,
    cursor: null,
  });
  return { ids: page.items.map((row) => row.id).sort(), total: page.total };
}

describe("canViewProject", () => {
  it("applies the lead / project-member / admin rule to private projects only", async () => {
    await expect(projectService.canViewProject(tenant.actors.member, secret)).resolves.toBe(false);
    await expect(projectService.canViewProject(tenant.actors.viewer, secret)).resolves.toBe(true);
    await expect(projectService.canViewProject(tenant.actors.admin, secret)).resolves.toBe(true);
    await expect(projectService.canViewProject(tenant.actors.owner, secret)).resolves.toBe(true);
    await expect(projectService.canViewProject(tenant.actors.member, ledByMember)).resolves.toBe(true);
    await expect(projectService.canViewProject(tenant.actors.viewer, ledByMember)).resolves.toBe(false);
    await expect(projectService.canViewProject(tenant.actors.viewer, open)).resolves.toBe(true);
  });
});

describe("project reads", () => {
  it("answers NotFoundError for a private project the actor is not on", async () => {
    await expect(
      projectService.getProject(tenant.actors.member, tenant.org.id, "secret"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      projectService.getProject(tenant.actors.viewer, tenant.org.id, "led"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("serves the project to its lead, its members and admins", async () => {
    await expect(
      projectService.getProject(tenant.actors.viewer, tenant.org.id, "secret"),
    ).resolves.toMatchObject({ project: { id: secret.id } });
    await expect(
      projectService.getProject(tenant.actors.member, tenant.org.id, "led"),
    ).resolves.toMatchObject({ project: { id: ledByMember.id } });
    await expect(
      projectService.getProject(tenant.actors.admin, tenant.org.id, "led"),
    ).resolves.toMatchObject({ project: { id: ledByMember.id } });
  });

  it("drops hidden projects from the listing, total included", async () => {
    const forMember = await listedProjectIds(tenant.actors.member);
    expect(forMember.ids).toEqual([tenant.project.id, ledByMember.id, open.id].sort());
    expect(forMember.total).toBe(3);

    const forViewer = await listedProjectIds(tenant.actors.viewer);
    expect(forViewer.ids).toEqual([tenant.project.id, secret.id, open.id].sort());
    expect(forViewer.total).toBe(3);

    const forAdmin = await listedProjectIds(tenant.actors.admin);
    expect(forAdmin.total).toBe(4);
  });
});

describe("issue and comment reads", () => {
  it("hides a private project's issues from single reads, the board and the thread", async () => {
    await expect(
      issueService.getIssue(tenant.actors.member, tenant.org.id, secretIssue.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      issueService.getBoard(tenant.actors.member, tenant.org.id, secret.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      commentService.getThread(tenant.actors.member, tenant.org.id, secretIssue.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      issueService.getIssue(tenant.actors.viewer, tenant.org.id, secretIssue.id),
    ).resolves.toMatchObject({ issue: { id: secretIssue.id } });
    await expect(
      issueService.getBoard(tenant.actors.viewer, tenant.org.id, secret.id),
    ).resolves.toBeDefined();
  });

  it("drops a hidden project's issues from the org-wide issue list, total included", async () => {
    const forMember = await listedIssueIds(tenant.actors.member);
    expect(forMember.ids).toContain(openIssue.id);
    expect(forMember.ids).not.toContain(secretIssue.id);
    expect(forMember.total).toBe(forMember.ids.length);

    const forViewer = await listedIssueIds(tenant.actors.viewer);
    expect(forViewer.ids).toContain(secretIssue.id);
    expect(forViewer.total).toBe(forMember.total + 1);
  });
});

describe("writes", () => {
  it("refuses writes into a hidden project with NotFoundError", async () => {
    await expect(
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, secret.id, { title: "Sneaky" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      issueService.changeIssueStatus(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: secretIssue.id,
        status: "in_progress",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: secretIssue.id,
        body: "Can I see this?",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const fresh = await issueService.getIssue(
      tenant.actors.admin,
      tenant.org.id,
      secretIssue.id,
    );
    expect(fresh.issue.status).toBe(secretIssue.status);
  });

  it("still lets a project's own lead work in it", async () => {
    await expect(
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, ledByMember.id, { title: "Lead's own issue" }),
      ),
    ).resolves.toMatchObject({ projectId: ledByMember.id });
  });
});

describe("membership changes", () => {
  it("takes effect immediately when someone is removed from the project", async () => {
    await projectMemberRepo.removeProjectMember(
      tenant.org.id,
      secret.id,
      tenant.userIds.viewer,
    );
    try {
      await expect(
        issueService.getIssue(tenant.actors.viewer, tenant.org.id, secretIssue.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect((await listedProjectIds(tenant.actors.viewer)).ids).not.toContain(secret.id);
    } finally {
      await projectMemberRepo.addProjectMember(
        tenant.org.id,
        secret.id,
        tenant.userIds.viewer,
      );
    }
  });
});
