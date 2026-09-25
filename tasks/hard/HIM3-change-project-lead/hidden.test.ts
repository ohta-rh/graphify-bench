/**
 * Hidden test for HIM3: handing a project's lead to someone else.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { can, PermissionDeniedError, ROLE_MATRIX } from "@/lib/permissions";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { changeProjectLeadSchema } from "@/schemas/project";
import * as memberRepo from "@/server/repositories/member-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import { NotFoundError } from "@/server/services/_support";
import * as projectService from "@/server/services/project-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { UserId } from "@/types/common";
import type { Project } from "@/types/project";

let cleanup: () => void;
let a: Tenant;
let b: Tenant;
let seq = 0;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("him3a", "growth");
  b = await createTenant("him3b", "growth");
});

afterAll(() => {
  cleanup();
});

async function freshProject(t: Tenant, leadId: UserId | null): Promise<Project> {
  seq += 1;
  return projectRepo.insertProject({
    orgId: t.org.id,
    name: `Lead project ${seq}`,
    slug: `lead-project-${seq}`,
    key: `LP${seq}`,
    description: null,
    visibility: "org",
    leadId,
    color: "#6366f1",
    targetDate: null,
  });
}

async function leadOf(t: Tenant, project: Project): Promise<UserId | null> {
  return (await projectRepo.findProjectById(t.org.id, project.id))?.leadId ?? null;
}

describe("HIM3 projectService.changeProjectLead", () => {
  it("lets an admin hand the lead to an active member", async () => {
    const project = await freshProject(a, a.userIds.owner);

    const updated = await projectService.changeProjectLead(a.actors.admin, {
      orgId: a.org.id,
      projectId: project.id,
      leadId: a.userIds.member,
    });

    expect(updated.id).toBe(project.id);
    expect(updated.leadId).toBe(a.userIds.member);
    expect(await leadOf(a, project)).toBe(a.userIds.member);
  });

  it("lets the current lead hand over their own project, and nobody else below admin", async () => {
    const project = await freshProject(a, a.userIds.member);

    await projectService.changeProjectLead(a.actors.member, {
      orgId: a.org.id,
      projectId: project.id,
      leadId: a.userIds.admin,
    });
    expect(await leadOf(a, project)).toBe(a.userIds.admin);

    // No longer the lead: the member may not take it back.
    await expect(
      projectService.changeProjectLead(a.actors.member, {
        orgId: a.org.id,
        projectId: project.id,
        leadId: a.userIds.member,
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(await leadOf(a, project)).toBe(a.userIds.admin);
  });

  it("refuses a lead who could not update the project themselves", async () => {
    const project = await freshProject(a, a.userIds.owner);

    await expect(
      projectService.changeProjectLead(a.actors.admin, {
        orgId: a.org.id,
        projectId: project.id,
        leadId: a.userIds.viewer,
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(await leadOf(a, project)).toBe(a.userIds.owner);
  });

  it("refuses a lead who is not a current member of the organization", async () => {
    const project = await freshProject(a, a.userIds.owner);

    // A member of another organization only.
    await expect(
      projectService.changeProjectLead(a.actors.owner, {
        orgId: a.org.id,
        projectId: project.id,
        leadId: b.userIds.member,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    // A removed member.
    const removedTenant = await createTenant("him3removed", "growth");
    const row = await memberRepo.findMember(removedTenant.org.id, removedTenant.userIds.admin);
    await memberRepo.archiveMember(removedTenant.org.id, row!.id);
    const other = await freshProject(removedTenant, removedTenant.userIds.owner);

    await expect(
      projectService.changeProjectLead(removedTenant.actors.owner, {
        orgId: removedTenant.org.id,
        projectId: other.id,
        leadId: removedTenant.userIds.admin,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await leadOf(a, project)).toBe(a.userIds.owner);
    expect(await leadOf(removedTenant, other)).toBe(removedTenant.userIds.owner);
  });

  it("clears the lead when given null", async () => {
    const project = await freshProject(a, a.userIds.member);

    const updated = await projectService.changeProjectLead(a.actors.owner, {
      orgId: a.org.id,
      projectId: project.id,
      leadId: null,
    });

    expect(updated.leadId).toBeNull();
    expect(await leadOf(a, project)).toBeNull();
  });

  it("refuses to change the lead of an archived project", async () => {
    const project = await freshProject(a, a.userIds.owner);
    await projectService.archiveProject(a.actors.admin, {
      orgId: a.org.id,
      projectId: project.id,
      archiveIssues: true,
    });

    await expect(
      projectService.changeProjectLead(a.actors.admin, {
        orgId: a.org.id,
        projectId: project.id,
        leadId: a.userIds.member,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(await leadOf(a, project)).toBe(a.userIds.owner);
  });

  it("keeps other organizations out", async () => {
    const theirs = await freshProject(b, b.userIds.owner);

    await expect(
      projectService.changeProjectLead(a.actors.owner, {
        orgId: a.org.id,
        projectId: theirs.id,
        leadId: a.userIds.member,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      projectService.changeProjectLead(a.actors.owner, {
        orgId: b.org.id,
        projectId: theirs.id,
        leadId: b.userIds.member,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await leadOf(b, theirs)).toBe(b.userIds.owner);
  });

  it("exposes the new permission in the permission system", async () => {
    const project = await freshProject(a, a.userIds.member);
    const resource = {
      kind: "project" as const,
      orgId: a.org.id,
      projectId: project.id,
      visibility: project.visibility,
      leadId: project.leadId,
    };

    expect(ROLE_MATRIX["project:change_lead"]).toBe("admin");
    expect(can(a.actors.admin, "project:change_lead", resource)).toBe(true);
    expect(can(a.actors.owner, "project:change_lead", resource)).toBe(true);
    // The member leads this project, the viewer does not.
    expect(can(a.actors.member, "project:change_lead", resource)).toBe(true);
    expect(can(a.actors.viewer, "project:change_lead", resource)).toBe(false);
    expect(
      can(a.actors.member, "project:change_lead", { ...resource, leadId: a.userIds.owner }),
    ).toBe(false);
  });

  it("validates the request shape", () => {
    const base = { orgId: a.org.id, projectId: a.project.id };
    expect(changeProjectLeadSchema.safeParse({ ...base, leadId: null }).success).toBe(true);
    expect(changeProjectLeadSchema.safeParse({ ...base, leadId: a.userIds.member }).success).toBe(true);
    expect(changeProjectLeadSchema.safeParse({ ...base, leadId: "not-a-ulid" }).success).toBe(false);
    expect(changeProjectLeadSchema.safeParse(base).success).toBe(false);
  });
});
