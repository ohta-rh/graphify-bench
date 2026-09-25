/**
 * Hidden test for HFX6: archiving a project must cascade to its *live* issues
 * only. Issues archived earlier keep their original archive stamp, are not
 * counted again, and the issue usage counter stays equal to a recount.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as activityService from "@/server/services/activity-service";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { TaskflowEventMap, Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
const detachers: Unsubscribe[] = [];

/** When two issues were archived by hand, weeks before the project went. */
const EARLIER = new Date("2026-02-01T10:00:00.000Z");
/** When the whole project was archived. */
const LATER = new Date("2026-03-15T16:30:00.000Z");

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
  tenant = await createTenant("cascade", "growth");
  await usageRepo.recomputeUsage(tenant.org.id);
});

afterEach(() => {
  vi.useRealTimers();
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

async function atInstant<T>(instant: Date, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(instant);
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

describe("archiving a project that already has archived issues", () => {
  it("touches only the live issues and keeps every counter honest", async () => {
    const orgId = tenant.org.id;
    const projectId = tenant.project.id;

    const created = [];
    for (const title of ["Alpha issue", "Bravo issue", "Charlie issue", "Delta issue", "Echo issue"]) {
      created.push(
        await issueService.createIssue(
          tenant.actors.member,
          issueInput(orgId, projectId, { title }),
        ),
      );
    }
    const [alpha, bravo, charlie, delta, echo] = created as [
      (typeof created)[number],
      (typeof created)[number],
      (typeof created)[number],
      (typeof created)[number],
      (typeof created)[number],
    ];

    // A second project in the same org whose issue must be left alone.
    const side = await projectRepo.insertProject({
      orgId,
      name: "Side project",
      slug: "side-project",
      key: "SIDE",
      description: null,
      visibility: "org",
      leadId: tenant.userIds.owner,
      color: "#6366f1",
      targetDate: null,
    });
    const bystander = await issueService.createIssue(
      tenant.actors.member,
      issueInput(orgId, side.id, { title: "Bystander issue" }),
    );

    await atInstant(EARLIER, async () => {
      await issueService.archiveIssue(tenant.actors.member, orgId, alpha.id);
      await issueService.archiveIssue(tenant.actors.member, orgId, bravo.id);
    });

    const before = await usageRepo.getUsage(orgId);
    expect(before.issuesUsed).toBe(4);

    const seen: TaskflowEventMap["project.archived"][] = [];
    detachers.push(
      subscribe("project.archived", (payload) => {
        seen.push(payload);
      }),
    );

    await atInstant(LATER, () =>
      projectService.archiveProject(tenant.actors.admin, {
        orgId,
        projectId,
        archiveIssues: true,
      }),
    );

    // Only the three issues that were still live were archived by the cascade.
    expect(seen).toHaveLength(1);
    expect(seen[0]?.issuesArchived).toBe(3);

    // The earlier archive stamps are untouched; the cascade stamped the rest.
    const reread = async (id: (typeof alpha)["id"]) =>
      (await issueRepo.findIssueById(orgId, id))?.archivedAt ?? null;
    expect(await reread(alpha.id)).toBe(EARLIER.toISOString());
    expect(await reread(bravo.id)).toBe(EARLIER.toISOString());
    expect(await reread(charlie.id)).toBe(LATER.toISOString());
    expect(await reread(delta.id)).toBe(LATER.toISOString());
    expect(await reread(echo.id)).toBe(LATER.toISOString());
    expect(await reread(bystander.id)).toBeNull();

    // The usage meter agrees with a recount of live issues.
    const live = await issueRepo.listIssues({ orgId, limit: 100, cursor: null });
    expect(live.total).toBe(1);
    const after = await usageRepo.getUsage(orgId);
    expect(after.issuesUsed).toBe(1);
    expect(after.issuesUsed).toBe(live.total);

    // The audit log states the same count.
    const audit = await activityService.listActivity(tenant.actors.admin, {
      orgId,
      action: ["project.archived"],
      limit: 10,
      cursor: null,
    });
    expect(audit.items).toHaveLength(1);
    expect(audit.items[0]?.summary).toBe("Archived project with 3 issues");
  });

  it("reports zero when every issue was already archived", async () => {
    const other = await createTenant("cascade-empty", "growth");
    await usageRepo.recomputeUsage(other.org.id);

    const only = await issueService.createIssue(
      other.actors.member,
      issueInput(other.org.id, other.project.id, { title: "Lonely issue" }),
    );
    await atInstant(EARLIER, () =>
      issueService.archiveIssue(other.actors.member, other.org.id, only.id),
    );

    const seen: TaskflowEventMap["project.archived"][] = [];
    detachers.push(
      subscribe("project.archived", (payload) => {
        if (payload.orgId === other.org.id) seen.push(payload);
      }),
    );

    await atInstant(LATER, () =>
      projectService.archiveProject(other.actors.admin, {
        orgId: other.org.id,
        projectId: other.project.id,
        archiveIssues: true,
      }),
    );

    expect(seen[0]?.issuesArchived).toBe(0);
    expect((await issueRepo.findIssueById(other.org.id, only.id))?.archivedAt).toBe(
      EARLIER.toISOString(),
    );
    expect((await usageRepo.getUsage(other.org.id)).issuesUsed).toBe(0);
  });
});
