/**
 * Every query filters by `orgId` and by `archived_at`.
 *
 * Owner C implements `@/server/repositories/issue-repository`. Seed with
 * `seedTwoTenants()` from `tests/helpers/db.ts` so the negative case is a real
 * row in the other tenant.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import * as issueRepo from "@/server/repositories/issue-repository";
import * as labelRepo from "@/server/repositories/label-repository";
import * as permissions from "@/lib/permissions";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";

let cleanup: () => void;
let north: Tenant;
let acme: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  north = await createTenant("northwind-issues");
  acme = await createTenant("acme-issues");
});

afterAll(() => {
  cleanup();
});

/** Inserts one issue directly through the repository, bypassing the service. */
async function insertIssue(
  tenant: Tenant,
  overrides: Partial<{ title: string; assigneeId: (typeof tenant.userIds)["member"] | null }> = {},
) {
  const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
  return issueRepo.insertIssue(
    issueInput(tenant.org.id, tenant.project.id, overrides),
    tenant.userIds.owner,
    number,
  );
}

describe("repositories/issue-repository", () => {
  it("excludes another tenant's issues from every list query", async () => {
    const northIssue = await insertIssue(north, { title: "North only" });
    await insertIssue(acme, { title: "Acme only" });

    const page = await issueRepo.listIssues({
      orgId: north.org.id,
      limit: 25,
      cursor: null,
    });

    expect(page.items.map((issue) => issue.id)).toContain(northIssue.id);
    expect(page.items.every((issue) => issue.orgId === north.org.id)).toBe(true);
  });

  it("returns null for an id that belongs to another tenant", async () => {
    const issue = await insertIssue(north, { title: "Northwind private" });

    await expect(issueRepo.findIssueById(acme.org.id, issue.id)).resolves.toBeNull();
    await expect(
      issueRepo.findIssueById(north.org.id, issue.id),
    ).resolves.not.toBeNull();
  });

  it("hides archived issues unless includeArchived is set", async () => {
    const issue = await insertIssue(north, { title: "To be archived" });
    await issueRepo.archiveIssue(north.org.id, issue.id);

    const page = await issueRepo.listIssues({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
    });

    expect(page.items.map((row) => row.id)).not.toContain(issue.id);
  });

  it("returns archived issues when the scope asks for them", async () => {
    const issue = await insertIssue(north, { title: "Also archived" });
    await issueRepo.archiveIssue(north.org.id, issue.id);

    const page = await issueRepo.listIssues({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
      includeArchived: true,
    });

    expect(page.items.map((row) => row.id)).toContain(issue.id);
  });

  it("applies status, priority, assignee and label filters together", async () => {
    const label = await labelRepo.insertLabel({
      orgId: north.org.id,
      name: "urgent-bug",
      color: "#ef4444",
      description: null,
    });

    const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    const matching = await issueRepo.insertIssue(
      {
        ...issueInput(north.org.id, north.project.id, {
          title: "Matches every filter",
          assigneeId: north.userIds.member,
        }),
        status: "in_progress",
        priority: "urgent",
        labelIds: [label.id],
      },
      north.userIds.owner,
      number,
    );

    // A near-identical issue that only differs by status must not match.
    const otherNumber = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    await issueRepo.insertIssue(
      {
        ...issueInput(north.org.id, north.project.id, {
          title: "Wrong status",
          assigneeId: north.userIds.member,
        }),
        status: "backlog",
        priority: "urgent",
        labelIds: [label.id],
      },
      north.userIds.owner,
      otherNumber,
    );

    const page = await issueRepo.listIssues({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
      status: ["in_progress"],
      priority: ["urgent"],
      assigneeId: north.userIds.member,
      labelIds: [label.id],
    });

    expect(page.items.map((row) => row.id)).toEqual([matching.id]);
  });

  it("pages with a cursor and reports the total", async () => {
    const org = await createTenant("pager-issues");
    for (const title of ["First", "Second", "Third"]) {
      const number = await issueRepo.nextIssueNumber(org.org.id, org.project.id);
      await issueRepo.insertIssue(
        issueInput(org.org.id, org.project.id, { title }),
        org.userIds.owner,
        number,
      );
    }

    const firstPage = await issueRepo.listIssues({
      orgId: org.org.id,
      limit: 2,
      cursor: null,
    });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.total).toBe(3);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await issueRepo.listIssues({
      orgId: org.org.id,
      limit: 2,
      cursor: firstPage.nextCursor,
    });

    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();

    const seenIds = new Set([
      ...firstPage.items.map((row) => row.id),
      ...secondPage.items.map((row) => row.id),
    ]);
    expect(seenIds.size).toBe(3);
  });

  it("performs no authorization of its own", async () => {
    const canSpy = vi.spyOn(permissions, "can");
    const assertCanSpy = vi.spyOn(permissions, "assertCan");

    const issue = await insertIssue(north, { title: "No auth check here" });
    await issueRepo.findIssueById(north.org.id, issue.id);
    await issueRepo.listIssues({ orgId: north.org.id, limit: 10, cursor: null });

    expect(canSpy).not.toHaveBeenCalled();
    expect(assertCanSpy).not.toHaveBeenCalled();

    canSpy.mockRestore();
    assertCanSpy.mockRestore();
  });
});
