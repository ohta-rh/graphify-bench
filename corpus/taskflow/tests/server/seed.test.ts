/**
 * The development seed.
 *
 * Other suites and manual QA both build on this fixture, so it has to produce
 * the same rows every time and cover the shapes those callers rely on: two
 * tenants on different plans, all four roles, and issues that are archived and
 * overdue rather than uniformly healthy.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("./_support/doubles/misc")).loggerModule);

import { seedDatabase } from "@/server/db/seed";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import { toIsoTimestamp } from "@/types/common";
import { useTemporaryDatabase } from "./_support/fixtures";
import type { SeedSummary } from "@/server/db/seed";
import type { Organization } from "@/types/organization";

let cleanup: () => void;
let summary: SeedSummary;
let northwind: Organization;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  summary = await seedDatabase(process.env.TASKFLOW_DB_PATH);

  const found = await orgRepo.findOrgBySlug("northwind");
  expect(found).not.toBeNull();
  northwind = found!;
});

afterAll(() => {
  cleanup();
});

describe("seedDatabase", () => {
  it("creates two organizations on different plans", async () => {
    expect(summary.organizations).toBe(2);

    const acme = await orgRepo.findOrgBySlug("acme");
    expect(northwind.plan).toBe("growth");
    expect(acme?.plan).toBe("free");
  });

  it("creates roughly forty issues across three projects", () => {
    expect(summary.projects).toBe(3);
    expect(summary.issues).toBe(39);
    expect(summary.comments).toBeGreaterThan(0);
  });

  it("gives every organization a member in all four roles", async () => {
    const page = await memberRepo.listMembers({
      orgId: northwind.id,
      limit: 25,
      cursor: null,
    });

    expect(page.items.map((member) => member.role).sort()).toEqual([
      "admin",
      "member",
      "owner",
      "viewer",
    ]);
  });

  it("includes archived issues so soft-delete paths have data", async () => {
    const live = await issueRepo.listIssues({
      orgId: northwind.id,
      limit: 100,
      cursor: null,
    });
    const all = await issueRepo.listIssues({
      orgId: northwind.id,
      limit: 100,
      cursor: null,
      includeArchived: true,
    });

    expect(all.total).toBeGreaterThan(live.total);
  });

  it("includes overdue issues so the scan job has data", async () => {
    const overdue = await issueRepo.listOverdueIssues(
      northwind.id,
      toIsoTimestamp(new Date("2026-06-01T00:00:00.000Z")),
    );
    expect(overdue.length).toBeGreaterThan(0);
  });

  it("is idempotent: a second run leaves the same counts", async () => {
    const again = await seedDatabase(process.env.TASKFLOW_DB_PATH);
    expect(again).toEqual(summary);
  });
});
