/**
 * EFX4 — former members.
 *
 * A removed member is gone for every purpose: no access, no notifications, no
 * digest, no assignments, no lead role, no further role changes; and when the
 * same person is invited back they return as the member the workspace knew.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { emit, subscribe } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as activityService from "@/server/services/activity-service";
import * as commentService from "@/server/services/comment-service";
import { listDigestRecipients } from "@/server/services/digest-service";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import * as notificationService from "@/server/services/notification-service";
import * as organizationService from "@/server/services/organization-service";
import * as projectService from "@/server/services/project-service";
import * as sessionService from "@/server/services/session-service";
import * as usageService from "@/server/services/usage-service";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CreateProjectInput } from "@/schemas/project";
import type { OrgId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Member, Role, SessionPrincipal } from "@/types/member";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];
let tokenCounter = 0;

const FAR_FUTURE = "2099-01-01T00:00:00.000Z";

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

function principalFor(userId: UserId): SessionPrincipal {
  return {
    userId,
    email: `${userId}@principal.test`,
    activeOrgId: null,
    expiresAt: toIsoTimestamp(FAR_FUTURE),
  };
}

async function memberOf(tenant: Tenant, role: Role): Promise<Member> {
  const page = await memberService.listMembers(tenant.actors.owner, {
    orgId: tenant.org.id,
    limit: 100,
    cursor: null,
  });
  const row = page.items.find((item) => item.userId === tenant.userIds[role]);
  if (!row) throw new Error(`fixture ${role} is not listed as a member`);
  return row;
}

async function remove(tenant: Tenant, role: Role): Promise<Member> {
  const target = await memberOf(tenant, role);
  return memberService.removeMember(tenant.actors.owner, {
    orgId: tenant.org.id,
    memberId: target.id,
  });
}

async function listedUserIds(tenant: Tenant): Promise<readonly UserId[]> {
  const page = await memberService.listMembers(tenant.actors.owner, {
    orgId: tenant.org.id,
    limit: 100,
    cursor: null,
  });
  return page.items.map((item) => item.userId);
}

async function notificationsFor(tenant: Tenant, recipientId: UserId) {
  return notificationService.listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    limit: 100,
    cursor: null,
  });
}

/** Mints a pending invitation whose raw token the test knows. */
async function invite(
  tenant: Tenant,
  email: string,
  role: "admin" | "member" | "viewer",
): Promise<string> {
  tokenCounter += 1;
  const raw = `efx4-token-${String(tokenCounter).padStart(4, "0")}`.padEnd(40, "x");
  await invitationRepo.insertInvitation(
    tenant.org.id,
    { orgId: tenant.org.id, email, role, expiresInDays: 14 },
    tenant.userIds.admin,
    hashToken(raw),
  );
  return raw;
}

function projectInput(
  orgId: OrgId,
  overrides: Partial<CreateProjectInput> = {},
): CreateProjectInput {
  return {
    orgId,
    name: "Led project",
    slug: "led-project",
    key: "LED",
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
    ...overrides,
  };
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.useRealTimers();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

describe("access ends with the membership", () => {
  let tenant: Tenant;

  beforeAll(async () => {
    tenant = await createTenant("efx4-access", "growth");
  });

  it("no longer resolves a signed-in session to an actor for that workspace", async () => {
    const principal = principalFor(tenant.userIds.viewer);
    await expect(
      sessionService.resolveActorForOrg(principal, tenant.org.slug),
    ).resolves.toMatchObject({ orgId: tenant.org.id, role: "viewer" });

    await remove(tenant, "viewer");

    await expect(
      sessionService.resolveActorForOrg(principal, tenant.org.slug),
    ).resolves.toBeNull();
    await expect(
      memberService.resolveActor(tenant.userIds.viewer, tenant.org.id),
    ).resolves.toBeNull();
  });

  it("refuses to switch a session into a workspace the person left", async () => {
    await remove(tenant, "member");

    await expect(
      sessionService.switchActiveOrg(principalFor(tenant.userIds.member), {
        orgId: tenant.org.id,
      }),
    ).rejects.toThrow();
    await expect(
      sessionService.switchActiveOrg(principalFor(tenant.userIds.admin), {
        orgId: tenant.org.id,
      }),
    ).resolves.toBeUndefined();
  });

  it("drops the person from the member list and the member count", async () => {
    const listed = await listedUserIds(tenant);
    expect(listed).not.toContain(tenant.userIds.viewer);
    expect(listed).not.toContain(tenant.userIds.member);
    expect(listed).toContain(tenant.userIds.admin);

    const summary = await organizationService.getOrganizationSummary(
      tenant.actors.owner,
      tenant.org.id,
    );
    expect(summary.memberCount).toBe(2);
  });
});

describe("a former member is not notified", () => {
  let tenant: Tenant;
  let other: Tenant;

  beforeAll(async () => {
    tenant = await createTenant("efx4-notify", "growth");
    other = await createTenant("efx4-notify-other", "growth");
    // The person who will leave `tenant` also belongs to `other`.
    await memberRepo.insertMember(other.org.id, tenant.userIds.member, "member", null);
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.member,
      kind: "comment_created",
      inApp: true,
      email: true,
      digestOnly: true,
    });
  });

  it("stops notifying the author of an issue once they have left", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Authored before leaving" }),
    );

    await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "still here",
      parentId: null,
      mentionedUserIds: [],
    });
    const before = await notificationsFor(tenant, tenant.userIds.member);
    expect(before.total).toBe(1);

    await remove(tenant, "member");

    await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "after they left",
      parentId: null,
      mentionedUserIds: [],
    });
    const after = await notificationsFor(tenant, tenant.userIds.member);
    expect(after.total).toBe(1);
  });

  it("writes nothing for a former member, whatever the kind", async () => {
    const rows = await notificationService.notify(
      tenant.org.id,
      "issue_assigned",
      [tenant.userIds.member, tenant.userIds.admin],
      { title: "t", body: "b", href: "/x", actorId: null },
    );
    expect(rows.map((row) => row.recipientId)).toEqual([tenant.userIds.admin]);

    await emit("issue.overdue", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date()),
      issueId: "01HZZZOVERDUEISSUE00000001" as never,
      projectId: tenant.project.id,
      dueAt: toIsoTimestamp("2026-01-01T00:00:00.000Z"),
      assigneeId: tenant.userIds.member,
    });
    const page = await notificationsFor(tenant, tenant.userIds.member);
    expect(page.items.map((row) => row.kind)).not.toContain("issue_overdue");
  });

  it("ignores mentions of a former member, including ones the client resolved", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, { title: "Mention target" }),
    );
    const comment = await commentService.createComment(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "ping @member and @viewer",
      parentId: null,
      mentionedUserIds: [tenant.userIds.member],
    });

    expect(comment.mentionedUserIds).toEqual([tenant.userIds.viewer]);
    const page = await notificationsFor(tenant, tenant.userIds.member);
    expect(page.items.map((row) => row.kind)).not.toContain("comment_mention");
  });

  it("leaves a former member off the digest", async () => {
    await expect(listDigestRecipients(tenant.org.id)).resolves.not.toContain(
      tenant.userIds.member,
    );
  });

  it("keeps notifying the same person in a workspace they still belong to", async () => {
    const rows = await notificationService.notify(
      other.org.id,
      "issue_assigned",
      [tenant.userIds.member],
      { title: "t", body: "b", href: "/x", actorId: null },
    );
    expect(rows).toHaveLength(1);
    await expect(
      sessionService.resolveActorForOrg(principalFor(tenant.userIds.member), other.org.slug),
    ).resolves.toMatchObject({ orgId: other.org.id });
  });
});

describe("work cannot point at a former member", () => {
  let tenant: Tenant;
  let stranger: Tenant;

  beforeAll(async () => {
    tenant = await createTenant("efx4-refs", "growth");
    stranger = await createTenant("efx4-refs-stranger", "growth");
    await remove(tenant, "viewer");
  });

  it("refuses to create an issue assigned to someone who left or never joined", async () => {
    const created = capture("issue.created");
    const before = await issueService.listIssues(tenant.actors.owner, {
      orgId: tenant.org.id,
      limit: 100,
      cursor: null,
    });

    await expect(
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, {
          title: "For a former member",
          assigneeId: tenant.userIds.viewer,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, {
          title: "For a stranger",
          assigneeId: stranger.userIds.owner,
        }),
      ),
    ).rejects.toThrow();

    const after = await issueService.listIssues(tenant.actors.owner, {
      orgId: tenant.org.id,
      limit: 100,
      cursor: null,
    });
    expect(after.total).toBe(before.total);
    expect(created).toHaveLength(0);
  });

  it("refuses to reassign an issue to someone who left", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Reassignment target",
        assigneeId: tenant.userIds.admin,
      }),
    );
    const assigned = capture("issue.assigned");

    await expect(
      issueService.assignIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        assigneeId: tenant.userIds.viewer,
      }),
    ).rejects.toThrow();

    const stored = await issueService.getIssue(tenant.actors.owner, tenant.org.id, issue.id);
    expect(stored.issue.assigneeId).toBe(tenant.userIds.admin);
    expect(assigned).toHaveLength(0);

    await expect(
      issueService.assignIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        assigneeId: tenant.userIds.member,
      }),
    ).resolves.toMatchObject({ assigneeId: tenant.userIds.member });
  });

  it("refuses a former member or a stranger as project lead", async () => {
    await expect(
      projectService.createProject(
        tenant.actors.admin,
        projectInput(tenant.org.id, {
          name: "Former lead",
          slug: "former-lead",
          key: "FLD",
          leadId: tenant.userIds.viewer,
        }),
      ),
    ).rejects.toThrow();
    await expect(
      projectService.createProject(
        tenant.actors.admin,
        projectInput(tenant.org.id, {
          name: "Stranger lead",
          slug: "stranger-lead",
          key: "SLD",
          leadId: stranger.userIds.admin,
        }),
      ),
    ).rejects.toThrow();

    await expect(
      projectService.updateProject(tenant.actors.admin, {
        orgId: tenant.org.id,
        projectId: tenant.project.id,
        leadId: tenant.userIds.viewer,
      }),
    ).rejects.toThrow();
    const stored = await projectService.getProject(
      tenant.actors.owner,
      tenant.org.id,
      tenant.project.slug,
    );
    expect(stored.project.leadId).toBe(tenant.userIds.owner);

    await expect(
      projectService.updateProject(tenant.actors.admin, {
        orgId: tenant.org.id,
        projectId: tenant.project.id,
        leadId: tenant.userIds.member,
      }),
    ).resolves.toMatchObject({ leadId: tenant.userIds.member });
  });

  it("unassigns their work and clears their lead role the moment they are removed", async () => {
    const led = await projectService.createProject(
      tenant.actors.admin,
      projectInput(tenant.org.id, {
        name: "Led by member",
        slug: "led-by-member",
        key: "LBM",
        leadId: tenant.userIds.member,
      }),
    );
    const mine = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Assigned to member",
        assigneeId: tenant.userIds.member,
      }),
    );
    const theirs = await issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Assigned to admin",
        assigneeId: tenant.userIds.admin,
      }),
    );
    const elsewhere = await issueService.createIssue(
      stranger.actors.admin,
      issueInput(stranger.org.id, stranger.project.id, {
        title: "Stranger's own",
        assigneeId: stranger.userIds.member,
      }),
    );

    await remove(tenant, "member");

    const mineAfter = await issueService.getIssue(tenant.actors.owner, tenant.org.id, mine.id);
    expect(mineAfter.issue.assigneeId).toBeNull();
    const theirsAfter = await issueService.getIssue(tenant.actors.owner, tenant.org.id, theirs.id);
    expect(theirsAfter.issue.assigneeId).toBe(tenant.userIds.admin);
    const elsewhereAfter = await issueService.getIssue(
      stranger.actors.owner,
      stranger.org.id,
      elsewhere.id,
    );
    expect(elsewhereAfter.issue.assigneeId).toBe(stranger.userIds.member);

    const ledAfter = await projectService.getProject(tenant.actors.owner, tenant.org.id, led.slug);
    expect(ledAfter.project.leadId).toBeNull();
    const platform = await projectService.getProject(
      tenant.actors.owner,
      tenant.org.id,
      tenant.project.slug,
    );
    expect(platform.project.leadId).toBeNull();
  });
});

describe("changing a former member", () => {
  let tenant: Tenant;

  beforeAll(async () => {
    tenant = await createTenant("efx4-change", "growth");
    await usageService.recomputeUsage(tenant.org.id);
  });

  it("reports a role change for someone who left as a conflict", async () => {
    const target = await memberOf(tenant, "member");
    await remove(tenant, "member");
    const changed = capture("member.role_changed");

    await expect(
      memberService.updateMemberRole(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: target.id,
        role: "admin",
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(changed).toHaveLength(0);
  });

  it("reports a second removal as a conflict and frees the seat only once", async () => {
    const target = await memberOf(tenant, "viewer");
    const removed = capture("member.removed");

    await memberService.removeMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: target.id,
    });
    await expect(
      memberService.removeMember(tenant.actors.owner, {
        orgId: tenant.org.id,
        memberId: target.id,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);

    expect(removed).toHaveLength(1);
    const usage = await usageService.getUsage(tenant.actors.owner, tenant.org.id);
    const summary = await organizationService.getOrganizationSummary(
      tenant.actors.owner,
      tenant.org.id,
    );
    expect(summary.memberCount).toBe(2);
    expect(usage.seatsUsed).toBe(2);
  });
});

describe("coming back", () => {
  let tenant: Tenant;
  let original: Member;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-01T09:00:00.000Z"));
    tenant = await createTenant("efx4-return", "growth");
    await usageService.recomputeUsage(tenant.org.id);

    original = await memberOf(tenant, "viewer");
    // Some history about this member before they leave.
    await memberService.updateMemberRole(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: original.id,
      role: "member",
    });
    vi.setSystemTime(new Date("2026-05-02T09:00:00.000Z"));
    await memberService.removeMember(tenant.actors.owner, {
      orgId: tenant.org.id,
      memberId: original.id,
    });
    vi.setSystemTime(new Date("2026-05-10T09:00:00.000Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("re-admits a former member as the member they were, with the invited role", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-05-10T09:00:00.000Z"));
    const joined = capture("member.joined");
    const token = await invite(tenant, `viewer@${tenant.org.slug}.test`, "admin");

    const rejoined = await invitationService.acceptInvitation(tenant.userIds.viewer, { token });

    expect(rejoined.id).toBe(original.id);
    expect(rejoined.userId).toBe(tenant.userIds.viewer);
    expect(rejoined.role).toBe("admin");
    expect(rejoined.status).toBe("active");
    expect(rejoined.archivedAt).toBeNull();
    expect(rejoined.joinedAt).toBe("2026-05-10T09:00:00.000Z");

    expect(joined).toHaveLength(1);
    expect(joined[0]).toMatchObject({ memberId: original.id, userId: tenant.userIds.viewer, role: "admin" });

    const listed = await listedUserIds(tenant);
    expect(listed.filter((id) => id === tenant.userIds.viewer)).toHaveLength(1);
    await expect(invitationRepo.countPendingInvitations(tenant.org.id)).resolves.toBe(0);
    await expect(
      invitationService.acceptInvitation(tenant.userIds.viewer, { token }),
    ).rejects.toThrow();
  });

  it("restores access, notifications and the seat exactly once", async () => {
    await expect(
      sessionService.resolveActorForOrg(principalFor(tenant.userIds.viewer), tenant.org.slug),
    ).resolves.toMatchObject({ orgId: tenant.org.id, role: "admin" });

    const rows = await notificationService.notify(
      tenant.org.id,
      "member_joined",
      [tenant.userIds.viewer],
      { title: "t", body: "b", href: "/x", actorId: null },
    );
    expect(rows).toHaveLength(1);

    const usage = await usageService.getUsage(tenant.actors.owner, tenant.org.id);
    const summary = await organizationService.getOrganizationSummary(
      tenant.actors.owner,
      tenant.org.id,
    );
    expect(summary.memberCount).toBe(4);
    expect(usage.seatsUsed).toBe(4);
  });

  it("keeps the history recorded about them before they left", async () => {
    const page = await activityService.listActivity(tenant.actors.owner, {
      orgId: tenant.org.id,
      subjectKind: "member",
      limit: 100,
      cursor: null,
    });
    const about = page.items.filter((event) => event.subjectId === original.id);
    expect(about.map((event) => event.action)).toContain("member.role_changed");
  });

  it("consumes an invitation accepted by someone who is already a member without changing them", async () => {
    const joined = capture("member.joined");
    const before = await memberOf(tenant, "admin");
    const token = await invite(tenant, `admin@${tenant.org.slug}.test`, "viewer");

    const accepted = await invitationService.acceptInvitation(tenant.userIds.admin, { token });

    expect(accepted.id).toBe(before.id);
    expect(accepted.role).toBe("admin");
    expect(joined).toHaveLength(0);
    await expect(invitationRepo.countPendingInvitations(tenant.org.id)).resolves.toBe(0);
    await expect(
      invitationService.acceptInvitation(tenant.userIds.admin, { token }),
    ).rejects.toThrow();

    const usage = await usageService.getUsage(tenant.actors.owner, tenant.org.id);
    expect(usage.seatsUsed).toBe(4);
    expect((await listedUserIds(tenant)).filter((id) => id === tenant.userIds.admin)).toHaveLength(1);
  });
});
