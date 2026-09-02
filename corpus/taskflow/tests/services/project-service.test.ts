/**
 * Project quota, slug suggestion and the archive cascade.
 *
 * Owner C implements `@/server/services/project-service`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { CreateProjectInput } from "@/schemas/project";
import type { OrgId } from "@/types/common";

function projectInput(
  orgId: OrgId,
  overrides: Partial<{ name: string; slug: string; key: string }> = {},
): CreateProjectInput {
  return {
    orgId,
    name: overrides.name ?? "Widget Works",
    slug: overrides.slug ?? "widget-works",
    key: overrides.key ?? "WID",
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  };
}

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

describe("services/project-service", () => {
  it("refuses creation once the plan's project quota is reached", async () => {
    // `createTenant` already inserts one project, so the free plan's ceiling
    // of two projects is one `createProject` call away.
    const tenant = await createTenant("projquota", "free");

    await projectService.createProject(
      tenant.actors.member,
      projectInput(tenant.org.id, { name: "Second Project", slug: "second", key: "SEC" }),
    );

    await expect(
      projectService.createProject(
        tenant.actors.member,
        projectInput(tenant.org.id, { name: "Third Project", slug: "third", key: "THI" }),
      ),
    ).rejects.toThrow(/allows 2 projects/);
  });

  it("suggests a suffixed slug when the requested one is taken", async () => {
    // `createTenant` seeds a project already slugged "platform".
    const tenant = await createTenant("projslug", "growth");
    expect(tenant.project.slug).toBe("platform");

    await expect(
      projectService.suggestProjectSlug(tenant.org.id, "Platform"),
    ).resolves.toBe("platform-2");
  });

  it("scopes slug uniqueness to the organization", async () => {
    const tenantA = await createTenant("slugorga", "growth");
    const tenantB = await createTenant("slugorgb", "growth");

    await projectService.createProject(
      tenantB.actors.member,
      projectInput(tenantB.org.id, { name: "Rocket", slug: "rocket", key: "ROC" }),
    );

    // "rocket" is taken in org B but free in org A.
    await expect(
      projectService.suggestProjectSlug(tenantA.org.id, "Rocket"),
    ).resolves.toBe("rocket");
  });

  it("cascades the archive to the project's issues when asked", async () => {
    const tenant = await createTenant("archivecascade", "growth");

    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Live issue 1" }),
    );
    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Live issue 2" }),
    );

    expect(await issueRepo.countIssues(tenant.org.id, tenant.project.id)).toBe(2);

    await projectService.archiveProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      projectId: tenant.project.id,
      archiveIssues: true,
    });

    expect(await issueRepo.countIssues(tenant.org.id, tenant.project.id)).toBe(0);
    expect(
      await issueRepo.countIssues(tenant.org.id, tenant.project.id, {
        includeArchived: true,
      }),
    ).toBe(2);
  });

  it("emits project.archived with the number of issues archived", async () => {
    const tenant = await createTenant("archiveevent", "growth");

    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "To be archived" }),
    );
    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Also archived" }),
    );
    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Archived too" }),
    );

    const received: unknown[] = [];
    const off = subscribe("project.archived", (payload) => {
      received.push(payload);
    });

    try {
      const archived = await projectService.archiveProject(tenant.actors.admin, {
        orgId: tenant.org.id,
        projectId: tenant.project.id,
        archiveIssues: true,
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ projectId: archived.id, issuesArchived: 3 });
    } finally {
      off();
    }
  });

  it("restores an archived project and emits project.restored", async () => {
    const tenant = await createTenant("restoreproj", "growth");

    await projectService.archiveProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      projectId: tenant.project.id,
      archiveIssues: false,
    });

    const received: unknown[] = [];
    const off = subscribe("project.restored", (payload) => {
      received.push(payload);
    });

    try {
      const restored = await projectService.restoreProject(
        tenant.actors.admin,
        tenant.org.id,
        tenant.project.id,
      );

      expect(restored.archivedAt).toBeNull();

      const stored = await projectRepo.findProjectById(tenant.org.id, tenant.project.id);
      expect(stored?.archivedAt).toBeNull();

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({ projectId: tenant.project.id });
    } finally {
      off();
    }
  });
});
