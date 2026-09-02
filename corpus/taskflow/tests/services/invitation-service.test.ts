/**
 * Seat quota and invite rate limiting.
 *
 * Owner C implements `@/server/services/invitation-service`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { PermissionDeniedError } from "@/lib/permissions";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as invitationService from "@/server/services/invitation-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  cleanup();
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
});

describe("services/invitation-service", () => {
  // can(actor, "member:invite", …) — a member cannot invite, an admin can.
  it("refuses an invite from an actor without member:invite", async () => {
    const tenant = await createTenant("invite-forbidden", "growth");

    await expect(
      invitationService.inviteMember(tenant.actors.member, {
        orgId: tenant.org.id,
        email: "newperson@invite-forbidden.test",
        role: "member",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  // wouldExceedLimit(plan, "seats", seatsUsed) blocks the fourth seat on free.
  it("refuses an invite that would exceed the plan's seat quota", async () => {
    // The free plan tops out at 3 seats; createTenant already seeds 4 active
    // members (owner, admin, member, viewer), so the org starts over quota.
    const tenant = await createTenant("invite-seat-quota", "free");

    await expect(
      invitationService.inviteMember(tenant.actors.admin, {
        orgId: tenant.org.id,
        email: "onemore@invite-seat-quota.test",
        role: "member",
      }),
    ).rejects.toThrow(/seats/);
  });

  // A bulk invite checks the seat quota once, for the whole batch.
  it("checks the seat quota once for a bulk invite", async () => {
    const tenant = await createTenant("invite-bulk-quota", "starter");

    // Bring the org to 9 of its 10 starter seats: 4 from createTenant, 5 more
    // inserted directly so only a single seat remains.
    for (let i = 0; i < 5; i += 1) {
      const user = await userRepo.insertUser({
        email: `filler${i}@invite-bulk-quota.test`,
        name: `Filler ${i}`,
        passwordHash: "seed",
      });
      await memberRepo.insertMember(tenant.org.id, user.id, "member", null);
    }
    await expect(memberRepo.countActiveMembers(tenant.org.id)).resolves.toBe(9);

    // A batch of two exceeds the one remaining seat; the check runs once for
    // the whole batch, so nothing is created — not even the first invite.
    await expect(
      invitationService.inviteMembers(tenant.actors.admin, {
        orgId: tenant.org.id,
        invites: [
          { email: "batch-a@invite-bulk-quota.test", role: "member" },
          { email: "batch-b@invite-bulk-quota.test", role: "member" },
        ],
      }),
    ).rejects.toThrow(/seats/);

    await expect(
      invitationRepo.countPendingInvitations(tenant.org.id),
    ).resolves.toBe(0);

    // The same-sized single invite fits inside the one remaining seat.
    await expect(
      invitationService.inviteMembers(tenant.actors.admin, {
        orgId: tenant.org.id,
        invites: [{ email: "batch-c@invite-bulk-quota.test", role: "member" }],
      }),
    ).resolves.toHaveLength(1);
  });

  // consumeRateLimit(orgId, "member:invite") throttles invite bursts.
  it("rate-limits invites per organization", async () => {
    const tenant = await createTenant("invite-rate-limit", "growth");
    rateLimitState.allowed = false;

    await expect(
      invitationService.inviteMember(tenant.actors.admin, {
        orgId: tenant.org.id,
        email: "throttled@invite-rate-limit.test",
        role: "member",
      }),
    ).rejects.toThrow(/rate limit/);
  });

  // member.invited carries the email and the granted role.
  it("emits member.invited with the email and role", async () => {
    const tenant = await createTenant("invite-emit", "growth");

    let off: Unsubscribe | undefined;
    const received = await new Promise((resolve) => {
      off = subscribe("member.invited", (payload) => resolve(payload));
      void invitationService.inviteMember(tenant.actors.admin, {
        orgId: tenant.org.id,
        email: "invitee@invite-emit.test",
        role: "admin",
      });
    });
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      email: "invitee@invite-emit.test",
      role: "admin",
    });
  });

  // Accepting creates the membership and emits member.joined.
  it("emits member.joined when an invitation is accepted", async () => {
    const tenant = await createTenant("invite-accept", "growth");
    const rawToken = "a".repeat(32);

    await invitationRepo.insertInvitation(
      tenant.org.id,
      {
        orgId: tenant.org.id,
        email: "acceptor@invite-accept.test",
        role: "member",
        expiresInDays: 14,
      },
      tenant.userIds.admin,
      hashToken(rawToken),
    );

    const newUser = await userRepo.insertUser({
      email: "acceptor@invite-accept.test",
      name: "Acceptor",
      passwordHash: "seed",
    });

    let off: Unsubscribe | undefined;
    const received = await new Promise((resolve) => {
      off = subscribe("member.joined", (payload) => resolve(payload));
      void invitationService.acceptInvitation(newUser.id, { token: rawToken });
    });
    off?.();

    expect(received).toMatchObject({
      orgId: tenant.org.id,
      userId: newUser.id,
      role: "member",
    });

    await expect(
      memberRepo.findMember(tenant.org.id, newUser.id),
    ).resolves.not.toBeNull();
  });

  // An expired or revoked token is refused rather than silently accepted.
  it("refuses an expired or revoked invitation token", async () => {
    const tenant = await createTenant("invite-revoked", "growth");
    const revokedToken = "b".repeat(32);

    const invitation = await invitationRepo.insertInvitation(
      tenant.org.id,
      {
        orgId: tenant.org.id,
        email: "revoked@invite-revoked.test",
        role: "member",
        expiresInDays: 14,
      },
      tenant.userIds.admin,
      hashToken(revokedToken),
    );
    await invitationRepo.revokeInvitation(tenant.org.id, invitation.id);

    const newUser = await userRepo.insertUser({
      email: "revoked@invite-revoked.test",
      name: "Revoked",
      passwordHash: "seed",
    });

    await expect(
      invitationService.acceptInvitation(newUser.id, { token: revokedToken }),
    ).rejects.toThrow(/revoked/);

    const expiredToken = "c".repeat(32);
    await invitationRepo.insertInvitation(
      tenant.org.id,
      {
        orgId: tenant.org.id,
        email: "expired@invite-revoked.test",
        role: "member",
        expiresInDays: -1,
      },
      tenant.userIds.admin,
      hashToken(expiredToken),
    );

    const secondUser = await userRepo.insertUser({
      email: "expired@invite-revoked.test",
      name: "Expired",
      passwordHash: "seed",
    });

    await expect(
      invitationService.acceptInvitation(secondUser.id, { token: expiredToken }),
    ).rejects.toThrow(/expired/);
  });
});
