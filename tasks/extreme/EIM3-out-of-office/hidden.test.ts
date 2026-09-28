/**
 * EIM3 — out of office with a stand-in.
 *
 * A member away between two instants can name a delegate. While the window is
 * in effect, new assignments to the member land on the delegate, overdue
 * alerts for the member's issues go to the delegate, and mentions of the
 * member reach both. Nothing is chained, nothing moves back afterwards.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import { clearAbsence, getAbsence, setAbsence } from "@/server/services/member-service";
import * as memberService from "@/server/services/member-service";
import { listNotifications } from "@/server/services/notification-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { SetAbsenceInput } from "@/schemas/member";
import type { IsoTimestamp, IssueId, OrgId, UserId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { NotificationKind } from "@/types/notification";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

const STARTS = "2026-08-01T00:00:00.000Z" as IsoTimestamp;
const ENDS = "2026-08-15T00:00:00.000Z" as IsoTimestamp;
const DURING = "2026-08-05T12:00:00.000Z";

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

async function at<T>(instant: string, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

function absence(
  tenant: Tenant,
  userId: UserId,
  delegateUserId: UserId | null,
  overrides: Partial<SetAbsenceInput> = {},
): SetAbsenceInput {
  return {
    orgId: tenant.org.id,
    userId,
    delegateUserId,
    startsAt: STARTS,
    endsAt: ENDS,
    note: null,
    ...overrides,
  };
}

async function inbox(tenant: Tenant, recipientId: UserId, kind: NotificationKind): Promise<number> {
  const page = await listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    kind: [kind],
    limit: 100,
    cursor: null,
  });
  return page.total;
}

async function unassignedIssue(tenant: Tenant, title: string): Promise<Issue> {
  return issueService.createIssue(
    tenant.actors.owner,
    issueInput(tenant.org.id, tenant.project.id, { title }),
  );
}

async function assign(actor: Actor, orgId: OrgId, issueId: IssueId, assigneeId: UserId): Promise<Issue> {
  return issueService.assignIssue(actor, { orgId, issueId, assigneeId });
}

async function mention(
  tenant: Tenant,
  author: Actor,
  issueId: IssueId,
  mentionedUserIds: readonly UserId[],
): Promise<void> {
  await commentService.createComment(author, {
    orgId: tenant.org.id,
    issueId,
    body: "Status update",
    parentId: null,
    mentionedUserIds: [...mentionedUserIds],
  });
}

/** Adds a fifth member with the given role, for scenarios needing two peers. */
async function extraMember(tenant: Tenant, slug: string, role: Role): Promise<Actor> {
  const user = await userRepo.insertUser({
    email: `${slug}@${tenant.org.slug}.test`,
    name: `${tenant.org.slug} ${slug}`,
    passwordHash: "seed",
  });
  await memberRepo.insertMember(tenant.org.id, user.id, role, null);
  return { userId: user.id, orgId: tenant.org.id, role };
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

beforeEach(() => {
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

describe("EIM3 — out of office", () => {
  it("records a member's own absence and lets them replace or clear it", async () => {
    const tenant = await createTenant("eim3-own");

    const stored = await setAbsence(
      tenant.actors.viewer,
      absence(tenant, tenant.userIds.viewer, tenant.userIds.admin, { note: "Holiday" }),
    );
    expect(stored).toEqual({
      orgId: tenant.org.id,
      userId: tenant.userIds.viewer,
      delegateUserId: tenant.userIds.admin,
      startsAt: STARTS,
      endsAt: ENDS,
      note: "Holiday",
    });

    await at(DURING, async () => {
      expect(await getAbsence(tenant.actors.viewer, tenant.org.id, tenant.userIds.viewer)).toEqual(stored);

      const replaced = await setAbsence(
        tenant.actors.viewer,
        absence(tenant, tenant.userIds.viewer, tenant.userIds.member, {
          endsAt: "2026-08-20T00:00:00.000Z" as IsoTimestamp,
        }),
      );
      expect(replaced.delegateUserId).toBe(tenant.userIds.member);
      expect(await getAbsence(tenant.actors.member, tenant.org.id, tenant.userIds.viewer)).toEqual(replaced);

      await clearAbsence(tenant.actors.viewer, tenant.org.id, tenant.userIds.viewer);
      expect(await getAbsence(tenant.actors.viewer, tenant.org.id, tenant.userIds.viewer)).toBeNull();
      await expect(clearAbsence(tenant.actors.viewer, tenant.org.id, tenant.userIds.viewer)).resolves.toBeUndefined();
    });
  });

  it("lets admins set anyone's absence, and everyone else only their own", async () => {
    const tenant = await createTenant("eim3-permissions");

    await expect(
      setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.admin, null)),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      setAbsence(tenant.actors.viewer, absence(tenant, tenant.userIds.member, null)),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      clearAbsence(tenant.actors.member, tenant.org.id, tenant.userIds.admin),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    await expect(
      setAbsence(tenant.actors.admin, absence(tenant, tenant.userIds.member, null)),
    ).resolves.toMatchObject({ userId: tenant.userIds.member, delegateUserId: null });
    await expect(
      setAbsence(tenant.actors.owner, absence(tenant, tenant.userIds.viewer, tenant.userIds.member)),
    ).resolves.toMatchObject({ userId: tenant.userIds.viewer, delegateUserId: tenant.userIds.member });
    await expect(
      clearAbsence(tenant.actors.admin, tenant.org.id, tenant.userIds.member),
    ).resolves.toBeUndefined();
  });

  it("rejects a window that does not end after it starts, an unknown member and an unusable delegate", async () => {
    const tenant = await createTenant("eim3-validation");
    const other = await createTenant("eim3-validation-other");

    await expect(
      setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, null, { endsAt: STARTS })),
    ).rejects.toThrow();
    await expect(
      setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.member)),
    ).rejects.toThrow();
    await expect(
      setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, other.userIds.admin)),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setAbsence(tenant.actors.owner, absence(tenant, other.userIds.member, null)),
    ).rejects.toBeInstanceOf(NotFoundError);

    const removed = await memberRepo.findMember(tenant.org.id, tenant.userIds.viewer);
    if (!removed) throw new Error("fixture viewer missing");
    await memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: removed.id });
    await expect(
      setAbsence(tenant.actors.owner, absence(tenant, tenant.userIds.viewer, null)),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.viewer)),
    ).rejects.toBeInstanceOf(NotFoundError);

    await at(DURING, async () => {
      expect(await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member)).toBeNull();
    });
  });

  it("stays inside the workspace", async () => {
    const tenantA = await createTenant("eim3-tenant-a");
    const tenantB = await createTenant("eim3-tenant-b");

    await expect(
      setAbsence(tenantB.actors.owner, absence(tenantA, tenantA.userIds.member, null)),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      getAbsence(tenantB.actors.owner, tenantA.org.id, tenantA.userIds.member),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      clearAbsence(tenantB.actors.owner, tenantA.org.id, tenantA.userIds.member),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("reports a scheduled absence, forgets an ended one and knows nothing about non-members", async () => {
    const tenant = await createTenant("eim3-window-read");
    const other = await createTenant("eim3-window-read-other");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));

    await at("2026-07-01T00:00:00.000Z", async () => {
      expect((await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member))?.startsAt).toBe(STARTS);
    });
    await at("2026-08-14T23:59:59.000Z", async () => {
      expect(await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member)).not.toBeNull();
    });
    await at(ENDS, async () => {
      expect(await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member)).toBeNull();
      expect(await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.admin)).toBeNull();
      await expect(
        getAbsence(tenant.actors.owner, tenant.org.id, other.userIds.member),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("redirects a new assignment to the delegate and alerts the delegate only", async () => {
    const tenant = await createTenant("eim3-assign");
    const issue = await unassignedIssue(tenant, "Redirect me");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    const assigned = capture("issue.assigned");

    const after = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, issue.id, tenant.userIds.member),
    );

    expect(after.assigneeId).toBe(tenant.userIds.admin);
    expect((await issueRepo.findIssueById(tenant.org.id, issue.id))?.assigneeId).toBe(tenant.userIds.admin);
    expect(assigned).toHaveLength(1);
    expect(assigned[0]).toMatchObject({
      issueId: issue.id,
      actorId: tenant.userIds.owner,
      previousAssigneeId: null,
      assigneeId: tenant.userIds.admin,
    });
    expect(await inbox(tenant, tenant.userIds.admin, "issue_assigned")).toBe(1);
    expect(await inbox(tenant, tenant.userIds.member, "issue_assigned")).toBe(0);

    // Naming the delegate directly is an ordinary assignment.
    const direct = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, issue.id, tenant.userIds.admin),
    );
    expect(direct.assigneeId).toBe(tenant.userIds.admin);
    expect(assigned[1]).toMatchObject({ previousAssigneeId: tenant.userIds.admin, assigneeId: tenant.userIds.admin });
  });

  it("redirects an assignment made when the issue is created", async () => {
    const tenant = await createTenant("eim3-create");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    const created = capture("issue.created");

    const issue = await at(DURING, () =>
      issueService.createIssue(
        tenant.actors.owner,
        issueInput(tenant.org.id, tenant.project.id, {
          title: "Born redirected",
          assigneeId: tenant.userIds.member,
        }),
      ),
    );

    expect(issue.assigneeId).toBe(tenant.userIds.admin);
    expect(issue.authorId).toBe(tenant.userIds.owner);
    expect((await issueRepo.findIssueById(tenant.org.id, issue.id))?.assigneeId).toBe(tenant.userIds.admin);
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({ issueId: issue.id, assigneeId: tenant.userIds.admin });
  });

  it("leaves an assignment alone when the away member named no delegate", async () => {
    const tenant = await createTenant("eim3-no-delegate");
    const issue = await unassignedIssue(tenant, "Stays put");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, null));

    const after = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, issue.id, tenant.userIds.member),
    );

    expect(after.assigneeId).toBe(tenant.userIds.member);
    expect(await inbox(tenant, tenant.userIds.member, "issue_assigned")).toBe(1);
  });

  it("redirects only between the start and the end of the window", async () => {
    const tenant = await createTenant("eim3-boundaries");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));

    const before = await unassignedIssue(tenant, "Before the window");
    const lastMoment = await unassignedIssue(tenant, "Last moment");
    const atEnd = await unassignedIssue(tenant, "At the end");

    const early = await at("2026-07-31T23:59:59.000Z", () =>
      assign(tenant.actors.owner, tenant.org.id, before.id, tenant.userIds.member),
    );
    expect(early.assigneeId).toBe(tenant.userIds.member);

    const inside = await at("2026-08-14T23:59:59.000Z", () =>
      assign(tenant.actors.owner, tenant.org.id, lastMoment.id, tenant.userIds.member),
    );
    expect(inside.assigneeId).toBe(tenant.userIds.admin);

    const late = await at(ENDS, () =>
      assign(tenant.actors.owner, tenant.org.id, atEnd.id, tenant.userIds.member),
    );
    expect(late.assigneeId).toBe(tenant.userIds.member);
  });

  it("does not chain delegations", async () => {
    const tenant = await createTenant("eim3-no-chain");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    await setAbsence(tenant.actors.admin, absence(tenant, tenant.userIds.admin, tenant.userIds.viewer));
    const first = await unassignedIssue(tenant, "Two hops away");
    const second = await unassignedIssue(tenant, "One hop away");

    const viaMember = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, first.id, tenant.userIds.member),
    );
    expect(viaMember.assigneeId).toBe(tenant.userIds.admin);

    const viaAdmin = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, second.id, tenant.userIds.admin),
    );
    expect(viaAdmin.assigneeId).toBe(tenant.userIds.viewer);
  });

  it("never redirects someone taking an issue themselves", async () => {
    const tenant = await createTenant("eim3-self");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    const issue = await unassignedIssue(tenant, "Mine anyway");

    const taken = await at(DURING, () =>
      assign(tenant.actors.member, tenant.org.id, issue.id, tenant.userIds.member),
    );
    expect(taken.assigneeId).toBe(tenant.userIds.member);

    const authored = await at(DURING, () =>
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, {
          title: "Self-assigned at birth",
          assigneeId: tenant.userIds.member,
        }),
      ),
    );
    expect(authored.assigneeId).toBe(tenant.userIds.member);
    expect(await inbox(tenant, tenant.userIds.admin, "issue_assigned")).toBe(0);
  });

  it("sends overdue alerts for an away member's issues to the delegate", async () => {
    const tenant = await createTenant("eim3-overdue");
    await usageRepo.recomputeUsage(tenant.org.id);
    await issueService.createIssue(
      tenant.actors.owner,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late, owner away",
        assigneeId: tenant.userIds.member,
        dueAt: "2026-07-20T00:00:00.000Z",
      }),
    );
    await issueService.createIssue(
      tenant.actors.owner,
      issueInput(tenant.org.id, tenant.project.id, {
        title: "Late, owner away without cover",
        assigneeId: tenant.userIds.viewer,
        dueAt: "2026-07-21T00:00:00.000Z",
      }),
    );
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    await setAbsence(tenant.actors.viewer, absence(tenant, tenant.userIds.viewer, null));

    const result = await at(DURING, () => runOverdueIssueJob(new Date(DURING)));

    expect(result.processed).toBe(2);
    expect(await inbox(tenant, tenant.userIds.admin, "issue_overdue")).toBe(1);
    expect(await inbox(tenant, tenant.userIds.member, "issue_overdue")).toBe(0);
    expect(await inbox(tenant, tenant.userIds.viewer, "issue_overdue")).toBe(1);
  });

  it("alerts both an away member and their delegate on a mention, once each", async () => {
    const tenant = await createTenant("eim3-mentions");
    const issue = await unassignedIssue(tenant, "Talked about");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));

    await at(DURING, () => mention(tenant, tenant.actors.owner, issue.id, [tenant.userIds.member]));
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toBe(1);
    expect(await inbox(tenant, tenant.userIds.admin, "comment_mention")).toBe(1);

    await at(DURING, () =>
      mention(tenant, tenant.actors.owner, issue.id, [tenant.userIds.member, tenant.userIds.admin]),
    );
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toBe(2);
    expect(await inbox(tenant, tenant.userIds.admin, "comment_mention")).toBe(2);

    await at(DURING, () => mention(tenant, tenant.actors.admin, issue.id, [tenant.userIds.member]));
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toBe(3);
    expect(await inbox(tenant, tenant.userIds.admin, "comment_mention")).toBe(2);

    await at("2026-08-20T00:00:00.000Z", () => mention(tenant, tenant.actors.owner, issue.id, [tenant.userIds.member]));
    expect(await inbox(tenant, tenant.userIds.member, "comment_mention")).toBe(4);
    expect(await inbox(tenant, tenant.userIds.admin, "comment_mention")).toBe(2);
  });

  it("stops standing in when the delegate leaves, and forgets the absence when the member leaves", async () => {
    const tenant = await createTenant("eim3-leaving");
    await setAbsence(tenant.actors.member, absence(tenant, tenant.userIds.member, tenant.userIds.admin));
    const issue = await unassignedIssue(tenant, "Cover gone");

    const admin = await memberRepo.findMember(tenant.org.id, tenant.userIds.admin);
    if (!admin) throw new Error("fixture admin missing");
    await memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: admin.id });

    await at(DURING, async () => {
      const remaining = await getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member);
      expect(remaining).toMatchObject({ userId: tenant.userIds.member, delegateUserId: null, endsAt: ENDS });

      const after = await assign(tenant.actors.owner, tenant.org.id, issue.id, tenant.userIds.member);
      expect(after.assigneeId).toBe(tenant.userIds.member);
    });

    const member = await memberRepo.findMember(tenant.org.id, tenant.userIds.member);
    if (!member) throw new Error("fixture member missing");
    await memberService.removeMember(tenant.actors.owner, { orgId: tenant.org.id, memberId: member.id });
    await at(DURING, async () => {
      await expect(
        getAbsence(tenant.actors.owner, tenant.org.id, tenant.userIds.member),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it("gives the redirected issue to the delegate for the purposes of ownership", async () => {
    const tenant = await createTenant("eim3-ownership");
    const standIn = await extraMember(tenant, "standin", "viewer");
    await setAbsence(tenant.actors.viewer, absence(tenant, tenant.userIds.viewer, standIn.userId));
    const issue = await unassignedIssue(tenant, "Whose is it");

    const after = await at(DURING, () =>
      assign(tenant.actors.owner, tenant.org.id, issue.id, tenant.userIds.viewer),
    );
    expect(after.assigneeId).toBe(standIn.userId);

    await expect(
      issueService.updateIssue(standIn, { orgId: tenant.org.id, issueId: issue.id, title: "Edited by the stand-in" }),
    ).resolves.toMatchObject({ title: "Edited by the stand-in" });
    await expect(
      issueService.updateIssue(tenant.actors.viewer, { orgId: tenant.org.id, issueId: issue.id, title: "Edited by the absentee" }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("keeps absences per workspace even for a user who belongs to two", async () => {
    const tenantA = await createTenant("eim3-two-orgs-a");
    const tenantB = await createTenant("eim3-two-orgs-b");
    await memberRepo.insertMember(tenantB.org.id, tenantA.userIds.member, "member", null);
    await setAbsence(tenantA.actors.member, absence(tenantA, tenantA.userIds.member, tenantA.userIds.admin));

    const inA = await unassignedIssue(tenantA, "In A");
    const inB = await unassignedIssue(tenantB, "In B");

    const redirected = await at(DURING, () =>
      assign(tenantA.actors.owner, tenantA.org.id, inA.id, tenantA.userIds.member),
    );
    expect(redirected.assigneeId).toBe(tenantA.userIds.admin);

    const untouched = await at(DURING, () =>
      assign(tenantB.actors.owner, tenantB.org.id, inB.id, tenantA.userIds.member),
    );
    expect(untouched.assigneeId).toBe(tenantA.userIds.member);
    await at(DURING, async () => {
      expect(await getAbsence(tenantB.actors.owner, tenantB.org.id, tenantA.userIds.member)).toBeNull();
    });
  });
});
