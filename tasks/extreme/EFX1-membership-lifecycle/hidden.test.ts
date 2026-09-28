/**
 * Hidden test for EFX1-membership-lifecycle: invitations hold seats only while
 * pending, may be accepted only by the invited account, bring former members
 * back on their old membership row, and a removed member is fully detached
 * (notifications, digest, session default) until they rejoin.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);
vi.mock("@/lib/hash", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/hash")>();
  let seq = 0;
  return {
    ...actual,
    randomToken: (bytes = 32): string => {
      seq += 1;
      const token = `tok${String(seq).padStart(6, "0")}`.padEnd(Math.max(bytes, 32), "x");
      minted.push(token);
      return token;
    },
  };
});

import { eq } from "drizzle-orm";
import { subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { getDb, sessions } from "@/server/db";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as sessionRepo from "@/server/repositories/session-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { listDigestRecipients } from "@/server/services/digest-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import { listNotifications } from "@/server/services/notification-service";
import * as organizationService from "@/server/services/organization-service";
import * as usageService from "@/server/services/usage-service";
import { emit } from "@/lib/event-bus";
import { toIsoTimestamp } from "@/types/common";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CommentId, SessionId, UserId } from "@/types/common";
import type { TaskflowEventMap, Unsubscribe } from "@/types/event";
import type { Invitation, Role } from "@/types/member";
import type { NotificationKind } from "@/types/notification";

const minted: string[] = [];
const T0 = new Date("2026-04-01T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

let cleanup: () => void;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
  vi.useFakeTimers({ toFake: ["Date"] });
});

beforeEach(() => {
  vi.setSystemTime(T0);
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  cleanup();
});

function at(offsetMs: number): void {
  vi.setSystemTime(new Date(T0.getTime() + offsetMs));
}

async function invite(
  t: Tenant,
  email: string,
  role: "admin" | "member" | "viewer" = "member",
): Promise<{ invitation: Invitation; token: string }> {
  const invitation = await invitationService.inviteMember(t.actors.admin, {
    orgId: t.org.id,
    email,
    role,
  });
  const token = minted.at(-1);
  if (!token) throw new Error("no token minted");
  return { invitation, token };
}

async function newUser(email: string): Promise<UserId> {
  const user = await userRepo.insertUser({ email, name: email.split("@")[0] ?? email, passwordHash: "seed" });
  return user.id;
}

async function removeUser(t: Tenant, userId: UserId) {
  const member = await memberRepo.findMember(t.org.id, userId);
  if (!member) throw new Error("member missing");
  return memberService.removeMember(t.actors.owner, { orgId: t.org.id, memberId: member.id });
}

/** Inserts `n` pending invitations straight into the repository. */
async function seedPending(t: Tenant, n: number, prefix: string): Promise<void> {
  for (let i = 0; i < n; i += 1) {
    await invitationRepo.insertInvitation(
      t.org.id,
      { orgId: t.org.id, email: `${prefix}${i}@${t.org.slug}.test`, role: "member", expiresInDays: 14 },
      t.userIds.admin,
      hashToken(`seed-${prefix}-${i}`.padEnd(32, "x")),
    );
  }
}

async function countNotifications(t: Tenant, recipientId: UserId, kind: NotificationKind): Promise<number> {
  const page = await listNotifications(t.actors.owner, {
    orgId: t.org.id,
    recipientId,
    unreadOnly: false,
    kind: [kind],
    limit: 100,
    cursor: null,
  });
  return page.total;
}

function capture<K extends keyof TaskflowEventMap>(type: K): { seen: TaskflowEventMap[K][]; off: Unsubscribe } {
  const seen: TaskflowEventMap[K][] = [];
  const off = subscribe(type, (payload) => {
    seen.push(payload);
  });
  return { seen, off };
}

describe("accepting an invitation", () => {
  it("makes the invitee a full member: they can act, are listed and take a seat", async () => {
    const t = await createTenant("ml-accept", "growth");
    const { token } = await invite(t, "fresh@ml-accept.test", "member");
    const userId = await newUser("fresh@ml-accept.test");

    const before = await memberRepo.countActiveMembers(t.org.id);
    const member = await invitationService.acceptInvitation(userId, { token });

    expect(member.status).toBe("active");
    expect(member.archivedAt).toBeNull();
    await expect(memberService.resolveActor(userId, t.org.id)).resolves.toMatchObject({
      userId,
      orgId: t.org.id,
      role: "member",
    });
    await expect(memberRepo.countActiveMembers(t.org.id)).resolves.toBe(before + 1);
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(0);
  });

  it("works for fourteen days from sending and not after", async () => {
    const t = await createTenant("ml-expiry", "growth");
    const early = await invite(t, "early@ml-expiry.test");
    const late = await invite(t, "late@ml-expiry.test");
    const earlyUser = await newUser("early@ml-expiry.test");
    const lateUser = await newUser("late@ml-expiry.test");

    at(13 * DAY + 23 * 60 * 60 * 1000);
    await expect(invitationService.acceptInvitation(earlyUser, { token: early.token })).resolves.toMatchObject({
      userId: earlyUser,
    });

    at(14 * DAY + 60 * 60 * 1000);
    await expect(invitationService.acceptInvitation(lateUser, { token: late.token })).rejects.toThrow(/expired/i);
    await expect(memberRepo.findMember(t.org.id, lateUser)).resolves.toBeNull();
  });

  it("is refused for any account other than the invited address, and stays pending for the right one", async () => {
    const t = await createTenant("ml-wrong-account", "growth");
    const { token, invitation } = await invite(t, "intended@ml-wrong-account.test");
    const stranger = await newUser("stranger@ml-wrong-account.test");
    const intended = await newUser("intended@ml-wrong-account.test");

    await expect(invitationService.acceptInvitation(stranger, { token })).rejects.toThrow();
    await expect(memberRepo.findMember(t.org.id, stranger)).resolves.toBeNull();
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(1);
    const still = await invitationRepo.findInvitationByTokenHash(hashToken(token));
    expect(still?.id).toBe(invitation.id);
    expect(still?.acceptedAt).toBeNull();

    await expect(invitationService.acceptInvitation(intended, { token })).resolves.toMatchObject({
      userId: intended,
    });
  });

  it("matches the invited address without regard to letter case", async () => {
    const t = await createTenant("ml-case", "growth");
    const { token } = await invite(t, "Casey.Jones@ML-Case.test", "viewer");
    const userId = await newUser("casey.jones@ml-case.test");

    await expect(invitationService.acceptInvitation(userId, { token })).resolves.toMatchObject({
      userId,
      role: "viewer",
    });
  });

  it("is refused once the workspace has been deleted", async () => {
    const t = await createTenant("ml-deleted", "growth");
    const { token } = await invite(t, "late@ml-deleted.test");
    const userId = await newUser("late@ml-deleted.test");

    await organizationService.deleteOrganization(t.actors.owner, {
      orgId: t.org.id,
      confirmSlug: t.org.slug,
    });

    await expect(invitationService.acceptInvitation(userId, { token })).rejects.toThrow();
    await expect(memberRepo.findMember(t.org.id, userId)).resolves.toBeNull();
  });

  it("uses an invitation up: a second acceptance is refused", async () => {
    const t = await createTenant("ml-twice", "growth");
    const { token } = await invite(t, "once@ml-twice.test");
    const userId = await newUser("once@ml-twice.test");

    await invitationService.acceptInvitation(userId, { token });
    await expect(invitationService.acceptInvitation(userId, { token })).rejects.toThrow(/already/i);
    await expect(memberRepo.countActiveMembers(t.org.id)).resolves.toBe(5);
  });
});

describe("seats held by invitations", () => {
  it("counts only pending invitations: expired ones release their seat", async () => {
    // starter: 10 seats, 4 taken by the fixture members.
    const t = await createTenant("ml-seats-expiry", "starter");
    await seedPending(t, 5, "p");

    await expect(invite(t, "ninth@ml-seats-expiry.test")).resolves.toBeDefined();
    await expect(invite(t, "eleventh@ml-seats-expiry.test")).rejects.toThrow(/seats/i);

    at(15 * DAY);
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(0);
    await expect(invite(t, "eleventh@ml-seats-expiry.test")).resolves.toBeDefined();
  });

  it("releases the seat of a revoked invitation", async () => {
    const t = await createTenant("ml-seats-revoke", "starter");
    await seedPending(t, 5, "q");
    const { invitation } = await invite(t, "tenth@ml-seats-revoke.test");

    await expect(invite(t, "overflow@ml-seats-revoke.test")).rejects.toThrow(/seats/i);

    await invitationService.revokeInvitation(t.actors.admin, invitation.id);
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(5);
    await expect(invite(t, "overflow@ml-seats-revoke.test")).resolves.toBeDefined();
  });

  it("refuses a batch that names the same address twice, creating nothing", async () => {
    const t = await createTenant("ml-batch-dup", "growth");

    await expect(
      invitationService.inviteMembers(t.actors.admin, {
        orgId: t.org.id,
        invites: [
          { email: "solo@ml-batch-dup.test", role: "member" },
          { email: "twin@ml-batch-dup.test", role: "member" },
          { email: "Twin@ML-Batch-Dup.test", role: "viewer" },
        ],
      }),
    ).rejects.toThrow();

    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(0);
  });

  it("refuses an address that already has a pending invitation, until that one expires", async () => {
    const t = await createTenant("ml-pending-dup", "growth");
    await invite(t, "again@ml-pending-dup.test");

    await expect(invite(t, "Again@ML-Pending-Dup.test", "admin")).rejects.toThrow();
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(1);

    at(15 * DAY);
    await expect(invite(t, "again@ml-pending-dup.test", "admin")).resolves.toBeDefined();
  });

  it("refuses an address that belongs to a current member, but not to a removed one", async () => {
    const t = await createTenant("ml-member-dup", "growth");

    await expect(invite(t, "Viewer@ML-Member-Dup.test")).rejects.toThrow();
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(0);

    await removeUser(t, t.userIds.viewer);
    await expect(invite(t, "viewer@ml-member-dup.test", "admin")).resolves.toMatchObject({
      invitation: { role: "admin" },
    });
  });
});

describe("re-sending an invitation", () => {
  it("keeps the role, kills the old link and starts a fresh fourteen days", async () => {
    const t = await createTenant("ml-resend", "growth");
    const first = await invite(t, "resend@ml-resend.test", "admin");
    const userId = await newUser("resend@ml-resend.test");

    at(5 * DAY);
    const second = await invitationService.resendInvitation(t.actors.admin, first.invitation.id);
    const secondToken = minted.at(-1) ?? "";
    expect(second.role).toBe("admin");
    expect(second.email).toBe("resend@ml-resend.test");
    await expect(invitationRepo.countPendingInvitations(t.org.id)).resolves.toBe(1);

    await expect(invitationService.acceptInvitation(userId, { token: first.token })).rejects.toThrow(/revoked/i);

    // 18 days after the original send, 13 after the re-send: still valid.
    at(18 * DAY);
    await expect(invitationService.acceptInvitation(userId, { token: secondToken })).resolves.toMatchObject({
      userId,
      role: "admin",
    });
  });

  it("works for an invitation that has already expired", async () => {
    const t = await createTenant("ml-resend-expired", "growth");
    const first = await invite(t, "slow@ml-resend-expired.test", "viewer");
    const userId = await newUser("slow@ml-resend-expired.test");

    at(20 * DAY);
    const second = await invitationService.resendInvitation(t.actors.admin, first.invitation.id);
    const secondToken = minted.at(-1) ?? "";
    expect(second.role).toBe("viewer");

    at(21 * DAY);
    await expect(invitationService.acceptInvitation(userId, { token: secondToken })).resolves.toMatchObject({
      userId,
      role: "viewer",
    });
  });
});

describe("a former member rejoining", () => {
  it("comes back on the same membership with the new role, join date and inviter", async () => {
    const t = await createTenant("ml-rejoin", "growth");
    const original = await memberRepo.findMember(t.org.id, t.userIds.viewer);
    if (!original) throw new Error("fixture viewer missing");

    await removeUser(t, t.userIds.viewer);
    await expect(memberRepo.findMember(t.org.id, t.userIds.viewer)).resolves.toBeNull();
    await expect(memberRepo.countActiveMembers(t.org.id)).resolves.toBe(3);

    const { token } = await invite(t, "viewer@ml-rejoin.test", "admin");
    const joined = capture("member.joined");
    const ownerBefore = await countNotifications(t, t.userIds.owner, "member_joined");

    at(2 * DAY);
    const member = await invitationService.acceptInvitation(t.userIds.viewer, { token });
    joined.off();

    expect(member.id).toBe(original.id);
    expect(member).toMatchObject({
      userId: t.userIds.viewer,
      role: "admin",
      status: "active",
      archivedAt: null,
      invitedBy: t.userIds.admin,
      joinedAt: toIsoTimestamp(new Date(T0.getTime() + 2 * DAY)),
    });

    const page = await memberRepo.listMembers({
      orgId: t.org.id,
      query: "viewer@ml-rejoin.test",
      limit: 25,
      cursor: null,
    });
    expect(page.items.map((row) => row.id)).toEqual([original.id]);
    expect(page.items[0]?.role).toBe("admin");
    await expect(memberRepo.countActiveMembers(t.org.id)).resolves.toBe(4);
    await expect(memberService.resolveActor(t.userIds.viewer, t.org.id)).resolves.toMatchObject({ role: "admin" });

    expect(joined.seen).toHaveLength(1);
    expect(joined.seen[0]).toMatchObject({ memberId: original.id, userId: t.userIds.viewer, role: "admin" });
    await expect(countNotifications(t, t.userIds.owner, "member_joined")).resolves.toBe(ownerBefore + 1);
  });

  it("keeps the seat counters in step through removal and rejoining", async () => {
    const t = await createTenant("ml-counters", "growth");
    await usageService.recomputeUsage(t.org.id);
    await expect(usageService.getUsage(t.actors.owner, t.org.id)).resolves.toMatchObject({ seatsUsed: 4 });

    await removeUser(t, t.userIds.member);
    await expect(usageService.getUsage(t.actors.owner, t.org.id)).resolves.toMatchObject({ seatsUsed: 3 });

    const { token } = await invite(t, "member@ml-counters.test", "member");
    await invitationService.acceptInvitation(t.userIds.member, { token });

    const usage = await usageService.getUsage(t.actors.owner, t.org.id);
    expect(usage.seatsUsed).toBe(4);
    await expect(memberRepo.countActiveMembers(t.org.id)).resolves.toBe(usage.seatsUsed);
  });
});

describe("a removed member is detached", () => {
  async function commentEvent(t: Tenant, issueId: string, mentioned: readonly UserId[], n: number) {
    await emit("comment.created", {
      orgId: t.org.id,
      actorId: t.userIds.admin,
      occurredAt: toIsoTimestamp(new Date()),
      commentId: `cmt-${t.org.slug}-${n}` as CommentId,
      issueId: issueId as never,
      mentionedUserIds: mentioned,
    });
  }

  it("gets no notifications while removed, and gets them again after rejoining", async () => {
    const t = await createTenant("ml-notify", "growth");
    const issue = await issueService.createIssue(
      t.actors.member,
      issueInput(t.org.id, t.project.id, { title: "Watched", assigneeId: t.userIds.viewer }),
    );

    await commentEvent(t, issue.id, [t.userIds.viewer], 1);
    await expect(countNotifications(t, t.userIds.viewer, "comment_created")).resolves.toBe(1);
    await expect(countNotifications(t, t.userIds.viewer, "comment_mention")).resolves.toBe(1);

    await removeUser(t, t.userIds.viewer);
    await commentEvent(t, issue.id, [t.userIds.viewer], 2);
    await expect(countNotifications(t, t.userIds.viewer, "comment_created")).resolves.toBe(1);
    await expect(countNotifications(t, t.userIds.viewer, "comment_mention")).resolves.toBe(1);
    // The author is still a member and still hears about it.
    await expect(countNotifications(t, t.userIds.member, "comment_created")).resolves.toBe(2);

    const { token } = await invite(t, "viewer@ml-notify.test", "viewer");
    await invitationService.acceptInvitation(t.userIds.viewer, { token });
    await commentEvent(t, issue.id, [t.userIds.viewer], 3);
    await expect(countNotifications(t, t.userIds.viewer, "comment_created")).resolves.toBe(2);
    await expect(countNotifications(t, t.userIds.viewer, "comment_mention")).resolves.toBe(2);
  });

  it("is no longer a digest recipient", async () => {
    const t = await createTenant("ml-digest", "growth");
    for (const userId of [t.userIds.admin, t.userIds.viewer]) {
      await preferenceRepo.upsertPreference({
        orgId: t.org.id,
        userId,
        kind: "comment_created",
        inApp: true,
        email: true,
        digestOnly: true,
      });
    }
    expect([...(await listDigestRecipients(t.org.id))].sort()).toEqual(
      [t.userIds.admin, t.userIds.viewer].sort(),
    );

    await removeUser(t, t.userIds.viewer);
    expect(await listDigestRecipients(t.org.id)).toEqual([t.userIds.admin]);
  });

  it("no longer has a session defaulting to that workspace, while other sessions and members are untouched", async () => {
    const a = await createTenant("ml-session-a", "growth");
    const b = await createTenant("ml-session-b", "growth");
    await memberRepo.insertMember(b.org.id, a.userIds.viewer, "member", null);

    const expiresAt = toIsoTimestamp(new Date(T0.getTime() + 30 * DAY));
    async function pinned(userId: UserId, token: string, orgId: typeof a.org.id): Promise<string> {
      await sessionRepo.createSession(userId, hashToken(token), expiresAt);
      const row = getDb().select().from(sessions).where(eq(sessions.tokenHash, hashToken(token))).get();
      if (!row) throw new Error("session row missing");
      await sessionRepo.setActiveOrg(row.id as SessionId, orgId);
      return token;
    }

    const viewerOnA = await pinned(a.userIds.viewer, "viewer-on-a".padEnd(32, "x"), a.org.id);
    const viewerOnB = await pinned(a.userIds.viewer, "viewer-on-b".padEnd(32, "x"), b.org.id);
    const adminOnA = await pinned(a.userIds.admin, "admin-on-a".padEnd(32, "x"), a.org.id);

    await removeUser(a, a.userIds.viewer);

    await expect(sessionRepo.findSessionByTokenHash(hashToken(viewerOnA))).resolves.toMatchObject({
      activeOrgId: null,
    });
    await expect(sessionRepo.findSessionByTokenHash(hashToken(viewerOnB))).resolves.toMatchObject({
      activeOrgId: b.org.id,
    });
    await expect(sessionRepo.findSessionByTokenHash(hashToken(adminOnA))).resolves.toMatchObject({
      activeOrgId: a.org.id,
    });

    // Deleting a workspace un-pins everyone who still defaulted to it.
    await organizationService.deleteOrganization(a.actors.owner, { orgId: a.org.id, confirmSlug: a.org.slug });
    await expect(sessionRepo.findSessionByTokenHash(hashToken(adminOnA))).resolves.toMatchObject({
      activeOrgId: null,
    });
    await expect(sessionRepo.findSessionByTokenHash(hashToken(viewerOnB))).resolves.toMatchObject({
      activeOrgId: b.org.id,
    });
  });
});

describe("roles carried by invitations", () => {
  it("grants exactly the invited role, for every invitable role", async () => {
    const t = await createTenant("ml-roles", "growth");
    const roles: readonly ("admin" | "member" | "viewer")[] = ["admin", "member", "viewer"];
    const granted: Role[] = [];

    for (const role of roles) {
      const { token } = await invite(t, `${role}2@ml-roles.test`, role);
      const userId = await newUser(`${role}2@ml-roles.test`);
      const member = await invitationService.acceptInvitation(userId, { token });
      granted.push(member.role);
    }

    expect(granted).toEqual(roles);
  });
});
