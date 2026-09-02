/**
 * Slug uniqueness and archive/restore round-trip.
 *
 * Owner C implements `@/server/repositories/project-repository`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import * as projectRepo from "@/server/repositories/project-repository";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";

let cleanup: () => void;
let north: Tenant;
let acme: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  north = await createTenant("northwind-projects");
  acme = await createTenant("acme-projects");
});

afterAll(() => {
  cleanup();
});

describe("repositories/project-repository", () => {
  it("allows the same slug in two different organizations", async () => {
    // createTenant already gave each org a project slugged "platform".
    expect(north.project.slug).toBe("platform");
    expect(acme.project.slug).toBe("platform");
    expect(north.project.id).not.toBe(acme.project.id);
  });

  it("refuses a duplicate slug inside one organization", async () => {
    const second = await projectRepo.insertProject({
      orgId: north.org.id,
      name: "Second platform",
      slug: "platform",
      key: "SECD",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    expect(second.slug).not.toBe("platform");
    expect(second.id).not.toBe(north.project.id);

    const original = await projectRepo.findProjectBySlug(north.org.id, "platform");
    expect(original?.id).toBe(north.project.id);
  });

  it("scopes findBySlug to the organization", async () => {
    const found = await projectRepo.findProjectBySlug(acme.org.id, "platform");
    expect(found?.id).toBe(acme.project.id);
    expect(found?.id).not.toBe(north.project.id);
  });

  it("archives by stamping archived_at, keeping the row", async () => {
    const created = await projectRepo.insertProject({
      orgId: north.org.id,
      name: "To archive",
      slug: "to-archive",
      key: "ARCH",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    const archived = await projectRepo.archiveProject(north.org.id, created.id);
    expect(archived.archivedAt).not.toBeNull();

    const stillThere = await projectRepo.findProjectById(north.org.id, created.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.archivedAt).not.toBeNull();
  });

  it("restores an archived project", async () => {
    const created = await projectRepo.insertProject({
      orgId: north.org.id,
      name: "To restore",
      slug: "to-restore",
      key: "REST",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });

    await projectRepo.archiveProject(north.org.id, created.id);
    const restored = await projectRepo.restoreProject(north.org.id, created.id);

    expect(restored.archivedAt).toBeNull();

    const page = await projectRepo.listProjects({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
    });
    expect(page.items.map((row) => row.id)).toContain(created.id);
  });

  it("excludes archived projects from the default listing", async () => {
    const created = await projectRepo.insertProject({
      orgId: north.org.id,
      name: "Stays archived",
      slug: "stays-archived",
      key: "STAY",
      description: null,
      visibility: "org",
      leadId: null,
      color: "#6366f1",
      targetDate: null,
    });
    await projectRepo.archiveProject(north.org.id, created.id);

    const defaultPage = await projectRepo.listProjects({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
    });
    expect(defaultPage.items.map((row) => row.id)).not.toContain(created.id);

    const withArchived = await projectRepo.listProjects({
      orgId: north.org.id,
      limit: 100,
      cursor: null,
      includeArchived: true,
    });
    expect(withArchived.items.map((row) => row.id)).toContain(created.id);
  });
});
