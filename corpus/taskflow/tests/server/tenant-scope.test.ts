/**
 * The multi-tenancy invariant, exercised against a real database.
 *
 * Every repository read must be filtered by `org_id`. These cases create two
 * organizations with identical-looking content and then ask each one for the
 * other's rows: the answer has to be "nothing", at every level of the stack.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("./_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);

import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as issueService from "@/server/services/issue-service";
import { TenantScopeError } from "@/lib/tenant";
import { createTenant, issueInput, useTemporaryDatabase } from "./_support/fixtures";
import type { Tenant } from "./_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let north: Tenant;
let acme: Tenant;
let northIssue: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();

  north = await createTenant("northwind");
  acme = await createTenant("acme");

  northIssue = await issueService.createIssue(
    north.actors.member,
    issueInput(north.org.id, north.project.id, { title: "Northwind only" }),
  );

  await issueService.createIssue(
    acme.actors.member,
    issueInput(acme.org.id, acme.project.id, { title: "Acme only" }),
  );
});

afterAll(() => {
  cleanup();
});

describe("repository tenant scoping", () => {
  it("does not return another organization's issue by id", async () => {
    await expect(
      issueRepo.findIssueById(acme.org.id, northIssue.id),
    ).resolves.toBeNull();

    await expect(
      issueRepo.findIssueById(north.org.id, northIssue.id),
    ).resolves.not.toBeNull();
  });

  it("lists only the issues of the organization being asked", async () => {
    const page = await issueRepo.listIssues({
      orgId: acme.org.id,
      limit: 25,
      cursor: null,
    });

    expect(page.total).toBe(1);
    expect(page.items.map((issue) => issue.title)).toEqual(["Acme only"]);
  });

  it("does not return another organization's project by id or slug", async () => {
    await expect(
      projectRepo.findProjectById(acme.org.id, north.project.id),
    ).resolves.toBeNull();

    // Both tenants named their project "platform"; the slug lookup must still
    // resolve within the caller's organization.
    const found = await projectRepo.findProjectBySlug(acme.org.id, "platform");
    expect(found?.id).toBe(acme.project.id);
  });

  it("does not return another organization's member", async () => {
    await expect(
      memberRepo.findMember(acme.org.id, north.userIds.owner),
    ).resolves.toBeNull();

    await expect(
      memberRepo.findMember(north.org.id, north.userIds.owner),
    ).resolves.not.toBeNull();
  });

  it("counts seats per organization rather than globally", async () => {
    await expect(memberRepo.countActiveMembers(north.org.id)).resolves.toBe(4);
    await expect(memberRepo.countActiveMembers(acme.org.id)).resolves.toBe(4);
  });

  it("does not return another organization's comments", async () => {
    await expect(
      commentRepo.listThread(acme.org.id, northIssue.id),
    ).resolves.toEqual([]);
  });
});

describe("service tenant scoping", () => {
  it("rejects an actor reaching across organizations", async () => {
    await expect(
      issueService.getIssue(acme.actors.owner, north.org.id, northIssue.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("rejects a create whose payload names a foreign organization", async () => {
    await expect(
      issueService.createIssue(
        acme.actors.member,
        issueInput(north.org.id, north.project.id),
      ),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });
});
