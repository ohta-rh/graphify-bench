/**
 * Hidden test for AFX2-alerts-and-inbox: inboxes are personal, alerts and
 * search hits link to the pages the app really serves, the assignee hears
 * about other people's status changes, the owner hears when the plan is out
 * of room (once per resource while unread, never from the periodic recount),
 * and the inbox shows only what was delivered in-app.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/lib/hash";
import { resetRateLimits } from "@/lib/rate-limit";
import { TenantScopeError } from "@/lib/tenant";
import { issuePath, projectPath, settingsPath } from "@/lib/url";
import { runMigrations } from "@/server/db/migrate";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as attachmentService from "@/server/services/attachment-service";
import * as commentService from "@/server/services/comment-service";
import * as digestService from "@/server/services/digest-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import * as searchService from "@/server/services/search-service";
import * as usageService from "@/server/services/usage-service";
import * as webhookService from "@/server/services/webhook-service";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, IssueId, NotificationId, OrgId, ProjectId, UserId } from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { Notification, NotificationKind } from "@/types/notification";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const T0 = new Date("2026-05-04T08:00:00.000Z");
const SECOND = 1000;
const HOUR = 60 * 60 * SECOND;
const MIB = 1024 * 1024;

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

interface Tenant {
  readonly org: Organization;
  readonly project: Project;
  readonly actors: Readonly<Record<Role, Actor>>;
  readonly userIds: Readonly<Record<Role, UserId>>;
}

let dir: string;
let clockMs = T0.getTime();

function tick(ms = SECOND): void {
  clockMs += ms;
  vi.setSystemTime(new Date(clockMs));
}

function stamp(ms: number): IsoTimestamp {
  return new Date(ms).toISOString() as IsoTimestamp;
}

async function createTenant(slug: string, plan: PlanId = "free"): Promise<Tenant> {
  const owner = await userRepo.insertUser({ email: `owner@${slug}.test`, name: `${slug} owner`, passwordHash: "seed" });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");

  const userIds: Partial<Record<Role, UserId>> = {};
  const actors: Partial<Record<Role, Actor>> = {};
  for (const role of ROLES) {
    const user =
      role === "owner"
        ? owner
        : await userRepo.insertUser({ email: `${role}@${slug}.test`, name: `${slug} ${role}`, passwordHash: "seed" });
    tick();
    await memberRepo.insertMember(org.id, user.id, role, null);
    userIds[role] = user.id;
    actors[role] = { userId: user.id, orgId: org.id, role };
  }

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: owner.id,
    color: "#6366f1",
    targetDate: null,
  });
  await usageRepo.recomputeUsage(org.id);

  return {
    org,
    project,
    actors: actors as Readonly<Record<Role, Actor>>,
    userIds: userIds as Readonly<Record<Role, UserId>>,
  };
}

async function newIssue(
  t: Tenant,
  actor: Actor,
  overrides: Partial<{ assigneeId: UserId | null; dueAt: IsoTimestamp | null; title: string }> = {},
): Promise<Issue> {
  tick();
  return issueService.createIssue(actor, {
    orgId: t.org.id,
    projectId: t.project.id,
    title: overrides.title ?? "Inbox target",
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId: overrides.assigneeId ?? null,
    parentId: null,
    estimate: null,
    dueAt: overrides.dueAt ?? null,
    labelIds: [],
  });
}

function projectInput(t: Tenant, name: string, key: string) {
  return {
    orgId: t.org.id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key,
    description: null,
    visibility: "org" as const,
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  };
}

async function inbox(
  t: Tenant,
  role: Role,
  options: Partial<{ kind: NotificationKind; unreadOnly: boolean; limit: number }> = {},
): Promise<readonly Notification[]> {
  const page = await notificationService.listNotifications(t.actors[role], {
    orgId: t.org.id,
    recipientId: t.userIds[role],
    unreadOnly: options.unreadOnly ?? false,
    ...(options.kind === undefined ? {} : { kind: [options.kind] }),
    limit: options.limit ?? 100,
    cursor: null,
  });
  return page.items;
}

function issueLink(t: Tenant, issue: Issue): string {
  return issuePath(t.org.slug, t.project.slug, issue.number);
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-afx2-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  registerEventHandlers();
});

beforeEach(() => {
  resetRateLimits();
  resetOverdueTracking();
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

describe("the inbox is personal", () => {
  it("shows a member their own alerts and refuses anyone else's inbox", async () => {
    const t = await createTenant("personal");
    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });

    expect((await inbox(t, "member")).map((row) => row.kind)).toEqual(["issue_assigned"]);

    await expect(
      notificationService.listNotifications(t.actors.owner, {
        orgId: t.org.id,
        recipientId: t.userIds.member,
        unreadOnly: false,
        limit: 25,
        cursor: null,
      }),
    ).rejects.toThrow();
    await expect(
      notificationService.listNotifications(t.actors.member, {
        orgId: t.org.id,
        recipientId: t.userIds.admin,
        unreadOnly: false,
        limit: 25,
        cursor: null,
      }),
    ).rejects.toThrow();
  });

  it("refuses to mark another member's alert read and leaves it unread", async () => {
    const t = await createTenant("mark-other");
    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    const [alert] = await inbox(t, "member");
    if (!alert) throw new Error("no alert");

    await expect(
      notificationService.markRead(t.actors.admin, { orgId: t.org.id, notificationId: alert.id }),
    ).rejects.toThrow();
    expect((await inbox(t, "member"))[0]?.readAt).toBeNull();

    tick();
    const read = await notificationService.markRead(t.actors.member, { orgId: t.org.id, notificationId: alert.id });
    expect(read.readAt).not.toBeNull();
  });

  it("marks all read for the caller only", async () => {
    const t = await createTenant("mark-all");
    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.admin });
    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.admin });

    tick();
    await expect(notificationService.markAllRead(t.actors.member, t.org.id)).resolves.toBe(1);

    expect((await inbox(t, "member", { unreadOnly: true }))).toHaveLength(0);
    expect((await inbox(t, "admin", { unreadOnly: true }))).toHaveLength(2);
  });

  it("refuses to change another member's preferences", async () => {
    const t = await createTenant("prefs-other");

    await expect(
      notificationService.updatePreference(t.actors.owner, {
        orgId: t.org.id,
        userId: t.userIds.member,
        kind: "issue_assigned",
        inApp: false,
        email: false,
        digestOnly: false,
      }),
    ).rejects.toThrow();

    await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    expect(await inbox(t, "member")).toHaveLength(1);
  });

  it("refuses an inbox in another workspace", async () => {
    const a = await createTenant("inbox-a");
    const b = await createTenant("inbox-b");

    await expect(
      notificationService.listNotifications(b.actors.owner, {
        orgId: a.org.id,
        recipientId: b.userIds.owner,
        unreadOnly: false,
        limit: 25,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("lists every alert across pages, once, with a consistent total", async () => {
    const t = await createTenant("paging");
    for (let i = 0; i < 120; i += 1) {
      tick();
      await notificationService.notify(t.org.id, "issue_assigned", [t.userIds.member], {
        title: `Alert ${i}`,
        body: "paging",
        href: issuePath(t.org.slug, t.project.slug, i + 1),
        actorId: null,
      });
    }

    const seen = new Set<NotificationId>();
    let cursor: string | null = null;
    let total = -1;
    do {
      const page = await notificationService.listNotifications(t.actors.member, {
        orgId: t.org.id,
        recipientId: t.userIds.member,
        unreadOnly: false,
        limit: 25,
        cursor,
      });
      total = page.total;
      for (const row of page.items) seen.add(row.id);
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(total).toBe(120);
    expect(seen.size).toBe(120);
  });

  it("leaves out alerts the member switched off for the inbox", async () => {
    const t = await createTenant("inapp-off");
    await notificationService.updatePreference(t.actors.member, {
      orgId: t.org.id,
      userId: t.userIds.member,
      kind: "issue_assigned",
      inApp: false,
      email: true,
      digestOnly: false,
    });
    await notificationService.updatePreference(t.actors.member, {
      orgId: t.org.id,
      userId: t.userIds.member,
      kind: "comment_created",
      inApp: false,
      email: false,
      digestOnly: false,
    });

    const issue = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    tick();
    await commentService.createComment(t.actors.admin, {
      orgId: t.org.id,
      issueId: issue.id,
      body: "No inbox entry for the assignee",
      parentId: null,
      mentionedUserIds: [],
    });

    expect(await inbox(t, "member")).toHaveLength(0);
    expect((await inbox(t, "owner")).map((row) => row.kind)).toEqual(["comment_created"]);
  });
});

describe("where an alert leads", () => {
  it("links an assignment alert to the issue's page", async () => {
    const t = await createTenant("link-assign");
    const issue = await newIssue(t, t.actors.owner);
    tick();
    await issueService.assignIssue(t.actors.owner, { orgId: t.org.id, issueId: issue.id, assigneeId: t.userIds.member });

    expect((await inbox(t, "member")).map((row) => [row.kind, row.href])).toEqual([
      ["issue_assigned", issueLink(t, issue)],
    ]);
  });

  it("treats an issue created with an assignee as an assignment", async () => {
    const t = await createTenant("assign-on-create");
    const issue = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    const own = await newIssue(t, t.actors.admin, { assigneeId: t.userIds.admin });

    expect((await inbox(t, "member")).map((row) => [row.kind, row.href])).toEqual([
      ["issue_assigned", issueLink(t, issue)],
    ]);
    expect(await inbox(t, "admin")).toHaveLength(0);
    expect(own.assigneeId).toBe(t.userIds.admin);
  });

  it("links comment and mention alerts to the issue's page", async () => {
    const t = await createTenant("link-comment");
    const issue = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    tick();
    await commentService.createComment(t.actors.admin, {
      orgId: t.org.id,
      issueId: issue.id,
      body: "Looping in @viewer",
      parentId: null,
      mentionedUserIds: [],
    });

    expect((await inbox(t, "member", { kind: "comment_created" })).map((row) => row.href)).toEqual([issueLink(t, issue)]);
    expect((await inbox(t, "viewer", { kind: "comment_mention" })).map((row) => row.href)).toEqual([issueLink(t, issue)]);
    expect((await inbox(t, "owner", { kind: "comment_created" })).map((row) => row.href)).toEqual([issueLink(t, issue)]);
  });

  it("links an overdue reminder to the issue's page", async () => {
    const t = await createTenant("link-overdue");
    const issue = await newIssue(t, t.actors.owner, {
      assigneeId: t.userIds.member,
      dueAt: stamp(clockMs - 2 * HOUR),
    });
    await usageRepo.recomputeUsage(t.org.id);

    tick();
    await runOverdueIssueJob(new Date(clockMs));

    const reminders = await inbox(t, "member", { kind: "issue_overdue" });
    expect(reminders.map((row) => row.href)).toEqual([issueLink(t, issue)]);
  });

  it("tells the owner about a new member, with a link to the members settings", async () => {
    const t = await createTenant("link-join");
    const token = "join-token-link-join".padEnd(32, "x");
    await invitationRepo.insertInvitation(
      t.org.id,
      { orgId: t.org.id, email: "newbie@link-join.test", role: "member", expiresInDays: 14 },
      t.userIds.admin,
      hashToken(token),
    );
    const newbie = await userRepo.insertUser({ email: "newbie@link-join.test", name: "Newbie", passwordHash: "seed" });

    tick();
    await invitationService.acceptInvitation(newbie.id, { token });

    const owner = await inbox(t, "owner", { kind: "member_joined" });
    expect(owner).toHaveLength(1);
    expect(owner[0]?.href).toBe(settingsPath(t.org.slug, "members"));

    const page = await notificationService.listNotifications(
      { userId: newbie.id, orgId: t.org.id, role: "member" },
      { orgId: t.org.id, recipientId: newbie.id, unreadOnly: false, limit: 25, cursor: null },
    );
    expect(page.items).toHaveLength(0);
  });

  it("links search hits to the pages of what they found", async () => {
    const t = await createTenant("link-search");
    const project = await projectService.createProject(t.actors.admin, projectInput(t, "Heron Works", "HER"));
    const issue = await newIssue(t, t.actors.owner, { title: "Heron nesting plan" });
    tick();
    const comment = await commentService.createComment(t.actors.admin, {
      orgId: t.org.id,
      issueId: issue.id,
      body: "The heron count is rising",
      parentId: null,
      mentionedUserIds: [],
    });

    const hits = await searchService.search(t.actors.member, {
      orgId: t.org.id,
      q: "heron",
      kinds: ["issue", "comment", "project"],
      limit: 25,
      cursor: null,
    });
    const byId = new Map(hits.items.map((hit) => [hit.id, hit.href]));

    expect(byId.get(issue.id)).toBe(issueLink(t, issue));
    expect(byId.get(comment.id)).toBe(issueLink(t, issue));
    expect(byId.get(project.id)).toBe(projectPath(t.org.slug, project.slug));
  });

  it("carries the issue's page into the digest", async () => {
    const t = await createTenant("link-digest", "growth");
    const issue = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });

    const bundle = await digestService.buildDigest(
      t.org.id,
      t.userIds.member,
      stamp(clockMs - 24 * HOUR),
      stamp(clockMs + HOUR),
    );

    expect(bundle?.entries.map((entry) => entry.href)).toEqual([issueLink(t, issue)]);
  });
});

describe("status changes", () => {
  it("tells the assignee when someone else moves their issue, not when they do", async () => {
    const t = await createTenant("status");
    const issue = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });

    tick();
    await issueService.changeIssueStatus(t.actors.admin, { orgId: t.org.id, issueId: issue.id, status: "todo" });
    tick();
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: issue.id, status: "in_progress" });

    const alerts = await inbox(t, "member", { kind: "issue_status_changed" });
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.href).toBe(issueLink(t, issue));
    expect(await inbox(t, "admin", { kind: "issue_status_changed" })).toHaveLength(0);
  });

  it("counts a board move as a status change and says nothing for an unassigned issue", async () => {
    const t = await createTenant("status-board");
    const assigned = await newIssue(t, t.actors.owner, { assigneeId: t.userIds.member });
    const loose = await newIssue(t, t.actors.owner);

    tick();
    await issueService.moveIssue(t.actors.admin, { orgId: t.org.id, issueId: assigned.id, toStatus: "in_review", toIndex: 0 });
    tick();
    await issueService.moveIssue(t.actors.admin, { orgId: t.org.id, issueId: loose.id, toStatus: "in_review", toIndex: 0 });

    expect((await inbox(t, "member", { kind: "issue_status_changed" })).map((row) => row.href)).toEqual([
      issueLink(t, assigned),
    ]);
    for (const role of ROLES) {
      if (role === "member") continue;
      expect(await inbox(t, role, { kind: "issue_status_changed" })).toHaveLength(0);
    }
  });
});

describe("when the plan is out of room", () => {
  async function ownerLimitAlerts(t: Tenant): Promise<readonly Notification[]> {
    return inbox(t, "owner", { kind: "plan_limit_reached" });
  }

  it("tells the owner when a project is refused, with a link to billing", async () => {
    const t = await createTenant("full-projects");
    await projectService.createProject(t.actors.admin, projectInput(t, "Second", "SEC"));
    tick();
    await expect(projectService.createProject(t.actors.admin, projectInput(t, "Third", "THR"))).rejects.toThrow();

    const alerts = await ownerLimitAlerts(t);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.href.startsWith(settingsPath(t.org.slug, "billing"))).toBe(true);
    expect(await inbox(t, "admin", { kind: "plan_limit_reached" })).toHaveLength(0);
  });

  it("does not repeat the alert while it is unread, and does once it has been read", async () => {
    const t = await createTenant("full-repeat");
    await projectService.createProject(t.actors.admin, projectInput(t, "Second", "SEC"));
    for (const key of ["THR", "FOU", "FIV"]) {
      tick();
      await expect(projectService.createProject(t.actors.admin, projectInput(t, `Project ${key}`, key))).rejects.toThrow();
    }
    const first = await ownerLimitAlerts(t);
    expect(first).toHaveLength(1);

    tick();
    await notificationService.markRead(t.actors.owner, { orgId: t.org.id, notificationId: first[0]!.id });
    tick();
    await expect(projectService.createProject(t.actors.admin, projectInput(t, "Project SIX", "SIX"))).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(2);
  });

  it("keeps one unread alert per resource", async () => {
    const t = await createTenant("full-two");
    await projectService.createProject(t.actors.admin, projectInput(t, "Second", "SEC"));
    tick();
    await expect(projectService.createProject(t.actors.admin, projectInput(t, "Third", "THR"))).rejects.toThrow();
    tick();
    await expect(
      invitationService.inviteMember(t.actors.admin, { orgId: t.org.id, email: "fifth@full-two.test", role: "member" }),
    ).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(2);
  });

  it("tells the owner when an invitation is refused for lack of seats", async () => {
    const t = await createTenant("full-seats");
    tick();
    await expect(
      invitationService.inviteMember(t.actors.admin, { orgId: t.org.id, email: "fifth@full-seats.test", role: "member" }),
    ).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(1);
  });

  it("tells the owner when an issue is refused for the project's quota", async () => {
    const t = await createTenant("full-issues");
    for (let number = 1; number <= 100; number += 1) {
      await issueRepo.insertIssue(
        {
          orgId: t.org.id,
          projectId: t.project.id,
          title: `Seed ${number}`,
          description: null,
          status: "backlog",
          priority: "none",
          assigneeId: null,
          parentId: null,
          estimate: null,
          dueAt: null,
          labelIds: [],
        },
        t.userIds.member,
        number,
      );
    }
    tick();
    await expect(newIssue(t, t.actors.member, { title: "One too many" })).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(1);
  });

  it("tells the owner when an upload is refused for lack of storage", async () => {
    const t = await createTenant("full-storage");
    const issue = await newIssue(t, t.actors.member);
    for (let i = 0; i < 4; i += 1) {
      tick();
      await attachmentService.addAttachment(t.actors.member, {
        orgId: t.org.id,
        issueId: issue.id,
        filename: `big-${i}.bin`,
        contentType: "application/octet-stream",
        sizeBytes: 25 * MIB,
      });
    }
    tick();
    await expect(
      attachmentService.addAttachment(t.actors.member, {
        orgId: t.org.id,
        issueId: issue.id,
        filename: "one-more.bin",
        contentType: "application/octet-stream",
        sizeBytes: 25 * MIB,
      }),
    ).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(1);
  });

  it("tells the owner when an endpoint is refused for the webhook quota", async () => {
    const t = await createTenant("full-webhooks", "growth");
    for (let i = 0; i < 10; i += 1) {
      tick();
      await webhookService.createWebhook(t.actors.admin, {
        orgId: t.org.id,
        url: `https://hooks.example.test/${i}`,
        eventTypes: ["issue.created"],
      });
    }
    tick();
    await expect(
      webhookService.createWebhook(t.actors.admin, {
        orgId: t.org.id,
        url: "https://hooks.example.test/eleven",
        eventTypes: ["issue.created"],
      }),
    ).rejects.toThrow();

    expect(await ownerLimitAlerts(t)).toHaveLength(1);
  });

  it("says nothing when the periodic recount merely finds the plan full", async () => {
    const t = await createTenant("full-rollup");
    await projectService.createProject(t.actors.admin, projectInput(t, "Second", "SEC"));

    tick();
    await usageService.recomputeUsage(t.org.id);
    tick();
    await usageService.recomputeUsage(t.org.id);

    expect(await ownerLimitAlerts(t)).toHaveLength(0);
  });
});
