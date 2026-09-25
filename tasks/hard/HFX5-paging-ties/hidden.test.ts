/**
 * Hidden test for HFX5: "Load more" must never drop (or repeat) rows that
 * share a timestamp, in every cursor-paged list.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import * as activityService from "@/server/services/activity-service";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Page } from "@/types/common";

let cleanup: () => void;
let tenant: Tenant;
let other: Tenant;

/** Two instants: a bulk action at T2 and one earlier batch at T1. */
const T1 = new Date("2026-03-01T09:00:00.000Z");
const T2 = new Date("2026-03-01T09:05:00.000Z");

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("pager-ties", "growth");
  other = await createTenant("pager-ties-other", "growth");
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

/** Runs `work` with the wall clock frozen at `at`. */
async function at<T>(instant: Date, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(instant);
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

/** Follows `nextCursor` to the end with a small page size, collecting ids. */
async function walk<T extends { id: string }>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
): Promise<{ ids: string[]; totals: number[] }> {
  const ids: string[] = [];
  const totals: number[] = [];
  let cursor: string | null = null;

  for (let guard = 0; guard < 20; guard += 1) {
    const page: Page<T> = await fetchPage(cursor);
    ids.push(...page.items.map((item) => item.id));
    totals.push(page.total);
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }

  return { ids, totals };
}

describe("cursor paging over rows that share a timestamp", () => {
  it("walks the whole notification inbox, once each, in listing order", async () => {
    const recipient = tenant.userIds.member;

    await at(T1, async () => {
      for (let i = 0; i < 2; i += 1) {
        await notificationService.notify(tenant.org.id, "issue_assigned", [recipient], {
          title: `early ${i}`,
          body: "early",
          href: "/issues/early",
          actorId: tenant.userIds.owner,
        });
      }
    });
    await at(T2, async () => {
      for (let i = 0; i < 5; i += 1) {
        await notificationService.notify(tenant.org.id, "issue_assigned", [recipient], {
          title: `bulk ${i}`,
          body: "bulk",
          href: "/issues/bulk",
          actorId: tenant.userIds.owner,
        });
      }
      // Same instant, another tenant: must never show up.
      await notificationService.notify(other.org.id, "issue_assigned", [other.userIds.member], {
        title: "elsewhere",
        body: "elsewhere",
        href: "/issues/elsewhere",
        actorId: other.userIds.owner,
      });
    });

    const full = await notificationService.listNotifications(tenant.actors.member, {
      orgId: tenant.org.id,
      recipientId: recipient,
      unreadOnly: false,
      limit: 100,
      cursor: null,
    });
    expect(full.total).toBe(7);

    const walked = await walk((cursor) =>
      notificationService.listNotifications(tenant.actors.member, {
        orgId: tenant.org.id,
        recipientId: recipient,
        unreadOnly: false,
        limit: 2,
        cursor,
      }),
    );

    expect(walked.ids).toEqual(full.items.map((item) => item.id));
    expect(new Set(walked.ids).size).toBe(7);
    expect(walked.totals.every((total) => total === 7)).toBe(true);
  });

  it("walks the whole audit log, once each, in listing order", async () => {
    const action = "flag.toggled" as const;

    await at(T1, async () => {
      await activityService.record(tenant.org.id, action, {
        actorId: tenant.userIds.admin,
        subjectKind: "feature_flag",
        subjectId: "kanban_board",
        projectId: null,
        summary: "early toggle",
      });
    });
    await at(T2, async () => {
      for (let i = 0; i < 6; i += 1) {
        await activityService.record(tenant.org.id, action, {
          actorId: tenant.userIds.admin,
          subjectKind: "feature_flag",
          subjectId: `flag-${i}`,
          projectId: null,
          summary: `bulk toggle ${i}`,
        });
      }
      await activityService.record(other.org.id, action, {
        actorId: other.userIds.admin,
        subjectKind: "feature_flag",
        subjectId: "elsewhere",
        projectId: null,
        summary: "other tenant",
      });
    });

    const full = await activityService.listActivity(tenant.actors.admin, {
      orgId: tenant.org.id,
      action: [action],
      limit: 100,
      cursor: null,
    });
    expect(full.total).toBe(7);

    for (const pageSize of [2, 3]) {
      const walked = await walk((cursor) =>
        activityService.listActivity(tenant.actors.admin, {
          orgId: tenant.org.id,
          action: [action],
          limit: pageSize,
          cursor,
        }),
      );

      expect(walked.ids).toEqual(full.items.map((item) => item.id));
      expect(new Set(walked.ids).size).toBe(7);
    }
  });

  it("walks the whole issue list, once each, in listing order", async () => {
    const project = tenant.project.id;

    await at(T2, async () => {
      for (let i = 0; i < 5; i += 1) {
        await issueService.createIssue(
          tenant.actors.member,
          issueInput(tenant.org.id, project, { title: `Bulk imported ${i}` }),
        );
      }
    });

    const full = await issueService.listIssues(tenant.actors.member, {
      orgId: tenant.org.id,
      projectId: project,
      limit: 100,
      cursor: null,
    });
    expect(full.total).toBe(5);

    const walked = await walk((cursor) =>
      issueService.listIssues(tenant.actors.member, {
        orgId: tenant.org.id,
        projectId: project,
        limit: 2,
        cursor,
      }),
    );

    expect(walked.ids).toEqual(full.items.map((item) => item.id));
    expect(new Set(walked.ids).size).toBe(5);
  });
});
