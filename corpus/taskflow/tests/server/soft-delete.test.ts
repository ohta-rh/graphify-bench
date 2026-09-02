/**
 * Soft-delete filtering.
 *
 * Archived rows stay in the table and disappear from every default read. The
 * cases below pin both halves of that: an archived issue is invisible unless
 * `includeArchived` is set, and archiving a project cascades to its issues.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("./_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);

import { AlreadyArchivedError } from "@/lib/soft-delete";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let tenant: Tenant;
let live: Issue;
let archived: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("softdelete");

  live = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title: "Still open" }),
  );

  const doomed = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title: "Archived away" }),
  );

  archived = await issueService.archiveIssue(
    tenant.actors.member,
    tenant.org.id,
    doomed.id,
  );
});

afterAll(() => {
  cleanup();
});

describe("archived issues", () => {
  it("marks the row rather than deleting it", async () => {
    expect(archived.archivedAt).not.toBeNull();

    const stillThere = await issueRepo.findIssueById(
      tenant.org.id,
      archived.id,
    );
    expect(stillThere?.id).toBe(archived.id);
  });

  it("is excluded from the default listing", async () => {
    const page = await issueRepo.listIssues({
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });

    expect(page.items.map((issue) => issue.id)).toEqual([live.id]);
    expect(page.total).toBe(1);
  });

  it("reappears when the caller opts in", async () => {
    const page = await issueRepo.listIssues({
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
      includeArchived: true,
    });

    expect(page.total).toBe(2);
    expect(page.items.map((issue) => issue.id).sort()).toEqual(
      [live.id, archived.id].sort(),
    );
  });

  it("is excluded from the per-project count the quota reads", async () => {
    await expect(
      issueRepo.countIssues(tenant.org.id, tenant.project.id),
    ).resolves.toBe(1);

    await expect(
      issueRepo.countIssues(tenant.org.id, tenant.project.id, {
        includeArchived: true,
      }),
    ).resolves.toBe(2);
  });

  it("is excluded from the board columns", async () => {
    const columns = await issueRepo.listBoardColumns(
      tenant.org.id,
      tenant.project.id,
    );
    const ids = columns.flatMap((column) => column.issues.map((i) => i.id));

    expect(ids).toEqual([live.id]);
  });

  it("keeps its issue number reserved", async () => {
    await expect(
      issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id),
    ).resolves.toBe(3);
  });

  it("refuses to be archived twice", async () => {
    await expect(
      issueService.archiveIssue(
        tenant.actors.member,
        tenant.org.id,
        archived.id,
      ),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
  });
});

describe("archiving a project", () => {
  it("cascades to the project's live issues", async () => {
    const scratch = await projectService.createProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      name: "Scratch",
      slug: "scratch",
      key: "SCR",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, scratch.id, { title: "Doomed with project" }),
    );

    const result = await projectService.archiveProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      projectId: scratch.id,
      archiveIssues: true,
    });

    expect(result.archivedAt).not.toBeNull();
    await expect(
      issueRepo.countIssues(tenant.org.id, scratch.id),
    ).resolves.toBe(0);
    await expect(
      issueRepo.countIssues(tenant.org.id, scratch.id, {
        includeArchived: true,
      }),
    ).resolves.toBe(1);

    const listed = await projectRepo.listProjects({
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });
    expect(listed.items.map((project) => project.id)).not.toContain(scratch.id);
  });
});
