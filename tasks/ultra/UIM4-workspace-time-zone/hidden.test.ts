/**
 * UIM4 — every workspace runs on its own clock.
 *
 * `settings.timeZone` (IANA, default "UTC") decides every calendar-day
 * boundary: when an issue becomes overdue (the sweep, `isOverdue()`, the
 * project counter), when the digest runs and which window it covers, how the
 * activity feed is grouped, and where the retention cut-off falls.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { digestWindow, isOverdue, localDate, startOfLocalDay } from "@/lib/date";
import { subscribe } from "@/lib/event-bus";
import { organizationSettingsSchema } from "@/schemas/organization";
import { runCleanupArchivedJob } from "@/server/jobs/cleanup-archived-job";
import { runDigestEmailJob, shouldRunForOrg } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { groupByDay } from "@/server/services/activity-service";
import * as emailService from "@/server/services/email-service";
import * as issueService from "@/server/services/issue-service";
import * as organizationService from "@/server/services/organization-service";
import * as projectService from "@/server/services/project-service";
import { toIsoTimestamp } from "@/types/common";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { ActivityEvent } from "@/types/activity";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Organization } from "@/types/organization";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

const iso = (value: string): IsoTimestamp => value as IsoTimestamp;

/** A tenant on `timeZone`, registered with the rollup so every job finds it. */
async function makeTenant(
  slug: string,
  timeZone: string,
  plan: PlanId = "growth",
  digestHourUtc?: number,
): Promise<Tenant> {
  const tenant = await createTenant(slug, plan);
  const org = await orgRepo.updateOrg(tenant.org.id, {
    orgId: tenant.org.id,
    settings: {
      timeZone,
      ...(digestHourUtc === undefined ? {} : { digestHourUtc }),
    },
  });
  await usageRepo.recomputeUsage(tenant.org.id);
  return { ...tenant, org };
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

async function insertIssue(
  tenant: Tenant,
  title: string,
  dueAt: string | null,
): Promise<Issue> {
  const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
  return issueRepo.insertIssue(
    issueInput(tenant.org.id, tenant.project.id, { title, dueAt }),
    tenant.userIds.owner,
    number,
  );
}

function captureOverdue(): string[] {
  const seen: string[] = [];
  detachers.push(
    subscribe("issue.overdue", (payload) => {
      seen.push(payload.issueId);
    }),
  );
  return seen;
}

async function subscribeMemberToDigest(tenant: Tenant): Promise<void> {
  await preferenceRepo.upsertPreference({
    orgId: tenant.org.id,
    userId: tenant.userIds.member,
    kind: "comment_created",
    inApp: false,
    email: false,
    digestOnly: true,
  });
}

async function notifyMemberAt(tenant: Tenant, instant: string, title: string): Promise<void> {
  await at(instant, () =>
    notificationRepo.insertNotification(tenant.org.id, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.member,
      kind: "comment_created",
      title,
      body: title,
      href: "/issues/1",
      actorId: null,
      channels: ["email"],
    }),
  );
}

/** Pulls a `<td>key</td><td>value</td>` cell out of the generic email table. */
function cell(html: string, key: string): string | null {
  const match = html.match(new RegExp(`<td>${key}</td><td>([^<]*)</td>`));
  return match?.[1] ?? null;
}

function digestsTo(
  spy: { mock: { calls: ReadonlyArray<ReadonlyArray<{ to: string; html: string }>> } },
  email: string,
): string[] {
  return spy.mock.calls
    .map((call) => call[0])
    .filter((message): message is { to: string; html: string } => message?.to === email)
    .map((message) => message.html);
}

async function recordActivityAt(tenant: Tenant, occurredAt: string, subjectId: string): Promise<void> {
  await activityRepo.insertActivity({
    orgId: tenant.org.id,
    action: "issue.created",
    actorId: null,
    subjectKind: "issue",
    subjectId,
    projectId: null,
    summary: subjectId,
    metadata: {},
    occurredAt: iso(occurredAt),
  });
}

async function activityExists(tenant: Tenant, subjectId: string): Promise<boolean> {
  const rows = await activityRepo.listActivityForSubject(tenant.org.id, "issue", subjectId);
  return rows.length > 0;
}

function withClock(org: Organization, timeZone: string, digestHourUtc: number): Organization {
  return { ...org, settings: { ...org.settings, timeZone, digestHourUtc } };
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

describe("UIM4 workspace time zone", () => {
  it("reads local calendar days off an IANA zone", () => {
    expect(localDate(iso("2026-06-01T20:00:00.000Z"), "Asia/Tokyo")).toBe("2026-06-02");
    expect(localDate(iso("2026-06-01T20:00:00.000Z"), "America/Los_Angeles")).toBe("2026-06-01");
    expect(localDate(iso("2026-06-01T20:00:00.000Z"), "UTC")).toBe("2026-06-01");

    expect(startOfLocalDay(new Date("2026-06-01T20:00:00.000Z"), "Asia/Tokyo")).toBe(
      "2026-06-01T15:00:00.000Z",
    );
    // The day the US clocks spring forward still starts on standard time …
    expect(startOfLocalDay(new Date("2026-03-08T12:00:00.000Z"), "America/Los_Angeles")).toBe(
      "2026-03-08T08:00:00.000Z",
    );
    // … and the next one on daylight time.
    expect(startOfLocalDay(new Date("2026-03-09T12:00:00.000Z"), "America/Los_Angeles")).toBe(
      "2026-03-09T07:00:00.000Z",
    );
  });

  it("treats a due date as a whole day on the workspace clock", () => {
    const due = iso("2026-06-01T00:00:00.000Z");

    // UTC by default: still due "today" late in the evening, overdue next day.
    expect(isOverdue(due, new Date("2026-06-01T23:00:00.000Z"))).toBe(false);
    expect(isOverdue(due, new Date("2026-06-02T00:30:00.000Z"))).toBe(true);

    // In Los Angeles that instant is the evening of 31 May.
    expect(isOverdue(due, new Date("2026-06-01T06:30:00.000Z"), "America/Los_Angeles")).toBe(false);
    expect(isOverdue(due, new Date("2026-06-01T07:30:00.000Z"), "America/Los_Angeles")).toBe(true);

    // In Tokyo, 01:00 on 1 June stays due until 1 June ends there.
    const tokyoDue = iso("2026-05-31T16:00:00.000Z");
    expect(isOverdue(tokyoDue, new Date("2026-06-01T14:30:00.000Z"), "Asia/Tokyo")).toBe(false);
    expect(isOverdue(tokyoDue, new Date("2026-06-01T15:30:00.000Z"), "Asia/Tokyo")).toBe(true);
    expect(isOverdue(null, new Date("2030-01-01T00:00:00.000Z"), "Asia/Tokyo")).toBe(false);
  });

  it("stores the zone with the other settings and refuses unknown zones", async () => {
    const tenant = await createTenant("uim4-settings", "growth");
    expect((await orgRepo.findOrgById(tenant.org.id))?.settings.timeZone).toBe("UTC");

    await organizationService.updateOrganization(tenant.actors.owner, {
      orgId: tenant.org.id,
      settings: { timeZone: "Europe/Berlin" },
    });
    const berlin = await orgRepo.findOrgById(tenant.org.id);
    expect(berlin?.settings.timeZone).toBe("Europe/Berlin");
    expect(berlin?.settings.digestHourUtc).toBe(7);

    await expect(
      organizationService.updateOrganization(tenant.actors.owner, {
        orgId: tenant.org.id,
        settings: { timeZone: "Mars/Olympus_Mons" },
      }),
    ).rejects.toBeInstanceOf(RangeError);
    expect((await orgRepo.findOrgById(tenant.org.id))?.settings.timeZone).toBe("Europe/Berlin");

    expect(organizationSettingsSchema.parse({}).timeZone).toBe("UTC");
    expect(organizationSettingsSchema.safeParse({ timeZone: "Asia/Tokyo" }).success).toBe(true);
    expect(organizationSettingsSchema.safeParse({ timeZone: "Not/AZone" }).success).toBe(false);
  });

  it("announces an issue overdue only once its local due day has ended", async () => {
    const la = await makeTenant("uim4-overdue-la", "America/Los_Angeles");
    const utc = await makeTenant("uim4-overdue-utc", "UTC");
    const laEvening = await insertIssue(la, "Due on the evening of 31 May", "2026-06-01T00:00:00.000Z");
    const laMidday = await insertIssue(la, "Due at noon on 1 June", "2026-06-01T19:00:00.000Z");
    const utcMidnight = await insertIssue(utc, "Due on 1 June", "2026-06-01T00:00:00.000Z");

    const seen = captureOverdue();

    await runOverdueIssueJob(new Date("2026-06-01T06:30:00.000Z"));
    expect(seen).not.toContain(laEvening.id);
    expect(seen).not.toContain(utcMidnight.id);

    await runOverdueIssueJob(new Date("2026-06-01T07:30:00.000Z"));
    expect(seen.filter((id) => id === laEvening.id)).toHaveLength(1);
    expect(seen).not.toContain(laMidday.id);
    expect(seen).not.toContain(utcMidnight.id);

    await runOverdueIssueJob(new Date("2026-06-02T00:30:00.000Z"));
    expect(seen.filter((id) => id === utcMidnight.id)).toHaveLength(1);
    expect(seen).not.toContain(laMidday.id);
    expect(seen.filter((id) => id === laEvening.id)).toHaveLength(1);
  });

  it("keeps a zone ahead of UTC due until its own midnight, and still skips closed and archived issues", async () => {
    const tokyo = await makeTenant("uim4-overdue-tokyo", "Asia/Tokyo");
    const dueFirstJune = await insertIssue(tokyo, "Due 01:00 on 1 June JST", "2026-05-31T16:00:00.000Z");
    const closed = await insertIssue(tokyo, "Long overdue but done", "2026-05-01T00:00:00.000Z");
    await issueRepo.setIssueStatus(tokyo.org.id, closed.id, "done");
    const archived = await insertIssue(tokyo, "Long overdue but archived", "2026-05-01T00:00:00.000Z");
    await issueRepo.archiveIssue(tokyo.org.id, archived.id);

    const seen = captureOverdue();

    await runOverdueIssueJob(new Date("2026-06-01T14:30:00.000Z"));
    expect(seen).not.toContain(dueFirstJune.id);

    await runOverdueIssueJob(new Date("2026-06-01T15:30:00.000Z"));
    expect(seen).toContain(dueFirstJune.id);
    expect(seen).not.toContain(closed.id);
    expect(seen).not.toContain(archived.id);
  });

  it("counts a project's overdue issues by the same rule on the project page", async () => {
    const tokyo = await makeTenant("uim4-stats-one", "Asia/Tokyo");

    await at("2026-06-01T10:00:00.000Z", async () => {
      const actor = tokyo.actors.member;
      const create = (title: string, dueAt: string | null) =>
        issueService.createIssue(actor, issueInput(tokyo.org.id, tokyo.project.id, { title, dueAt }));

      await create("Due today in Tokyo", "2026-05-31T16:00:00.000Z");
      await create("Due yesterday in Tokyo", "2026-05-31T14:00:00.000Z");
      await create("No due date", null);
      const done = await create("Late but done", "2026-05-20T00:00:00.000Z");
      await issueService.changeIssueStatus(actor, { orgId: tokyo.org.id, issueId: done.id, status: "done" });
      const canceled = await create("Late but canceled", "2026-05-20T00:00:00.000Z");
      await issueService.changeIssueStatus(actor, { orgId: tokyo.org.id, issueId: canceled.id, status: "canceled" });
      const gone = await create("Late but archived", "2026-05-20T00:00:00.000Z");
      await issueService.archiveIssue(actor, tokyo.org.id, gone.id);

      const { stats } = await projectService.getProject(actor, tokyo.org.id, tokyo.project.slug);
      expect(stats.overdueIssues).toBe(1);
      expect(stats.openIssues).toBe(3);
      expect(stats.closedIssues).toBe(2);
    });
  });

  it("gives the project list the same overdue counter as the project page", async () => {
    const la = await makeTenant("uim4-stats-list", "America/Los_Angeles");

    await at("2026-06-01T06:00:00.000Z", async () => {
      const actor = la.actors.member;
      const create = (title: string, dueAt: string | null) =>
        issueService.createIssue(actor, issueInput(la.org.id, la.project.id, { title, dueAt }));

      // 31 May in Los Angeles — still today there at 23:00 local.
      await create("Due this evening in LA", "2026-06-01T01:00:00.000Z");
      await create("Due on 30 May in LA", "2026-05-31T05:00:00.000Z");
      const done = await create("Late but done", "2026-05-01T00:00:00.000Z");
      await issueService.changeIssueStatus(actor, { orgId: la.org.id, issueId: done.id, status: "done" });

      const page = await projectService.listProjects(actor, {
        orgId: la.org.id,
        limit: 25,
        cursor: null,
      });
      const entry = page.items.find((item) => item.project.id === la.project.id);
      expect(entry?.stats.overdueIssues).toBe(1);

      const single = await projectService.getProject(actor, la.org.id, la.project.slug);
      expect(single.stats.overdueIssues).toBe(1);
    });
  });

  it("schedules the digest on the workspace clock", async () => {
    const tenant = await createTenant("uim4-schedule", "growth");

    const tokyo = withClock(tenant.org, "Asia/Tokyo", 9);
    expect(shouldRunForOrg(tokyo, new Date("2026-06-01T00:30:00.000Z"))).toBe(true);
    expect(shouldRunForOrg(tokyo, new Date("2026-06-01T09:00:00.000Z"))).toBe(false);

    const newYork = withClock(tenant.org, "America/New_York", 7);
    expect(shouldRunForOrg(newYork, new Date("2026-01-15T12:10:00.000Z"))).toBe(true);
    expect(shouldRunForOrg(newYork, new Date("2026-07-15T11:10:00.000Z"))).toBe(true);
    expect(shouldRunForOrg(newYork, new Date("2026-07-15T12:10:00.000Z"))).toBe(false);
    expect(
      shouldRunForOrg({ ...tokyo, archivedAt: iso("2026-05-01T00:00:00.000Z") }, new Date("2026-06-01T00:30:00.000Z")),
    ).toBe(false);
  });

  it("computes the digest window between two local digest hours", () => {
    expect(digestWindow(8, new Date("2026-03-15T12:00:00.000Z"))).toEqual({
      start: "2026-03-14T08:00:00.000Z",
      end: "2026-03-15T08:00:00.000Z",
    });
    expect(digestWindow(9, new Date("2026-06-01T00:10:00.000Z"), "Asia/Tokyo")).toEqual({
      start: "2026-05-31T00:00:00.000Z",
      end: "2026-06-01T00:00:00.000Z",
    });
    // 08:50 in Tokyo: today's 09:00 has not come yet.
    expect(digestWindow(9, new Date("2026-05-31T23:50:00.000Z"), "Asia/Tokyo")).toEqual({
      start: "2026-05-30T00:00:00.000Z",
      end: "2026-05-31T00:00:00.000Z",
    });
    // Spring forward: 07:00 EST → 07:00 EDT is 23 hours.
    expect(digestWindow(7, new Date("2026-03-08T12:30:00.000Z"), "America/New_York")).toEqual({
      start: "2026-03-07T12:00:00.000Z",
      end: "2026-03-08T11:00:00.000Z",
    });
    // Fall back: 07:00 EDT → 07:00 EST is 25 hours.
    expect(digestWindow(7, new Date("2026-11-01T13:00:00.000Z"), "America/New_York")).toEqual({
      start: "2026-10-31T11:00:00.000Z",
      end: "2026-11-01T12:00:00.000Z",
    });
    expect(() => digestWindow(24, new Date("2026-06-01T00:00:00.000Z"), "Asia/Tokyo")).toThrow(RangeError);
  });

  it("mails the local window and leaves later notifications for the next digest", async () => {
    const tokyo = await makeTenant("uim4-digest-tokyo", "Asia/Tokyo", "growth", 9);
    await subscribeMemberToDigest(tokyo);
    const email = `member@uim4-digest-tokyo.test`;

    await notifyMemberAt(tokyo, "2026-05-30T23:59:00.000Z", "Before the window");
    await notifyMemberAt(tokyo, "2026-05-31T00:05:00.000Z", "Early in the window");
    await notifyMemberAt(tokyo, "2026-05-31T12:00:00.000Z", "Middle of the window");
    await notifyMemberAt(tokyo, "2026-06-01T00:05:00.000Z", "After the cut");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    await runDigestEmailJob(new Date("2026-06-01T00:10:00.000Z"));

    const first = digestsTo(sendSpy, email);
    expect(first).toHaveLength(1);
    expect(cell(first[0] ?? "", "entryCount")).toBe("2");
    expect(cell(first[0] ?? "", "headline")).toBe("Middle of the window");

    const unread = await notificationRepo.listUnreadSince(
      tokyo.org.id,
      tokyo.userIds.member,
      iso("2026-05-01T00:00:00.000Z"),
    );
    expect(unread.map((row) => row.title).sort()).toEqual(["After the cut", "Before the window"]);

    sendSpy.mockClear();
    await runDigestEmailJob(new Date("2026-06-02T00:10:00.000Z"));

    const second = digestsTo(sendSpy, email);
    expect(second).toHaveLength(1);
    expect(cell(second[0] ?? "", "entryCount")).toBe("1");
    expect(cell(second[0] ?? "", "headline")).toBe("After the cut");
  });

  it("covers a 23-hour window on the day the clocks spring forward", async () => {
    const newYork = await makeTenant("uim4-digest-dst", "America/New_York", "growth", 7);
    await subscribeMemberToDigest(newYork);
    const email = `member@uim4-digest-dst.test`;

    await notifyMemberAt(newYork, "2026-03-07T11:30:00.000Z", "06:30 EST on Saturday");
    await notifyMemberAt(newYork, "2026-03-07T12:30:00.000Z", "07:30 EST on Saturday");
    await notifyMemberAt(newYork, "2026-03-08T10:00:00.000Z", "06:00 EDT on Sunday");

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);

    // 07:20 EDT on Sunday 8 March.
    await runDigestEmailJob(new Date("2026-03-08T11:20:00.000Z"));

    const sent = digestsTo(sendSpy, email);
    expect(sent).toHaveLength(1);
    expect(cell(sent[0] ?? "", "entryCount")).toBe("2");
    expect(cell(sent[0] ?? "", "windowStart")).toBe("2026-03-07T12:00:00.000Z");
    expect(cell(sent[0] ?? "", "windowEnd")).toBe("2026-03-08T11:00:00.000Z");
  });

  it("groups the activity feed by local calendar day", () => {
    const build = (id: string, occurredAt: string): ActivityEvent => ({
      id: id as ActivityEvent["id"],
      orgId: "01HZZZAAAAAAAAAAAAAAAAAAAA" as ActivityEvent["orgId"],
      action: "issue.created",
      actorId: null,
      subjectKind: "issue",
      subjectId: id,
      projectId: null,
      summary: "Created issue",
      metadata: {},
      occurredAt: occurredAt as ActivityEvent["occurredAt"],
    });
    const events = [
      build("e3", "2026-01-02T16:00:00.000Z"),
      build("e2", "2026-01-02T01:00:00.000Z"),
      build("e1", "2026-01-01T23:30:00.000Z"),
    ];

    const shape = (groups: ReturnType<typeof groupByDay>) =>
      groups.map((group) => [group.day, group.events.map((event) => event.id)]);

    expect(shape(groupByDay(events))).toEqual([
      ["2026-01-02", ["e3", "e2"]],
      ["2026-01-01", ["e1"]],
    ]);
    expect(shape(groupByDay(events, "Asia/Tokyo"))).toEqual([
      ["2026-01-03", ["e3"]],
      ["2026-01-02", ["e2", "e1"]],
    ]);
    expect(shape(groupByDay(events, "America/Los_Angeles"))).toEqual([
      ["2026-01-02", ["e3"]],
      ["2026-01-01", ["e2", "e1"]],
    ]);
  });

  it("cuts retention at local midnight, whole calendar days back", async () => {
    // Free plan: 30 days. 05:00 on 11 June in Tokyo → cut-off is local
    // midnight starting 12 May, i.e. 2026-05-11T15:00Z.
    const tokyo = await makeTenant("uim4-retention-tokyo", "Asia/Tokyo", "free");

    await recordActivityAt(tokyo, "2026-05-11T14:59:00.000Z", "uim4-tokyo-old");
    await recordActivityAt(tokyo, "2026-05-11T15:01:00.000Z", "uim4-tokyo-kept");

    const oldIssue = await insertIssue(tokyo, "Archived before the cut-off", null);
    const newIssue = await insertIssue(tokyo, "Archived after the cut-off", null);
    for (const issue of [oldIssue, newIssue]) {
      await searchRepo.upsertSearchDocument(tokyo.org.id, "issue", issue.id, issue.title, issue.projectId);
    }
    await at("2026-05-11T14:00:00.000Z", () => issueRepo.archiveIssue(tokyo.org.id, oldIssue.id));
    await at("2026-05-11T16:00:00.000Z", () => issueRepo.archiveIssue(tokyo.org.id, newIssue.id));

    await runCleanupArchivedJob(new Date("2026-06-10T20:00:00.000Z"));

    expect(await activityExists(tokyo, "uim4-tokyo-old")).toBe(false);
    expect(await activityExists(tokyo, "uim4-tokyo-kept")).toBe(true);

    const docs = await searchRepo.searchDocuments({
      orgId: tokyo.org.id,
      q: "Archived",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(docs.items.map((row) => row.subjectId)).toEqual([newIssue.id]);
  });

  it("counts retention in calendar days across a DST change", async () => {
    // 08:00 EDT on 20 March; 30 local days back is midnight EST on 18 Feb.
    const newYork = await makeTenant("uim4-retention-dst", "America/New_York", "free");

    await recordActivityAt(newYork, "2026-02-18T04:30:00.000Z", "uim4-ny-old");
    await recordActivityAt(newYork, "2026-02-18T05:30:00.000Z", "uim4-ny-kept");

    await runCleanupArchivedJob(new Date("2026-03-20T12:00:00.000Z"));

    expect(await activityExists(newYork, "uim4-ny-old")).toBe(false);
    expect(await activityExists(newYork, "uim4-ny-kept")).toBe(true);
    expect(toIsoTimestamp(new Date("2026-02-18T05:00:00.000Z"))).toBe(
      startOfLocalDay(new Date("2026-02-18T12:00:00.000Z"), "America/New_York"),
    );
  });
});
