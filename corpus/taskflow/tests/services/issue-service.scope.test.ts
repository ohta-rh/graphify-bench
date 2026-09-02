/**
 * An actor from another org cannot read or mutate an issue.
 *
 * Owner C implements `@/server/services/issue-service`; the integration pass
 * fills these in. Seed both tenants with `seedTwoTenants()`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import * as issueService from "@/server/services/issue-service";
import { TenantScopeError } from "@/lib/tenant";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let north: Tenant;
let acme: Tenant;
let northIssue: Issue;
let acmeIssue: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();

  north = await createTenant("scopenorth");
  acme = await createTenant("scopeacme");

  northIssue = await issueService.createIssue(
    north.actors.member,
    issueInput(north.org.id, north.project.id, { title: "Northwind only" }),
  );

  acmeIssue = await issueService.createIssue(
    acme.actors.member,
    issueInput(acme.org.id, acme.project.id, { title: "Acme only" }),
  );
});

afterAll(() => {
  cleanup();
});

describe("services/issue-service — tenant scope", () => {
  it("refuses a read for an actor whose orgId differs from the issue's", async () => {
    await expect(
      issueService.getIssue(acme.actors.member, north.org.id, northIssue.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("refuses a cross-tenant read even for the other org's owner", async () => {
    await expect(
      issueService.getIssue(acme.actors.owner, north.org.id, northIssue.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("never returns another tenant's issues from a list query", async () => {
    const page = await issueService.listIssues(north.actors.owner, {
      orgId: north.org.id,
      limit: 25,
      cursor: null,
    });

    expect(page.items.map((issue) => issue.title)).not.toContain(acmeIssue.title);
    expect(page.items.every((issue) => issue.orgId === north.org.id)).toBe(true);
  });

  it("maps a cross-tenant mutation to tenant_scope_violation", async () => {
    const error: unknown = await issueService
      .updateIssue(acme.actors.owner, {
        orgId: north.org.id,
        issueId: northIssue.id,
        title: "Hijacked title",
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(TenantScopeError);
    expect((error as TenantScopeError).code).toBe("tenant_scope_violation");
  });
});
