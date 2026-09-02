/**
 * Role changes and the last-owner invariant.
 *
 * Owner C implements `@/server/services/member-service`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import * as memberRepo from "@/server/repositories/member-repository";
import * as memberService from "@/server/services/member-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

describe("services/member-service", () => {
  // can(actor, "member:update_role", …) gates the change; a member cannot self-promote.
  it("refuses a role change to an actor without member:update_role", async () => {
    const tenant = await createTenant("member-role-forbidden", "growth");
    const target = await memberRepo.findMember(tenant.org.id, tenant.userIds.viewer);
    if (!target) throw new Error("fixture member missing");

    await expect(
      memberService.updateMemberRole(tenant.actors.member, {
        orgId: tenant.org.id,
        memberId: target.id,
        role: "admin",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  // The org must always retain at least one owner.
  it("refuses to demote the last remaining owner", async () => {
    const tenant = await createTenant("member-last-owner-demote", "growth");
    const ownerMember = await memberRepo.findMember(tenant.org.id, tenant.userIds.owner);
    if (!ownerMember) throw new Error("fixture owner missing");

    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: ownerMember.id,
        role: "admin",
      }),
    ).rejects.toThrow(/at least one owner/);
  });

  // Demoting an owner is fine while another owner exists.
  it("allows demoting an owner when another owner remains", async () => {
    const tenant = await createTenant("member-second-owner", "growth");
    const ownerMember = await memberRepo.findMember(tenant.org.id, tenant.userIds.owner);
    const adminMember = await memberRepo.findMember(tenant.org.id, tenant.userIds.admin);
    if (!ownerMember || !adminMember) throw new Error("fixture member missing");

    // Promote the admin to owner first, so two owners exist.
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: adminMember.id,
      role: "owner",
    });

    const demoted = await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: ownerMember.id,
      role: "admin",
    });

    expect(demoted.role).toBe("admin");
  });

  // member.role_changed carries both the previous and the new role.
  it("emits member.role_changed with from and to", async () => {
    const tenant = await createTenant("member-role-emit", "growth");
    const target = await memberRepo.findMember(tenant.org.id, tenant.userIds.admin);
    if (!target) throw new Error("fixture member missing");

    let off: Unsubscribe | undefined;
    const received = await new Promise((resolve) => {
      off = subscribe("member.role_changed", (payload) => resolve(payload));
      void memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: target.id,
        role: "member",
      });
    });
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      memberId: target.id,
      from: "admin",
      to: "member",
    });
  });

  // Removing the last owner is refused for the same invariant.
  it("refuses to remove the last remaining owner", async () => {
    const tenant = await createTenant("member-last-owner-remove", "growth");
    const ownerMember = await memberRepo.findMember(tenant.org.id, tenant.userIds.owner);
    if (!ownerMember) throw new Error("fixture owner missing");

    await expect(
      memberService.removeMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: ownerMember.id,
      }),
    ).rejects.toThrow(/at least one owner/);
  });

  // member.removed carries the memberId and userId that left.
  it("emits member.removed when a member is removed", async () => {
    const tenant = await createTenant("member-remove-emit", "growth");
    const target = await memberRepo.findMember(tenant.org.id, tenant.userIds.viewer);
    if (!target) throw new Error("fixture member missing");

    let off: Unsubscribe | undefined;
    const received = await new Promise((resolve) => {
      off = subscribe("member.removed", (payload) => resolve(payload));
      void memberService.removeMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: target.id,
      });
    });
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      memberId: target.id,
      userId: tenant.userIds.viewer,
    });
  });
});
