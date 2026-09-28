/**
 * Hidden test for UIM2: recurring issues (rules + the job that files them).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { ZodError } from "zod";
import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { drain, enqueue, resetQueue } from "@/server/jobs/queue";
import { runRecurringIssueJob } from "@/server/jobs/recurring-issue-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import { NotFoundError } from "@/server/services/_support";
import * as memberService from "@/server/services/member-service";
import * as projectService from "@/server/services/project-service";
import * as recurringService from "@/server/services/recurring-issue-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { JobKind } from "@/server/jobs/queue";
import type { IsoTimestamp, UserId } from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";

let cleanup: () => void;
let seq = 0;

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-01T00:00:00.000Z"));
  cleanup = await useTemporaryDatabase();
});

afterAll(() => {
  vi.useRealTimers();
  cleanup();
});

async function tenant(plan: "free" | "starter" | "growth" = "growth"): Promise<Tenant> {
  seq += 1;
  return createTenant(`uim2t${seq}`, plan);
}

type RuleOverrides = Partial<{
  title: string;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  assigneeId: UserId | null;
  cadence: "daily" | "weekly";
  weekday: number | null;
  timezone: string;
  startsOn: string;
  projectId: Project["id"];
}>;

function rule(t: Tenant, overrides: RuleOverrides = {}, actor?: Actor) {
  return recurringService.createRecurringIssue(actor ?? t.actors.member, {
    orgId: t.org.id,
    projectId: overrides.projectId ?? t.project.id,
    title: overrides.title ?? "Weekly sync",
    priority: overrides.priority ?? "none",
    assigneeId: overrides.assigneeId ?? null,
    cadence: overrides.cadence ?? "daily",
    weekday: overrides.weekday ?? null,
    timezone: overrides.timezone ?? "UTC",
    startsOn: overrides.startsOn ?? "2026-03-02",
  });
}

async function run(iso: string): Promise<void> {
  await runRecurringIssueJob(new Date(iso));
}

async function filed(t: Tenant, title: string): Promise<Issue[]> {
  const page = await issueRepo.listIssues({ orgId: t.org.id, limit: 100, cursor: null });
  return page.items
    .filter((issue) => issue.title.startsWith(`${title} (`))
    .sort((x, y) => (x.title < y.title ? -1 : 1));
}

async function filedTitles(t: Tenant, title: string): Promise<string[]> {
  return (await filed(t, title)).map((issue) => issue.title);
}

async function stored(t: Tenant, id: string) {
  const rows = await recurringService.listRecurringIssues(t.actors.member, t.org.id);
  return rows.find((row) => row.id === id);
}

async function secondProject(t: Tenant): Promise<Project> {
  return projectRepo.insertProject({
    orgId: t.org.id,
    name: "Operations",
    slug: "operations",
    key: "OPS",
    description: null,
    visibility: "org",
    leadId: t.userIds.owner,
    color: "#6366f1",
    targetDate: null,
  });
}

async function memberIdOf(t: Tenant, userId: UserId) {
  const member = await memberRepo.findMember(t.org.id, userId);
  if (!member) throw new Error("fixture member missing");
  return member.id;
}

describe("UIM2 createRecurringIssue", () => {
  it("validates the rule and stores it", async () => {
    const t = await tenant();

    await expect(rule(t, { cadence: "weekly", weekday: null })).rejects.toBeInstanceOf(ZodError);
    await expect(rule(t, { cadence: "daily", weekday: 3 })).rejects.toBeInstanceOf(ZodError);
    await expect(rule(t, { cadence: "weekly", weekday: 8 })).rejects.toBeInstanceOf(ZodError);
    await expect(rule(t, { timezone: "Mars/Olympus_Mons" })).rejects.toBeInstanceOf(ZodError);
    await expect(rule(t, { startsOn: "2026-02-30" })).rejects.toBeInstanceOf(ZodError);
    expect(await recurringService.listRecurringIssues(t.actors.member, t.org.id)).toHaveLength(0);

    const created = await rule(t, {
      title: "Stand-up notes",
      cadence: "weekly",
      weekday: 5,
      timezone: "Asia/Tokyo",
      startsOn: "2026-03-06",
    });
    expect(created).toMatchObject({
      orgId: t.org.id,
      projectId: t.project.id,
      title: "Stand-up notes",
      cadence: "weekly",
      weekday: 5,
      timezone: "Asia/Tokyo",
      startsOn: "2026-03-06",
      lastOccurrenceOn: null,
      paused: false,
      createdBy: t.userIds.member,
    });
    expect((await stored(t, created.id))?.title).toBe("Stand-up notes");
  });

  it("checks tenant, permission, project and assignee before storing", async () => {
    const t = await tenant();
    const other = await tenant();

    await expect(
      recurringService.createRecurringIssue(t.actors.member, {
        orgId: other.org.id,
        projectId: other.project.id,
        title: "Cross tenant",
        priority: "none",
        assigneeId: null,
        cadence: "daily",
        weekday: null,
        timezone: "UTC",
        startsOn: "2026-03-02",
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    await expect(rule(t, {}, t.actors.viewer)).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(rule(t, { projectId: other.project.id })).rejects.toBeInstanceOf(NotFoundError);

    const archived = await secondProject(t);
    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: archived.id,
      archiveIssues: true,
    });
    await expect(rule(t, { projectId: archived.id })).rejects.toBeInstanceOf(AlreadyArchivedError);

    await expect(rule(t, { assigneeId: other.userIds.member })).rejects.toThrow();

    expect(await recurringService.listRecurringIssues(t.actors.member, t.org.id)).toHaveLength(0);
    expect(await recurringService.listRecurringIssues(other.actors.member, other.org.id)).toHaveLength(0);
  });

  it("caps rules per plan, counting paused rules", async () => {
    const free = await tenant("free");
    await expect(rule(free)).rejects.toThrow();
    expect(await recurringService.listRecurringIssues(free.actors.member, free.org.id)).toHaveLength(0);

    const starter = await tenant("starter");
    const first = await rule(starter, { title: "Cap one" });
    await rule(starter, { title: "Cap two" });
    await rule(starter, { title: "Cap three" });
    await recurringService.setRecurringIssuePaused(starter.actors.member, {
      orgId: starter.org.id,
      recurringIssueId: first.id,
      paused: true,
    });
    await expect(rule(starter, { title: "Cap four" })).rejects.toThrow();
    expect(await recurringService.listRecurringIssues(starter.actors.member, starter.org.id)).toHaveLength(3);
  });

  it("keeps rules inside their organization", async () => {
    const t = await tenant();
    const other = await tenant();
    const theirs = await rule(other, { title: "Their rule" });

    expect(await recurringService.listRecurringIssues(t.actors.member, t.org.id)).toHaveLength(0);
    await expect(
      recurringService.setRecurringIssuePaused(t.actors.member, {
        orgId: t.org.id,
        recurringIssueId: theirs.id,
        paused: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      recurringService.listRecurringIssues(t.actors.member, other.org.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
    expect((await stored(other, theirs.id))?.paused).toBe(false);
  });
});

describe("UIM2 runRecurringIssueJob", () => {
  it("files one issue per occurrence as the rule's creator, and re-running is a no-op", async () => {
    const t = await tenant();
    const created = await rule(t, {
      title: "Daily triage",
      priority: "high",
      assigneeId: t.userIds.admin,
      startsOn: "2026-03-02",
    });

    const events: { actorId: string | null; title: string }[] = [];
    const off = subscribe("issue.created", (payload) => {
      if (payload.orgId === t.org.id) events.push({ actorId: payload.actorId, title: payload.title });
    });

    try {
      await run("2026-03-05T10:00:00.000Z");
      await run("2026-03-05T23:59:59.999Z");

      const issues = await filed(t, "Daily triage");
      expect(issues.map((issue) => issue.title)).toEqual(["Daily triage (2026-03-05)"]);
      expect(issues[0]).toMatchObject({
        projectId: t.project.id,
        status: "backlog",
        priority: "high",
        assigneeId: t.userIds.admin,
        authorId: t.userIds.member,
      });
      expect(events).toEqual([{ actorId: t.userIds.member, title: "Daily triage (2026-03-05)" }]);
      expect((await stored(t, created.id))?.lastOccurrenceOn).toBe("2026-03-05");

      await run("2026-03-06T00:00:00.000Z");
      expect(await filedTitles(t, "Daily triage")).toEqual([
        "Daily triage (2026-03-05)",
        "Daily triage (2026-03-06)",
      ]);
    } finally {
      off();
    }
  });

  it("never back-fills missed occurrences", async () => {
    const t = await tenant();
    const created = await rule(t, { title: "Backlog grooming", startsOn: "2026-03-01" });

    await run("2026-03-03T12:00:00.000Z");
    await run("2026-03-09T08:00:00.000Z");

    expect(await filedTitles(t, "Backlog grooming")).toEqual([
      "Backlog grooming (2026-03-03)",
      "Backlog grooming (2026-03-09)",
    ]);
    expect((await stored(t, created.id))?.lastOccurrenceOn).toBe("2026-03-09");
  });

  it("starts each occurrence at midnight in the rule's own time zone", async () => {
    const t = await tenant();
    await rule(t, { title: "Tokyo report", timezone: "Asia/Tokyo", startsOn: "2026-03-10" });
    await rule(t, { title: "LA report", timezone: "America/Los_Angeles", startsOn: "2026-03-01" });

    await run("2026-03-09T14:59:59.999Z");
    expect(await filedTitles(t, "Tokyo report")).toEqual([]);

    await run("2026-03-09T15:00:00.000Z");
    expect(await filedTitles(t, "Tokyo report")).toEqual(["Tokyo report (2026-03-10)"]);

    // Los Angeles is on daylight time (UTC-7) from 8 March 2026.
    await run("2026-03-10T06:59:00.000Z");
    expect(await filedTitles(t, "LA report")).toEqual(["LA report (2026-03-09)"]);
    await run("2026-03-10T07:00:00.000Z");
    expect(await filedTitles(t, "LA report")).toEqual([
      "LA report (2026-03-09)",
      "LA report (2026-03-10)",
    ]);
  });

  it("fires weekly rules on their ISO weekday only, never before the start date", async () => {
    const t = await tenant();
    // 2026-03-03 is a Tuesday; weekday 1 is Monday.
    await rule(t, { title: "Monday planning", cadence: "weekly", weekday: 1, startsOn: "2026-03-03" });
    const later = await rule(t, { title: "Later start", startsOn: "2026-04-01" });

    await run("2026-03-08T12:00:00.000Z");
    expect(await filedTitles(t, "Monday planning")).toEqual([]);

    await run("2026-03-20T12:00:00.000Z");
    expect(await filedTitles(t, "Monday planning")).toEqual(["Monday planning (2026-03-16)"]);

    await run("2026-03-22T23:00:00.000Z");
    expect(await filedTitles(t, "Monday planning")).toEqual(["Monday planning (2026-03-16)"]);

    await run("2026-03-23T00:00:00.000Z");
    expect(await filedTitles(t, "Monday planning")).toEqual([
      "Monday planning (2026-03-16)",
      "Monday planning (2026-03-23)",
    ]);

    expect(await filedTitles(t, "Later start")).toEqual([]);
    expect((await stored(t, later.id))?.lastOccurrenceOn).toBeNull();
  });

  it("skips paused rules, and resuming files only the latest occurrence", async () => {
    const t = await tenant();
    const created = await rule(t, { title: "Paused digest", startsOn: "2026-03-02" });
    const toggle = (paused: boolean) =>
      recurringService.setRecurringIssuePaused(t.actors.member, {
        orgId: t.org.id,
        recurringIssueId: created.id,
        paused,
      });

    expect((await toggle(true)).paused).toBe(true);
    await run("2026-03-05T12:00:00.000Z");
    expect(await filedTitles(t, "Paused digest")).toEqual([]);

    expect((await toggle(false)).paused).toBe(false);
    await run("2026-03-07T12:00:00.000Z");
    expect(await filedTitles(t, "Paused digest")).toEqual(["Paused digest (2026-03-07)"]);
  });

  it("waits while the project is archived and resumes after it is restored", async () => {
    const t = await tenant();
    const project = await secondProject(t);
    const created = await rule(t, { title: "Ops review", projectId: project.id });

    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: project.id,
      archiveIssues: true,
    });
    await run("2026-03-05T12:00:00.000Z");
    expect(await filedTitles(t, "Ops review")).toEqual([]);
    expect(await stored(t, created.id)).toMatchObject({ paused: false, lastOccurrenceOn: null });

    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);
    await run("2026-03-06T12:00:00.000Z");
    const issues = await filed(t, "Ops review");
    expect(issues.map((issue) => issue.title)).toEqual(["Ops review (2026-03-06)"]);
    expect(issues[0]?.projectId).toBe(project.id);
  });

  it("pauses the rule when its creator can no longer file issues", async () => {
    const t = await tenant();
    const demoted = await rule(t, { title: "Demoted creator" });
    const kept = await rule(t, { title: "Admin rule" }, t.actors.admin);
    await memberService.updateMemberRole(t.actors.owner, {
      orgId: t.org.id,
      memberId: await memberIdOf(t, t.userIds.member),
      role: "viewer",
    });

    const r = await tenant();
    const removed = await rule(r, { title: "Removed creator" });
    await memberService.removeMember(r.actors.owner, {
      orgId: r.org.id,
      memberId: await memberIdOf(r, r.userIds.member),
    });

    await run("2026-03-05T12:00:00.000Z");

    expect(await filedTitles(t, "Demoted creator")).toEqual([]);
    expect(await filedTitles(r, "Removed creator")).toEqual([]);
    expect(await filedTitles(t, "Admin rule")).toEqual(["Admin rule (2026-03-05)"]);

    const rows = await recurringService.listRecurringIssues(t.actors.admin, t.org.id);
    expect(rows.find((row) => row.id === demoted.id)).toMatchObject({ paused: true, lastOccurrenceOn: null });
    expect(rows.find((row) => row.id === kept.id)).toMatchObject({ paused: false });
    const removedRow = (await recurringService.listRecurringIssues(r.actors.admin, r.org.id)).find(
      (row) => row.id === removed.id,
    );
    expect(removedRow?.paused).toBe(true);
  });

  it("files the issue unassigned when the assignee has left", async () => {
    const t = await tenant();
    await rule(t, { title: "Orphaned assignee", assigneeId: t.userIds.admin });
    await memberService.removeMember(t.actors.owner, {
      orgId: t.org.id,
      memberId: await memberIdOf(t, t.userIds.admin),
    });

    await run("2026-03-05T12:00:00.000Z");
    const issues = await filed(t, "Orphaned assignee");
    expect(issues.map((issue) => issue.title)).toEqual(["Orphaned assignee (2026-03-05)"]);
    expect(issues[0]?.assigneeId).toBeNull();
  });

  it("leaves the rule to retry when the project's issue quota refuses the issue", async () => {
    const t = await tenant("starter");
    const created = await rule(t, { title: "Quota bound" });

    const seeded: Issue[] = [];
    for (let number = 1; number <= 1_000; number += 1) {
      seeded.push(
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
            dueAt: null as IsoTimestamp | null,
            labelIds: [],
          },
          t.userIds.member,
          number,
        ),
      );
    }

    await run("2026-03-05T12:00:00.000Z");
    expect(await filedTitles(t, "Quota bound")).toEqual([]);
    expect(await stored(t, created.id)).toMatchObject({ paused: false, lastOccurrenceOn: null });

    const first = seeded[0];
    if (!first) throw new Error("seed missing");
    await issueRepo.archiveIssue(t.org.id, first.id);

    await run("2026-03-06T12:00:00.000Z");
    const page = await issueRepo.listIssues({
      orgId: t.org.id,
      limit: 5,
      cursor: null,
      query: "Quota bound (",
    });
    expect(page.items.map((issue) => issue.title)).toEqual(["Quota bound (2026-03-06)"]);
    expect((await stored(t, created.id))?.lastOccurrenceOn).toBe("2026-03-06");
  });

  it("runs from the job queue", async () => {
    const t = await tenant();
    await rule(t, { title: "Queued rule", startsOn: "2026-03-02" });

    resetQueue();
    vi.setSystemTime(new Date("2026-03-05T10:00:00.000Z"));
    enqueue({
      id: "uim2-recurring",
      kind: "recurring-issues" as JobKind,
      runAt: "2026-03-05T09:00:00.000Z" as IsoTimestamp,
      attempts: 0,
      payload: {},
    });
    await drain();
    resetQueue();

    expect(await filedTitles(t, "Queued rule")).toEqual(["Queued rule (2026-03-05)"]);
  });
});
