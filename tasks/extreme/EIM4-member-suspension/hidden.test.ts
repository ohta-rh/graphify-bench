/**
 * EIM4 — members can be suspended and reinstated.
 *
 * A suspended member keeps their row, role and seat but cannot act, cannot be
 * notified, mentioned or assigned, and does not keep the workspace ownable.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { activityFilterSchema } from "@/schemas/activity";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as memberRepo from "@/server/repositories/member-repository";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import { listActivity, registerActivityListeners } from "@/server/services/activity-service";
import * as commentService from "@/server/services/comment-service";
import * as emailService from "@/server/services/email-service";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import {
  MemberSuspendedError,
  reinstateMember,
  removeMember,
  resolveActor,
  suspendMember,
  updateMemberRole,
} from "@/server/services/member-service";
import { listNotifications, notify } from "@/server/services/notification-service";
import { listOrganizationsForUser } from "@/server/services/organization-service";
import { resolveActorForOrg, switchActiveOrg } from "@/server/services/session-service";
import { recomputeUsage } from "@/server/services/usage-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IsoTimestamp, MemberId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Actor, Member, Role, SessionPrincipal } from "@/types/member";
import type { Notification, NotificationKind } from "@/types/notification";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

const UNKNOWN_MEMBER = "01HZZZQQQQQQQQQQQQQQQQQQQQ" as MemberId;

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function memberOf(tenant: Tenant, role: Role): Promise<Member> {
  const member = await memberRepo.findMember(tenant.org.id, tenant.userIds[role]);
  if (!member) throw new Error(`fixture ${role} missing`);
  return member;
}

async function makeWorld(slug: string, plan: "growth" | "starter" = "growth"): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  await usageRepo.recomputeUsage(tenant.org.id);
  return tenant;
}

async function inbox(
  tenant: Tenant,
  recipientId: UserId,
  kind: NotificationKind,
): Promise<readonly Notification[]> {
  const page = await listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    kind: [kind],
    limit: 100,
    cursor: null,
  });
  return page.items;
}

async function at<T>(instant: string, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(instant));
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

function principalFor(tenant: Tenant, role: Role): SessionPrincipal {
  return {
    userId: tenant.userIds[role],
    email: `${role}@${tenant.org.slug}.test`,
    activeOrgId: null,
    expiresAt: "2030-01-01T00:00:00.000Z" as IsoTimestamp,
  };
}

function cell(html: string, key: string): string | null {
  const match = html.match(new RegExp(`<td>${key}</td><td>([^<]*)</td>`));
  return match?.[1] ?? null;
}

function mailsTo(
  spy: { mock: { calls: ReadonlyArray<ReadonlyArray<{ to: string; html: string }>> } },
  to: string,
): string[] {
  return spy.mock.calls
    .map((call) => call[0])
    .filter((message): message is { to: string; html: string } => message?.to === to)
    .map((message) => message.html);
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

beforeEach(() => {
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

describe("EIM4 member suspension", () => {
  it("suspends and reinstates a member, publishing each transition exactly once", async () => {
    const tenant = await makeWorld("eim4-basic");
    const target = await memberOf(tenant, "member");
    const suspended = capture("member.suspended");
    const reinstated = capture("member.reinstated");
    const input = { orgId: tenant.org.id, memberId: target.id };

    const first = await suspendMember(tenant.actors.admin, input);
    expect(first.status).toBe("suspended");
    expect(first.role).toBe("member");
    expect(first.archivedAt).toBeNull();

    const again = await suspendMember(tenant.actors.admin, input);
    expect(again.status).toBe("suspended");
    expect(suspended).toHaveLength(1);
    expect(suspended[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.admin,
      memberId: target.id,
      userId: tenant.userIds.member,
    });

    const back = await reinstateMember(tenant.actors.owner, input);
    expect(back.status).toBe("active");
    await reinstateMember(tenant.actors.owner, input);
    expect(reinstated).toHaveLength(1);
    expect(reinstated[0]).toMatchObject({ memberId: target.id, userId: tenant.userIds.member });
    expect(suspended).toHaveLength(1);

    const stored = await memberRepo.findMember(tenant.org.id, tenant.userIds.member);
    expect(stored?.status).toBe("active");
  });

  it("guards suspension like a removal: tenant, existence and permission", async () => {
    const tenant = await makeWorld("eim4-guards");
    const stranger = await createTenant("eim4-guards-other", "growth");
    const target = await memberOf(tenant, "viewer");
    const input = { orgId: tenant.org.id, memberId: target.id };

    await expect(suspendMember(stranger.actors.owner, input)).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: UNKNOWN_MEMBER }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(suspendMember(tenant.actors.member, input)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(suspendMember(tenant.actors.viewer, input)).rejects.toBeInstanceOf(PermissionDeniedError);

    const removed = await memberOf(tenant, "member");
    await removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: removed.id });
    await expect(
      suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: removed.id }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: removed.id }),
    ).rejects.toBeInstanceOf(NotFoundError);

    const still = await memberRepo.findMember(tenant.org.id, tenant.userIds.viewer);
    expect(still?.status).toBe("active");
  });

  it("refuses self-suspension and targets who outrank the actor", async () => {
    const tenant = await makeWorld("eim4-rank");
    const admin = await memberOf(tenant, "admin");
    const owner = await memberOf(tenant, "owner");
    const seen = capture("member.suspended");

    await expect(
      suspendMember(tenant.actors.admin, { orgId: tenant.org.id, memberId: admin.id }),
    ).rejects.toThrow();
    await expect(
      suspendMember(tenant.actors.admin, { orgId: tenant.org.id, memberId: owner.id }),
    ).rejects.toThrow();
    expect((await memberOf(tenant, "owner")).status).toBe("active");
    expect((await memberOf(tenant, "admin")).status).toBe("active");
    expect(seen).toHaveLength(0);

    // An owner may suspend an admin; an admin may suspend a peer admin.
    const suspendedAdmin = await suspendMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: admin.id,
    });
    expect(suspendedAdmin.status).toBe("suspended");
    expect(seen).toHaveLength(1);
  });

  it("guards reinstatement the same way as suspension", async () => {
    const tenant = await makeWorld("eim4-reinstate-guards");
    const stranger = await createTenant("eim4-reinstate-other", "growth");
    const admin = await memberOf(tenant, "admin");
    const viewer = await memberOf(tenant, "viewer");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: admin.id });
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: viewer.id });
    const seen = capture("member.reinstated");

    await expect(
      reinstateMember(stranger.actors.owner, { orgId: tenant.org.id, memberId: viewer.id }),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      reinstateMember(tenant.actors.member, { orgId: tenant.org.id, memberId: viewer.id }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    // A second admin may reinstate a peer, but nobody may reinstate someone above them.
    const secondAdmin = await memberOf(tenant, "member");
    await updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: secondAdmin.id,
      role: "admin",
    });
    const secondAdminActor = await resolveActor(tenant.userIds.member, tenant.org.id);
    if (!secondAdminActor) throw new Error("promoted admin should resolve");
    expect(secondAdminActor.role).toBe("admin");

    const owner = await memberOf(tenant, "owner");
    await expect(
      reinstateMember(secondAdminActor, { orgId: tenant.org.id, memberId: owner.id }),
    ).rejects.toThrow();
    expect(seen).toHaveLength(0);

    const back = await reinstateMember(secondAdminActor, { orgId: tenant.org.id, memberId: admin.id });
    expect(back.status).toBe("active");
    expect(seen).toHaveLength(1);
  });

  it("never suspends the last owner who is not already suspended", async () => {
    const tenant = await makeWorld("eim4-last-owner");
    const owner = await memberOf(tenant, "owner");
    const admin = await memberOf(tenant, "admin");
    const seen = capture("member.suspended");

    // A second owner is needed even to try: the sole owner outranks everyone
    // and nobody may suspend themselves.
    await updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: admin.id,
      role: "owner",
    });
    const secondOwner = await resolveActor(tenant.userIds.admin, tenant.org.id);
    if (!secondOwner) throw new Error("second owner should resolve");

    await suspendMember(secondOwner, { orgId: tenant.org.id, memberId: owner.id });
    expect((await memberOf(tenant, "owner")).status).toBe("suspended");
    expect(seen).toHaveLength(1);

    // Now the second owner is the only active one: their suspension is refused.
    const remaining = await reinstateMember(secondOwner, { orgId: tenant.org.id, memberId: owner.id });
    expect(remaining.status).toBe("active");
    const originalOwner = await resolveActor(tenant.userIds.owner, tenant.org.id);
    if (!originalOwner) throw new Error("original owner should resolve");
    await suspendMember(originalOwner, { orgId: tenant.org.id, memberId: admin.id });
    await expect(
      suspendMember(secondOwner, { orgId: tenant.org.id, memberId: owner.id }),
    ).rejects.toThrow(/owner/i);
    expect((await memberOf(tenant, "owner")).status).toBe("active");
  });

  it("does not count a suspended owner when protecting the last owner from demotion or removal", async () => {
    const tenant = await makeWorld("eim4-owner-protection");
    const owner = await memberOf(tenant, "owner");
    const admin = await memberOf(tenant, "admin");

    await updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: admin.id,
      role: "owner",
    });
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: admin.id });

    await expect(
      updateMemberRole(tenant.actors.owner, { orgId: tenant.org.id, memberId: owner.id, role: "admin" }),
    ).rejects.toThrow(/owner/i);
    await expect(
      removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: owner.id }),
    ).rejects.toThrow(/owner/i);
    expect((await memberOf(tenant, "owner")).role).toBe("owner");
    expect((await memberOf(tenant, "owner")).archivedAt).toBeNull();

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: admin.id });
    const demoted = await updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: owner.id,
      role: "admin",
    });
    expect(demoted.role).toBe("admin");
  });

  it("records both transitions in the audit log and accepts them in the audit filter", async () => {
    const tenant = await makeWorld("eim4-audit");
    detachers.push(registerActivityListeners());
    const target = await memberOf(tenant, "viewer");

    await suspendMember(tenant.actors.admin, { orgId: tenant.org.id, memberId: target.id });
    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    const suspendedRows = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      action: ["member.suspended"],
      limit: 25,
      cursor: null,
    });
    expect(suspendedRows.items).toHaveLength(1);
    expect(suspendedRows.items[0]).toMatchObject({
      action: "member.suspended",
      actorId: tenant.userIds.admin,
      subjectKind: "member",
      subjectId: target.id,
    });

    const reinstatedRows = await listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      action: ["member.reinstated"],
      limit: 25,
      cursor: null,
    });
    expect(reinstatedRows.items).toHaveLength(1);
    expect(reinstatedRows.items[0]).toMatchObject({
      actorId: tenant.userIds.owner,
      subjectKind: "member",
      subjectId: target.id,
    });

    expect(
      activityFilterSchema.safeParse({
        orgId: tenant.org.id,
        action: ["member.suspended", "member.reinstated"],
        limit: 25,
        cursor: null,
      }).success,
    ).toBe(true);
  });

  it("keeps the suspended member's seat in every seat count", async () => {
    const tenant = await makeWorld("eim4-seats", "starter");
    const fillers: Member[] = [];
    for (let i = 0; i < 6; i += 1) {
      const user = await userRepo.insertUser({
        email: `filler${i}@eim4-seats.test`,
        name: `Filler ${i}`,
        passwordHash: "seed",
      });
      fillers.push(await memberRepo.insertMember(tenant.org.id, user.id, "member", null));
    }
    await recomputeUsage(tenant.org.id);
    expect((await usageRepo.getUsage(tenant.org.id)).seatsUsed).toBe(10);

    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: fillers[0]!.id });

    expect((await usageRepo.getUsage(tenant.org.id)).seatsUsed).toBe(10);
    await expect(memberRepo.countActiveMembers(tenant.org.id)).resolves.toBe(10);
    expect((await recomputeUsage(tenant.org.id)).seatsUsed).toBe(10);
    await expect(
      invitationService.inviteMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        email: "eleventh@eim4-seats.test",
        role: "member",
      }),
    ).rejects.toThrow(/seats/i);

    // Removal still frees the seat.
    await removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: fillers[1]!.id });
    await expect(memberRepo.countActiveMembers(tenant.org.id)).resolves.toBe(9);
    expect((await recomputeUsage(tenant.org.id)).seatsUsed).toBe(9);
    await expect(
      invitationService.inviteMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        email: "tenth@eim4-seats.test",
        role: "member",
      }),
    ).resolves.toMatchObject({ email: "tenth@eim4-seats.test" });
  });

  it("locks a suspended member out of the workspace until reinstated", async () => {
    const tenant = await makeWorld("eim4-access");
    const target = await memberOf(tenant, "member");
    const principal = principalFor(tenant, "member");

    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    await expect(resolveActor(tenant.userIds.member, tenant.org.id)).resolves.toBeNull();
    await expect(resolveActorForOrg(principal, tenant.org.slug)).resolves.toBeNull();
    await expect(switchActiveOrg(principal, { orgId: tenant.org.id })).rejects.toThrow();
    const listed = await listOrganizationsForUser(tenant.userIds.member);
    expect(listed.map((org) => org.id)).not.toContain(tenant.org.id);

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    const actor = await resolveActor(tenant.userIds.member, tenant.org.id);
    expect(actor).toEqual<Actor>({ userId: tenant.userIds.member, orgId: tenant.org.id, role: "member" });
    await expect(resolveActorForOrg(principal, tenant.org.slug)).resolves.toMatchObject({ role: "member" });
    const relisted = await listOrganizationsForUser(tenant.userIds.member);
    expect(relisted.map((org) => org.id)).toContain(tenant.org.id);
  });

  it("creates no notification of any kind for a suspended member", async () => {
    const tenant = await makeWorld("eim4-notify");
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Member's issue", assigneeId: tenant.userIds.viewer }),
    );
    const target = await memberOf(tenant, "member");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Progress update",
      parentId: null,
      mentionedUserIds: [],
    });
    expect(await inbox(tenant, tenant.userIds.member, "comment_created")).toHaveLength(0);
    expect(await inbox(tenant, tenant.userIds.viewer, "comment_created")).toHaveLength(1);

    const direct = await notify(
      tenant.org.id,
      "member_joined",
      [tenant.userIds.member, tenant.userIds.viewer],
      { title: "t", body: "b", href: "/settings/members", actorId: null },
    );
    expect(direct.map((row) => row.recipientId)).toEqual([tenant.userIds.viewer]);
    expect(await inbox(tenant, tenant.userIds.member, "member_joined")).toHaveLength(0);

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    const afterwards = await notify(tenant.org.id, "member_joined", [tenant.userIds.member], {
      title: "t",
      body: "b",
      href: "/settings/members",
      actorId: null,
    });
    expect(afterwards).toHaveLength(1);
    expect(afterwards[0]?.channels).toEqual(["in_app", "email"]);
  });

  it("sends no overdue alert to a suspended assignee", async () => {
    const tenant = await makeWorld("eim4-overdue");
    const due = "2026-01-01T00:00:00.000Z";
    const memberIssue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late for member",
        assigneeId: tenant.userIds.member,
        dueAt: due,
      }),
    );
    await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late for viewer",
        assigneeId: tenant.userIds.viewer,
        dueAt: due,
      }),
    );
    const target = await memberOf(tenant, "member");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    await runOverdueIssueJob(new Date("2026-06-01T07:00:00.000Z"));

    // The assignment itself is untouched; only the alert is withheld.
    const stored = await issueService.getIssue(tenant.actors.owner, tenant.org.id, memberIssue.id);
    expect(stored.issue.assigneeId).toBe(tenant.userIds.member);
    expect(await inbox(tenant, tenant.userIds.member, "issue_overdue")).toHaveLength(0);
    expect(await inbox(tenant, tenant.userIds.viewer, "issue_overdue")).toHaveLength(1);
  });

  it("skips a suspended member in the digest and catches them up once reinstated", async () => {
    const tenant = await makeWorld("eim4-digest");
    await orgRepo.updateOrg(tenant.org.id, { orgId: tenant.org.id, settings: { digestHourUtc: 6 } });
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.member,
      kind: "issue_due_soon",
      inApp: true,
      email: true,
      digestOnly: true,
    });
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.viewer,
      kind: "issue_due_soon",
      inApp: true,
      email: true,
      digestOnly: true,
    });
    const email = "member@eim4-digest.test";

    await at("2026-06-02T05:00:00.000Z", async () => {
      await notify(tenant.org.id, "comment_created", [tenant.userIds.member, tenant.userIds.viewer], {
        title: "Before the suspension",
        body: "b",
        href: "/issues/x",
        actorId: null,
      });
    });
    const target = await memberOf(tenant, "member");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-06-02T06:00:00.000Z"));

    expect(mailsTo(sendSpy, email)).toHaveLength(0);
    expect(mailsTo(sendSpy, "viewer@eim4-digest.test")).toHaveLength(1);
    const unread = await notificationRepo.listUnreadSince(
      tenant.org.id,
      tenant.userIds.member,
      "2026-06-01T00:00:00.000Z" as IsoTimestamp,
    );
    expect(unread.map((row) => row.title)).toEqual(["Before the suspension"]);

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    sendSpy.mockClear();
    await runDigestEmailJob(new Date("2026-06-02T06:30:00.000Z"));

    const caughtUp = mailsTo(sendSpy, email);
    expect(caughtUp).toHaveLength(1);
    expect(cell(caughtUp[0] ?? "", "entryCount")).toBe("1");
    expect(cell(caughtUp[0] ?? "", "headline")).toBe("Before the suspension");
    expect(mailsTo(sendSpy, "viewer@eim4-digest.test")).toHaveLength(0);
  });

  it("drops a suspended member from mentions, whether typed or supplied by the client", async () => {
    const tenant = await makeWorld("eim4-mentions");
    const issue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Mention target" }),
    );
    const target = await memberOf(tenant, "member");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    const seen = capture("comment.created");

    const comment = await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Ping @member and @viewer",
      parentId: null,
      mentionedUserIds: [tenant.userIds.member],
    });

    expect(comment.mentionedUserIds).toEqual([tenant.userIds.viewer]);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.mentionedUserIds).toEqual([tenant.userIds.viewer]);
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toHaveLength(0);
    expect(await inbox(tenant, tenant.userIds.viewer, "comment_mention")).toHaveLength(1);

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    const later = await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Welcome back @member",
      parentId: null,
      mentionedUserIds: [],
    });
    expect(later.mentionedUserIds).toEqual([tenant.userIds.member]);
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toHaveLength(1);
  });

  it("refuses to hand new work to a suspended member and writes nothing", async () => {
    const tenant = await makeWorld("eim4-assign");
    const existing = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Assigned later", assigneeId: tenant.userIds.viewer }),
    );
    const target = await memberOf(tenant, "member");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    const created = capture("issue.created");
    const assigned = capture("issue.assigned");
    const updated = capture("issue.updated");

    const createError: unknown = await issueService
      .createIssue(
        tenant.actors.admin,
        issueInput(tenant.org.id, tenant.project.id, { title: "For a suspended member", assigneeId: tenant.userIds.member }),
      )
      .catch((error: unknown) => error);
    expect(createError).toBeInstanceOf(MemberSuspendedError);
    expect((createError as MemberSuspendedError).code).toBe("conflict");

    await expect(
      issueService.assignIssue(tenant.actors.admin, {
        orgId: tenant.org.id,
        issueId: existing.id,
        assigneeId: tenant.userIds.member,
      }),
    ).rejects.toBeInstanceOf(MemberSuspendedError);

    const page = await issueService.listIssues(tenant.actors.owner, {
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });
    expect(page.total).toBe(1);
    const stored = await issueService.getIssue(tenant.actors.owner, tenant.org.id, existing.id);
    expect(stored.issue.assigneeId).toBe(tenant.userIds.viewer);
    expect(created).toHaveLength(0);
    expect(assigned).toHaveLength(0);
    expect(updated).toHaveLength(0);

    // Un-assigning and assigning to an active member still work.
    await issueService.assignIssue(tenant.actors.admin, { orgId: tenant.org.id, issueId: existing.id, assigneeId: null });
    expect(updated).toHaveLength(1);

    await reinstateMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    const reassigned = await issueService.assignIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: existing.id,
      assigneeId: tenant.userIds.member,
    });
    expect(reassigned.assigneeId).toBe(tenant.userIds.member);
    expect(assigned).toHaveLength(1);
    const fresh = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Now allowed", assigneeId: tenant.userIds.member }),
    );
    expect(fresh.assigneeId).toBe(tenant.userIds.member);
    expect(created).toHaveLength(1);
  });

  it("keeps existing assignments and lists the member with status suspended", async () => {
    const tenant = await makeWorld("eim4-list");
    const issue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Keeps its assignee", assigneeId: tenant.userIds.member }),
    );
    const target = await memberOf(tenant, "member");
    const viewer = await memberOf(tenant, "viewer");
    await suspendMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: target.id });
    await removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: viewer.id });

    const stored = await issueService.getIssue(tenant.actors.owner, tenant.org.id, issue.id);
    expect(stored.issue.assigneeId).toBe(tenant.userIds.member);

    const everyone = await memberRepo.listMembers({ orgId: tenant.org.id, limit: 25, cursor: null });
    const byUser = new Map(everyone.items.map((row) => [row.userId, row]));
    expect(byUser.get(tenant.userIds.member)?.status).toBe("suspended");
    expect(byUser.get(tenant.userIds.member)?.role).toBe("member");
    expect(byUser.has(tenant.userIds.viewer)).toBe(false);

    const suspendedOnly = await memberRepo.listMembers({
      orgId: tenant.org.id,
      status: "suspended",
      limit: 25,
      cursor: null,
    });
    expect(suspendedOnly.items.map((row) => row.userId)).toEqual([tenant.userIds.member]);
  });
});
