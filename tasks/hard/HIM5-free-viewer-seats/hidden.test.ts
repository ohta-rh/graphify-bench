/**
 * HIM5 — viewers no longer occupy a paid seat.
 *
 * The rule must hold on every path that counts seats: the invite flow, role
 * changes, the usage recount, the incremental usage counters and the plan
 * downgrade check.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { hashToken } from "@/lib/hash";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as billingService from "@/server/services/billing-service";
import * as invitationService from "@/server/services/invitation-service";
import * as memberService from "@/server/services/member-service";
import * as usageService from "@/server/services/usage-service";
import { isBillableRole } from "@/types/member";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { MemberId, UserId } from "@/types/common";
import type { Role } from "@/types/member";

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

async function memberIdOf(tenant: Tenant, userId: UserId): Promise<MemberId> {
  const member = await memberRepo.findMember(tenant.org.id, userId);
  if (!member) throw new Error("fixture member missing");
  return member.id;
}

async function roleOf(tenant: Tenant, userId: UserId): Promise<Role | undefined> {
  return (await memberRepo.findMember(tenant.org.id, userId))?.role;
}

let tokenSeq = 0;

/** Creates a pending invitation and a user, then accepts it. */
async function joinAs(tenant: Tenant, role: Exclude<Role, "owner">): Promise<UserId> {
  tokenSeq += 1;
  const token = `tok${tokenSeq}`.padEnd(32, "z");
  const email = `joiner${tokenSeq}@${tenant.org.slug}.test`;
  await invitationRepo.insertInvitation(
    tenant.org.id,
    { orgId: tenant.org.id, email, role, expiresInDays: 14 },
    tenant.userIds.owner,
    hashToken(token),
  );
  const user = await userRepo.insertUser({
    email,
    name: `Joiner ${tokenSeq}`,
    passwordHash: "seed",
  });
  await invitationService.acceptInvitation(user.id, { token });
  return user.id;
}

describe("isBillableRole", () => {
  it("is false for viewers only", () => {
    expect(isBillableRole("owner")).toBe(true);
    expect(isBillableRole("admin")).toBe(true);
    expect(isBillableRole("member")).toBe(true);
    expect(isBillableRole("viewer")).toBe(false);
  });
});

describe("invitations", () => {
  it("never refuses viewer invites on a full plan, but still refuses billable ones", async () => {
    // Free plan: 3 seats. Owner, admin and member fill it; the viewer is free.
    const tenant = await createTenant("him5-inv-full", "free");

    await expect(
      invitationService.inviteMembers(tenant.actors.owner, {
        orgId: tenant.org.id,
        invites: [
          { email: "v1@him5-inv-full.test", role: "viewer" },
          { email: "v2@him5-inv-full.test", role: "viewer" },
        ],
      }),
    ).resolves.toHaveLength(2);

    await expect(
      invitationService.inviteMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        email: "m1@him5-inv-full.test",
        role: "member",
      }),
    ).rejects.toThrow(/seats/i);
  });

  it("asks a mixed batch for its billable invites only, and ignores pending viewer invites", async () => {
    const tenant = await createTenant("him5-inv-mixed", "free");
    // Demote the member so exactly one seat is free (owner + admin billable).
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, tenant.userIds.member),
      role: "viewer",
    });

    await expect(
      invitationService.inviteMembers(tenant.actors.owner, {
        orgId: tenant.org.id,
        invites: [
          { email: "va@him5-inv-mixed.test", role: "viewer" },
          { email: "vb@him5-inv-mixed.test", role: "viewer" },
          { email: "ma@him5-inv-mixed.test", role: "member" },
        ],
      }),
    ).resolves.toHaveLength(3);

    // The pending billable invite now holds the last seat.
    await expect(
      invitationService.inviteMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        email: "mb@him5-inv-mixed.test",
        role: "admin",
      }),
    ).rejects.toThrow(/seats/i);

    // …while viewers still get in.
    await expect(
      invitationService.inviteMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        email: "vc@him5-inv-mixed.test",
        role: "viewer",
      }),
    ).resolves.toMatchObject({ role: "viewer" });
  });
});

describe("role changes", () => {
  it("refuses to promote a viewer into a billable role when no seat is free", async () => {
    const tenant = await createTenant("him5-role-full", "free");
    const viewerMemberId = await memberIdOf(tenant, tenant.userIds.viewer);

    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: viewerMemberId,
        role: "member",
      }),
    ).rejects.toThrow(/seats/i);
    await expect(roleOf(tenant, tenant.userIds.viewer)).resolves.toBe("viewer");

    // Moving between billable roles never needs a new seat.
    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, tenant.userIds.admin),
        role: "member",
      }),
    ).resolves.toMatchObject({ role: "member" });

    // Demoting a billable member frees a seat for the viewer.
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, tenant.userIds.member),
      role: "viewer",
    });
    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: viewerMemberId,
        role: "admin",
      }),
    ).resolves.toMatchObject({ role: "admin" });
  });

  it("counts pending billable invitations when promoting a viewer", async () => {
    const tenant = await createTenant("him5-role-pending", "free");
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: await memberIdOf(tenant, tenant.userIds.member),
      role: "viewer",
    });
    await invitationService.inviteMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      email: "holder@him5-role-pending.test",
      role: "member",
    });

    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, tenant.userIds.viewer),
        role: "member",
      }),
    ).rejects.toThrow(/seats/i);
  });
});

describe("usage figures", () => {
  it("recounts billable members only, so checkLimit agrees", async () => {
    const tenant = await createTenant("him5-usage-free", "free");

    const usage = await usageService.recomputeUsage(tenant.org.id);
    expect(usage.seatsUsed).toBe(3);

    const check = await billingService.checkLimit(tenant.org.id, "seats");
    expect(check).toMatchObject({ limit: 3, used: 3, remaining: 0 });
  });

  it("lets an org full of viewers downgrade to a plan that fits its billable seats", async () => {
    const tenant = await createTenant("him5-downgrade", "growth");
    for (let i = 0; i < 10; i += 1) {
      const user = await userRepo.insertUser({
        email: `reader${i}@him5-downgrade.test`,
        name: `Reader ${i}`,
        passwordHash: "seed",
      });
      await memberRepo.insertMember(tenant.org.id, user.id, "viewer", null);
    }
    await usageService.recomputeUsage(tenant.org.id);

    await expect(
      billingService.changePlan(tenant.actors.owner, {
        orgId: tenant.org.id,
        plan: "free",
        interval: "monthly",
      }),
    ).resolves.toMatchObject({ plan: "free" });
  });

  it("keeps the incremental seat counter in step as members join, change role and leave", async () => {
    const off = usageService.registerUsageListeners();
    try {
      const tenant = await createTenant("him5-deltas", "growth");
      const seats = async () =>
        (await usageRepo.getUsage(tenant.org.id)).seatsUsed;

      await usageService.recomputeUsage(tenant.org.id);
      expect(await seats()).toBe(3);

      const newViewer = await joinAs(tenant, "viewer");
      expect(await seats()).toBe(3);

      const newMember = await joinAs(tenant, "member");
      expect(await seats()).toBe(4);

      await memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, newViewer),
        role: "member",
      });
      expect(await seats()).toBe(5);

      await memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, tenant.userIds.member),
        role: "viewer",
      });
      expect(await seats()).toBe(4);

      await memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, tenant.userIds.admin),
        role: "member",
      });
      expect(await seats()).toBe(4);

      await memberService.removeMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, tenant.userIds.viewer),
      });
      expect(await seats()).toBe(4);

      await memberService.removeMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: await memberIdOf(tenant, newMember),
      });
      expect(await seats()).toBe(3);

      // The deltas and a full recount agree.
      const recounted = await usageService.recomputeUsage(tenant.org.id);
      expect(recounted.seatsUsed).toBe(3);
    } finally {
      off();
    }
  });
});
