/**
 * Hidden test for EFX2-audit-trail: every action lands in the activity log
 * exactly once, attributed to the person who did it, at the time it happened,
 * under the project it belongs to; the export covers its whole window.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { emit } from "@/lib/event-bus";
import { hashToken } from "@/lib/hash";
import * as invitationRepo from "@/server/repositories/invitation-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as activityService from "@/server/services/activity-service";
import * as billingService from "@/server/services/billing-service";
import * as commentService from "@/server/services/comment-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as flagService from "@/server/services/feature-flag-service";
import * as invitationService from "@/server/services/invitation-service";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import * as organizationService from "@/server/services/organization-service";
import * as projectService from "@/server/services/project-service";
import { toIsoTimestamp } from "@/types/common";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { ActivityAction, ActivityEvent } from "@/types/activity";
import type { IssueId, ProjectId, UserId } from "@/types/common";
import type { Project } from "@/types/project";

const T0 = new Date("2026-05-10T10:00:00.000Z");
const HOUR = 60 * 60 * 1000;

let cleanup: () => void;
let keySeq = 0;

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

async function feed(
  t: Tenant,
  filter: Partial<{ projectId: ProjectId; action: ActivityAction[]; actorId: UserId; since: string; until: string }> = {},
): Promise<{ items: readonly ActivityEvent[]; total: number }> {
  const page = await activityService.listActivity(t.actors.admin, {
    orgId: t.org.id,
    limit: 100,
    cursor: null,
    ...(filter as object),
  } as never);
  return { items: page.items, total: page.total };
}

/** The rows for one action about one subject; the log must hold exactly one. */
async function single(t: Tenant, action: ActivityAction, subjectId: string): Promise<ActivityEvent> {
  const { items } = await feed(t, { action: [action] });
  const rows = items.filter((row) => row.subjectId === subjectId);
  expect(rows, `${action} for ${subjectId}`).toHaveLength(1);
  return rows[0] as ActivityEvent;
}

async function newProject(t: Tenant, name: string): Promise<Project> {
  keySeq += 1;
  return projectService.createProject(t.actors.admin, {
    orgId: t.org.id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key: `A${String(keySeq).padStart(3, "0")}`,
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  });
}

async function joinViaInvitation(t: Tenant, email: string): Promise<UserId> {
  const token = `join-${email}`.padEnd(32, "x");
  await invitationRepo.insertInvitation(
    t.org.id,
    { orgId: t.org.id, email, role: "member", expiresInDays: 14 },
    t.userIds.admin,
    hashToken(token),
  );
  const user = await userRepo.insertUser({ email, name: email, passwordHash: "seed" });
  await invitationService.acceptInvitation(user.id, { token });
  return user.id;
}

function exportJson(t: Tenant, since: string, until: string): Promise<ActivityEvent[]> {
  return activityService
    .exportActivity(t.actors.admin, {
      orgId: t.org.id,
      since: toIsoTimestamp(since),
      until: toIsoTimestamp(until),
      format: "json",
    })
    .then((body) => JSON.parse(body) as ActivityEvent[]);
}

describe("what the log records", () => {
  it("files a status change under its project, done by the person who moved it", async () => {
    const t = await createTenant("at-status", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Move" }));
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: issue.id, status: "in_progress" });

    const row = await single(t, "issue.status_changed", issue.id);
    expect(row).toMatchObject({ actorId: t.userIds.member, projectId: t.project.id, subjectKind: "issue" });
    expect(row.metadata).toMatchObject({ from: "backlog", to: "in_progress" });

    const byProject = await feed(t, { projectId: t.project.id, action: ["issue.status_changed"] });
    expect(byProject.items.map((r) => r.subjectId)).toEqual([issue.id]);
    expect(byProject.total).toBe(1);
  });

  it("attributes an assignment to the person who assigned, not the assignee", async () => {
    const t = await createTenant("at-assign", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Hand over" }));
    await issueService.assignIssue(t.actors.member, { orgId: t.org.id, issueId: issue.id, assigneeId: t.userIds.admin });

    const row = await single(t, "issue.assigned", issue.id);
    expect(row.actorId).toBe(t.userIds.member);
    expect(row.projectId).toBe(t.project.id);
  });

  it("files comments, comment edits and comment deletions under the issue's project, once each", async () => {
    const t = await createTenant("at-comments", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Talk" }));
    const comment = await commentService.createComment(t.actors.member, {
      orgId: t.org.id,
      issueId: issue.id,
      body: "first",
      parentId: null,
      mentionedUserIds: [],
    });
    at(5 * 60 * 1000);
    await commentService.updateComment(t.actors.member, { orgId: t.org.id, commentId: comment.id, body: "edited" });
    at(10 * 60 * 1000);
    await commentService.deleteComment(t.actors.admin, { orgId: t.org.id, commentId: comment.id });

    const created = await single(t, "comment.created", comment.id);
    const updated = await single(t, "comment.updated", comment.id);
    const deleted = await single(t, "comment.deleted", comment.id);
    expect(created).toMatchObject({ actorId: t.userIds.member, projectId: t.project.id, subjectKind: "comment" });
    expect(updated).toMatchObject({ actorId: t.userIds.member, projectId: t.project.id, subjectKind: "comment" });
    expect(deleted).toMatchObject({ actorId: t.userIds.admin, projectId: t.project.id, subjectKind: "comment" });

    const byProject = await feed(t, { projectId: t.project.id });
    expect(byProject.items.filter((r) => r.subjectId === comment.id)).toHaveLength(3);
  });

  it("records project settings changes, archiving and restoring, once each", async () => {
    const t = await createTenant("at-project", "growth");
    const project = await newProject(t, "Lifecycle");
    await projectService.updateProject(t.actors.admin, { orgId: t.org.id, projectId: project.id, name: "Lifecycle 2" });
    await projectService.archiveProject(t.actors.admin, { orgId: t.org.id, projectId: project.id, archiveIssues: true });
    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);

    for (const action of ["project.created", "project.updated", "project.archived", "project.restored"] as const) {
      const row = await single(t, action, project.id);
      expect(row).toMatchObject({ actorId: t.userIds.admin, projectId: project.id, subjectKind: "project" });
    }
    const byProject = await feed(t, { projectId: project.id });
    expect(byProject.total).toBe(4);
  });

  it("records issue edits and issue archiving under the project", async () => {
    const t = await createTenant("at-issue", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Edit me" }));
    await issueService.updateIssue(t.actors.member, { orgId: t.org.id, issueId: issue.id, title: "Edited" });
    await issueService.archiveIssue(t.actors.member, t.org.id, issue.id);

    for (const action of ["issue.created", "issue.updated", "issue.archived"] as const) {
      const row = await single(t, action, issue.id);
      expect(row).toMatchObject({ actorId: t.userIds.member, projectId: t.project.id, subjectKind: "issue" });
    }
  });

  it("records members joining, changing role and being removed", async () => {
    const t = await createTenant("at-members", "growth");
    const userId = await joinViaInvitation(t, "joiner@at-members.test");
    const member = await memberRepo.findMember(t.org.id, userId);
    if (!member) throw new Error("member missing");

    await memberService.updateMemberRole(t.actors.owner, { orgId: t.org.id, memberId: member.id, role: "admin" });
    await memberService.removeMember(t.actors.owner, { orgId: t.org.id, memberId: member.id });

    const joined = await single(t, "member.joined", member.id);
    expect(joined).toMatchObject({ actorId: userId, subjectKind: "member" });
    const changed = await single(t, "member.role_changed", member.id);
    expect(changed.actorId).toBe(t.userIds.owner);
    const removed = await single(t, "member.removed", member.id);
    expect(removed).toMatchObject({ actorId: t.userIds.owner, subjectKind: "member" });
  });

  it("records feature switches and plan changes", async () => {
    const t = await createTenant("at-flags", "growth");
    await flagService.toggleFlag(t.actors.admin, { orgId: t.org.id, flag: "kanban_board", enabled: true });
    await billingService.changePlan(t.actors.owner, { orgId: t.org.id, plan: "starter", interval: "monthly" });

    const toggled = await single(t, "flag.toggled", "kanban_board");
    expect(toggled).toMatchObject({ actorId: t.userIds.admin, subjectKind: "feature_flag" });
    const plan = await single(t, "billing.plan_changed", t.org.id);
    expect(plan).toMatchObject({ actorId: t.userIds.owner, subjectKind: "subscription" });
    expect(plan.metadata).toMatchObject({ from: "growth", to: "starter" });
  });

  it("holds exactly one entry per action, and nothing else", async () => {
    const t = await createTenant("at-once", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Count me" }));
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: issue.id, status: "todo" });
    await issueService.assignIssue(t.actors.member, { orgId: t.org.id, issueId: issue.id, assigneeId: t.userIds.viewer });
    await issueService.updateIssue(t.actors.member, { orgId: t.org.id, issueId: issue.id, priority: "high" });
    const comment = await commentService.createComment(t.actors.admin, {
      orgId: t.org.id,
      issueId: issue.id,
      body: "one",
      parentId: null,
      mentionedUserIds: [],
    });
    await commentService.updateComment(t.actors.admin, { orgId: t.org.id, commentId: comment.id, body: "two" });
    await organizationService.updateOrganization(t.actors.owner, { orgId: t.org.id, name: "Renamed" });

    const all = await feed(t);
    expect(all.total).toBe(7);
    expect([...all.items.map((r) => r.action)].sort()).toEqual(
      [
        "comment.created",
        "comment.updated",
        "issue.assigned",
        "issue.created",
        "issue.status_changed",
        "issue.updated",
        "organization.updated",
      ].sort(),
    );
  });
});

describe("when things happened", () => {
  it("stamps each entry with the time of the action, not the time it was written", async () => {
    const t = await createTenant("at-time", "growth");
    const happened = toIsoTimestamp(new Date(T0.getTime() - 36 * HOUR));

    await emit("issue.created", {
      orgId: t.org.id,
      actorId: t.userIds.member,
      occurredAt: happened,
      issueId: "01HZZZLATEISSUEAAAAAAAAAA1" as IssueId,
      projectId: t.project.id,
      title: "Caught up later",
      assigneeId: null,
      priority: "none",
    });

    const row = await single(t, "issue.created", "01HZZZLATEISSUEAAAAAAAAAA1");
    expect(row.occurredAt).toBe(happened);

    const earlier = await feed(t, { until: toIsoTimestamp(new Date(T0.getTime() - HOUR)) });
    expect(earlier.items.map((r) => r.subjectId)).toEqual(["01HZZZLATEISSUEAAAAAAAAAA1"]);
  });

  it("includes both ends of a time window, in the feed and in the export", async () => {
    const t = await createTenant("at-window", "growth");
    const stamps = [1, 2, 3].map((h) => toIsoTimestamp(new Date(T0.getTime() + h * HOUR)));
    for (const [i, occurredAt] of stamps.entries()) {
      await emit("project.restored", {
        orgId: t.org.id,
        actorId: t.userIds.admin,
        occurredAt,
        projectId: `01HZZZWINDOWPROJECT000000${i}` as ProjectId,
      });
    }

    const whole = await feed(t, { since: stamps[0], until: stamps[2] });
    expect(whole.total).toBe(3);
    const exact = await feed(t, { since: stamps[1], until: stamps[1] });
    expect(exact.items.map((r) => r.occurredAt)).toEqual([stamps[1]]);

    const exported = await exportJson(t, stamps[0] as string, stamps[2] as string);
    expect(exported.map((r) => r.occurredAt).sort()).toEqual([...stamps].sort());
    const last = await exportJson(t, stamps[2] as string, stamps[2] as string);
    expect(last).toHaveLength(1);
  });

  it("refuses an export whose end precedes its start", async () => {
    const t = await createTenant("at-reversed", "growth");
    await expect(
      activityService.exportActivity(t.actors.admin, {
        orgId: t.org.id,
        since: toIsoTimestamp(new Date(T0.getTime() + HOUR)),
        until: toIsoTimestamp(T0),
        format: "json",
      }),
    ).rejects.toThrow();
  });
});

describe("the export", () => {
  it("contains every entry in the window, however many, without duplicates", async () => {
    const t = await createTenant("at-bulk", "growth");
    const occurredAt = toIsoTimestamp(T0);
    const ids: string[] = [];
    for (let i = 0; i < 230; i += 1) {
      const issueId = `01HZZZBULK${String(i).padStart(16, "0")}` as IssueId;
      ids.push(issueId);
      await emit("issue.created", {
        orgId: t.org.id,
        actorId: t.userIds.member,
        occurredAt,
        issueId,
        projectId: t.project.id,
        title: `Bulk ${i}`,
        assigneeId: null,
        priority: "low",
      });
    }

    const json = await exportJson(t, occurredAt, occurredAt);
    expect(json).toHaveLength(230);
    expect(new Set(json.map((r) => r.id)).size).toBe(230);
    expect(json.map((r) => r.subjectId).sort()).toEqual([...ids].sort());

    const csv = await activityService.exportActivity(t.actors.admin, {
      orgId: t.org.id,
      since: occurredAt,
      until: occurredAt,
      format: "csv",
    });
    expect(csv.split(/\r?\n/).filter((line) => line.length > 0)).toHaveLength(231);
  });

  it("lists entries newest first", async () => {
    const t = await createTenant("at-order", "growth");
    for (const h of [3, 1, 2]) {
      await emit("project.restored", {
        orgId: t.org.id,
        actorId: t.userIds.admin,
        occurredAt: toIsoTimestamp(new Date(T0.getTime() + h * HOUR)),
        projectId: `01HZZZORDERPROJECT0000000${h}` as ProjectId,
      });
    }
    const json = await exportJson(t, toIsoTimestamp(T0), toIsoTimestamp(new Date(T0.getTime() + 4 * HOUR)));
    expect(json.map((r) => r.occurredAt)).toEqual(
      [3, 2, 1].map((h) => toIsoTimestamp(new Date(T0.getTime() + h * HOUR))),
    );
  });

  it("keeps each entry's details", async () => {
    const t = await createTenant("at-details", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Details" }));
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: issue.id, status: "done" });

    const json = await exportJson(t, toIsoTimestamp(T0), toIsoTimestamp(T0));
    const row = json.find((r) => r.action === "issue.status_changed");
    expect(row?.metadata).toMatchObject({ from: "backlog", to: "done" });

    const csv = await activityService.exportActivity(t.actors.admin, {
      orgId: t.org.id,
      since: toIsoTimestamp(T0),
      until: toIsoTimestamp(T0),
      format: "csv",
    });
    expect(csv.split(/\r?\n/).filter((line) => line.length > 0)).toHaveLength(3);
  });

  it("only ever covers the requesting organization", async () => {
    const a = await createTenant("at-scope-a", "growth");
    const b = await createTenant("at-scope-b", "growth");
    await issueService.createIssue(a.actors.member, issueInput(a.org.id, a.project.id, { title: "A" }));
    await issueService.createIssue(b.actors.member, issueInput(b.org.id, b.project.id, { title: "B" }));

    const json = await exportJson(a, toIsoTimestamp(T0), toIsoTimestamp(T0));
    expect(json).toHaveLength(1);
    expect(json[0]?.orgId).toBe(a.org.id);
  });
});

describe("filtering the feed", () => {
  it("by project shows everything that happened inside that project and nothing from others", async () => {
    const t = await createTenant("at-filter", "growth");
    const other = await newProject(t, "Other");
    const here = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Here" }));
    const there = await issueService.createIssue(t.actors.member, issueInput(t.org.id, other.id, { title: "There" }));
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: here.id, status: "todo" });
    await issueService.changeIssueStatus(t.actors.member, { orgId: t.org.id, issueId: there.id, status: "todo" });
    await issueService.assignIssue(t.actors.member, { orgId: t.org.id, issueId: there.id, assigneeId: t.userIds.admin });
    const comment = await commentService.createComment(t.actors.member, {
      orgId: t.org.id,
      issueId: there.id,
      body: "over there",
      parentId: null,
      mentionedUserIds: [],
    });

    const mine = await feed(t, { projectId: t.project.id });
    expect(mine.total).toBe(2);
    expect(mine.items.every((r) => r.projectId === t.project.id)).toBe(true);

    const theirs = await feed(t, { projectId: other.id });
    expect(theirs.total).toBe(5);
    expect([...theirs.items.map((r) => r.action)].sort()).toEqual(
      ["comment.created", "issue.assigned", "issue.created", "issue.status_changed", "project.created"].sort(),
    );
    expect(theirs.items.find((r) => r.action === "comment.created")?.subjectId).toBe(comment.id);
  });

  it("by person shows only what that person did", async () => {
    const t = await createTenant("at-actor", "growth");
    const issue = await issueService.createIssue(t.actors.member, issueInput(t.org.id, t.project.id, { title: "Who" }));
    await issueService.assignIssue(t.actors.admin, { orgId: t.org.id, issueId: issue.id, assigneeId: t.userIds.member });
    await issueService.changeIssueStatus(t.actors.member, {
      orgId: t.org.id,
      issueId: issue.id,
      status: "todo",
    });

    const byAdmin = await feed(t, { actorId: t.userIds.admin });
    expect(byAdmin.items.map((r) => r.action)).toEqual(["issue.assigned"]);
    const byMember = await feed(t, { actorId: t.userIds.member });
    expect([...byMember.items.map((r) => r.action)].sort()).toEqual(["issue.created", "issue.status_changed"]);
  });
});
