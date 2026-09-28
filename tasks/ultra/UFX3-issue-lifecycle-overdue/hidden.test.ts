/**
 * UFX3 — closing/reopening issues, the project card counters and overdue alerts.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IssueId, UserId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Project } from "@/types/project";

const LONG_AGO = "2020-01-01T00:00:00.000Z";
const FAR_AHEAD = "2099-01-01T00:00:00.000Z";
const NOW = new Date("2026-06-01T07:00:00.000Z");
const HOUR = 3_600_000;

let cleanup: () => void;
let tenant: Tenant;
let other: Tenant;
const detachers: Unsubscribe[] = [];

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  resetOverdueTracking();
  tenant = await createTenant("ufx3-acme", "growth");
  other = await createTenant("ufx3-globex", "growth");
  await usageRepo.recomputeUsage(tenant.org.id);
  await usageRepo.recomputeUsage(other.org.id);
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  cleanup();
});

let projectCounter = 0;
async function freshProject(): Promise<Project> {
  projectCounter += 1;
  return projectRepo.insertProject({
    orgId: tenant.org.id,
    name: `Card project ${projectCounter}`,
    slug: `card-project-${projectCounter}`,
    key: `CP${projectCounter}`,
    description: null,
    visibility: "org",
    leadId: tenant.userIds.owner,
    color: "#6366f1",
    targetDate: null,
  });
}

async function makeIssue(
  projectId: Project["id"],
  opts: { title?: string; dueAt?: string | null; assigneeId?: UserId | null; status?: IssueStatus } = {},
  owner: Tenant = tenant,
): Promise<Issue> {
  const number = await issueRepo.nextIssueNumber(owner.org.id, projectId);
  const issue = await issueRepo.insertIssue(
    issueInput(owner.org.id, projectId, {
      title: opts.title ?? "Lifecycle issue",
      dueAt: opts.dueAt ?? null,
      assigneeId: opts.assigneeId ?? null,
    }),
    owner.userIds.owner,
    number,
  );
  if (opts.status && opts.status !== issue.status) {
    return setStatus(issue, opts.status, owner);
  }
  return issue;
}

async function setStatus(issue: Issue, status: IssueStatus, owner: Tenant = tenant): Promise<Issue> {
  return issueService.changeIssueStatus(owner.actors.admin, {
    orgId: owner.org.id,
    issueId: issue.id,
    status,
  });
}

async function stats(project: Project) {
  const view = await projectService.getProject(tenant.actors.member, tenant.org.id, project.slug);
  return view.stats;
}

function recordOverdue(): IssueId[] {
  const seen: IssueId[] = [];
  detachers.push(
    subscribe("issue.overdue", (payload) => {
      seen.push(payload.issueId);
    }),
  );
  return seen;
}

describe("UFX3 project card counters", () => {
  it("counts canceled issues as closed, not open", async () => {
    const project = await freshProject();
    await makeIssue(project.id, { status: "todo" });
    await makeIssue(project.id, { status: "in_review" });
    await makeIssue(project.id, { status: "done" });
    await makeIssue(project.id, { status: "canceled" });

    const card = await stats(project);
    expect(card.openIssues).toBe(2);
    expect(card.closedIssues).toBe(2);
  });

  it("counts only open, live issues past their due date as overdue", async () => {
    const project = await freshProject();
    await makeIssue(project.id, { dueAt: LONG_AGO, status: "todo" });
    await makeIssue(project.id, { dueAt: LONG_AGO, status: "in_review" });
    await makeIssue(project.id, { dueAt: LONG_AGO, status: "done" });
    await makeIssue(project.id, { dueAt: LONG_AGO, status: "canceled" });
    await makeIssue(project.id, { dueAt: FAR_AHEAD, status: "todo" });
    const archived = await makeIssue(project.id, { dueAt: LONG_AGO, status: "todo" });
    await issueService.archiveIssue(tenant.actors.admin, tenant.org.id, archived.id);

    const card = await stats(project);
    expect(card.overdueIssues).toBe(2);
    expect(card.openIssues).toBe(3);
    expect(card.closedIssues).toBe(2);
  });
});

describe("UFX3 closing and reopening", () => {
  it("clears the completion date on reopen and keeps the first start date", async () => {
    const project = await freshProject();
    const issue = await makeIssue(project.id);

    const started = await setStatus(issue, "in_progress");
    expect(started.startedAt).not.toBeNull();

    const done = await setStatus(started, "done");
    expect(done.completedAt).not.toBeNull();

    const reopened = await setStatus(done, "todo");
    expect(reopened.completedAt).toBeNull();
    expect((await issueRepo.findIssueById(tenant.org.id, issue.id))?.completedAt).toBeNull();

    const restarted = await setStatus(reopened, "in_progress");
    expect(restarted.startedAt).toBe(started.startedAt);
    expect(restarted.completedAt).toBeNull();

    const canceled = await setStatus(restarted, "canceled");
    expect(canceled.completedAt).not.toBeNull();

    const card = await stats(project);
    expect(card.closedIssues).toBe(1);
    expect(card.openIssues).toBe(0);
  });
});

describe("UFX3 overdue sweep", () => {
  it("announces past-due open issues in any open status, never canceled ones", async () => {
    const seen = recordOverdue();
    const review = await makeIssue(tenant.project.id, { dueAt: "2026-05-01T00:00:00.000Z", status: "in_review" });
    const canceled = await makeIssue(tenant.project.id, { dueAt: "2026-05-01T00:00:00.000Z", status: "canceled" });
    const done = await makeIssue(tenant.project.id, { dueAt: "2026-05-01T00:00:00.000Z", status: "done" });

    await runOverdueIssueJob(NOW);

    expect(seen).toContain(review.id);
    expect(seen).not.toContain(canceled.id);
    expect(seen).not.toContain(done.id);
  });

  it("treats an issue as overdue only once its due time has passed", async () => {
    const seen = recordOverdue();
    const dueNow = await makeIssue(tenant.project.id, { dueAt: NOW.toISOString() });
    const justPast = await makeIssue(tenant.project.id, {
      dueAt: new Date(NOW.getTime() - 1).toISOString(),
    });

    await runOverdueIssueJob(NOW);

    expect(seen).toContain(justPast.id);
    expect(seen).not.toContain(dueNow.id);
  });

  it("sweeps a brand-new workspace too, but never a deleted one", async () => {
    const seen = recordOverdue();
    const fresh = await createTenant("ufx3-fresh", "growth");
    const freshIssue = await makeIssue(fresh.project.id, { dueAt: "2026-05-01T12:00:00.000Z" }, fresh);

    const gone = await createTenant("ufx3-gone", "growth");
    await usageRepo.recomputeUsage(gone.org.id);
    const goneIssue = await makeIssue(gone.project.id, { dueAt: "2026-05-01T12:00:00.000Z" }, gone);
    await orgRepo.archiveOrg(gone.org.id);

    await runOverdueIssueJob(NOW);

    expect(seen).toContain(freshIssue.id);
    expect(seen).not.toContain(goneIssue.id);
  });

  it("announces a still-overdue issue only once across sweeps", async () => {
    const seen = recordOverdue();
    const late = await makeIssue(tenant.project.id, { dueAt: "2026-05-02T00:00:00.000Z" });

    await runOverdueIssueJob(NOW);
    await runOverdueIssueJob(new Date(NOW.getTime() + HOUR));
    await runOverdueIssueJob(new Date(NOW.getTime() + 2 * HOUR));

    expect(seen.filter((id) => id === late.id)).toHaveLength(1);
  });

  it("announces again an issue that was canceled and then reopened while still past due", async () => {
    const seen = recordOverdue();
    const late = await makeIssue(tenant.project.id, { dueAt: "2026-05-03T00:00:00.000Z" });

    await runOverdueIssueJob(NOW);
    const canceled = await setStatus(late, "canceled");
    await runOverdueIssueJob(new Date(NOW.getTime() + HOUR));
    await setStatus(canceled, "todo");
    await runOverdueIssueJob(new Date(NOW.getTime() + 2 * HOUR));
    await runOverdueIssueJob(new Date(NOW.getTime() + 3 * HOUR));

    expect(seen.filter((id) => id === late.id)).toHaveLength(2);
  });

  it("announces again an issue whose due date was moved out and then passed again", async () => {
    const seen = recordOverdue();
    const late = await makeIssue(tenant.project.id, { dueAt: "2026-05-04T00:00:00.000Z" });

    await runOverdueIssueJob(NOW);
    await issueService.updateIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: late.id,
      dueAt: new Date(NOW.getTime() + 24 * HOUR).toISOString() as never,
    });
    await runOverdueIssueJob(new Date(NOW.getTime() + HOUR));
    await runOverdueIssueJob(new Date(NOW.getTime() + 48 * HOUR));

    expect(seen.filter((id) => id === late.id)).toHaveLength(2);
  });
});

describe("UFX3 overdue alerts", () => {
  async function overdueInbox(recipient: "member" | "admin", issueId: IssueId) {
    const page = await notificationService.listNotifications(tenant.actors[recipient], {
      orgId: tenant.org.id,
      recipientId: tenant.userIds[recipient],
      unreadOnly: false,
      kind: ["issue_overdue"],
      limit: 100,
      cursor: null,
    });
    return page.items.filter((row) => row.href === `/issues/${issueId}`);
  }

  async function anyInbox(recipient: "member" | "admin", issueId: IssueId) {
    const page = await notificationService.listNotifications(tenant.actors[recipient], {
      orgId: tenant.org.id,
      recipientId: tenant.userIds[recipient],
      unreadOnly: false,
      limit: 100,
      cursor: null,
    });
    return page.items.filter((row) => row.href === `/issues/${issueId}`);
  }

  it("gives the assignee one alert, filed as an overdue alert", async () => {
    const late = await makeIssue(tenant.project.id, {
      dueAt: "2026-05-05T00:00:00.000Z",
      assigneeId: tenant.userIds.member,
    });

    await runOverdueIssueJob(NOW);
    await runOverdueIssueJob(new Date(NOW.getTime() + HOUR));

    expect(await overdueInbox("member", late.id)).toHaveLength(1);
    expect(await anyInbox("member", late.id)).toHaveLength(1);
  });

  it("honours a muted overdue alert, and muting due-soon alerts does not silence overdue ones", async () => {
    await notificationService.updatePreference(tenant.actors.admin, {
      orgId: tenant.org.id,
      userId: tenant.userIds.admin,
      kind: "issue_overdue",
      inApp: false,
      email: false,
      digestOnly: false,
    });
    await notificationService.updatePreference(tenant.actors.member, {
      orgId: tenant.org.id,
      userId: tenant.userIds.member,
      kind: "issue_due_soon",
      inApp: false,
      email: false,
      digestOnly: false,
    });

    const adminsIssue = await makeIssue(tenant.project.id, {
      dueAt: "2026-05-06T00:00:00.000Z",
      assigneeId: tenant.userIds.admin,
    });
    const membersIssue = await makeIssue(tenant.project.id, {
      dueAt: "2026-05-06T00:00:00.000Z",
      assigneeId: tenant.userIds.member,
    });

    await runOverdueIssueJob(NOW);

    expect(await anyInbox("admin", adminsIssue.id)).toHaveLength(0);
    expect(await overdueInbox("member", membersIssue.id)).toHaveLength(1);
  });

  it("keeps each workspace's alerts to itself", async () => {
    const theirs = await makeIssue(
      other.project.id,
      { dueAt: "2026-05-07T00:00:00.000Z", assigneeId: other.userIds.member },
      other,
    );

    await runOverdueIssueJob(NOW);

    const page = await notificationService.listNotifications(other.actors.member, {
      orgId: other.org.id,
      recipientId: other.userIds.member,
      unreadOnly: false,
      kind: ["issue_overdue"],
      limit: 100,
      cursor: null,
    });
    expect(page.items.filter((row) => row.href === `/issues/${theirs.id}`)).toHaveLength(1);
    expect(await anyInbox("member", theirs.id)).toHaveLength(0);
  });
});
