/**
 * HIM8 — archiving a project freezes its issues until the project is restored.
 *
 * The project is archived WITHOUT cascading, so its issues are still live rows;
 * every write path that can touch them must still refuse.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as attachmentService from "@/server/services/attachment-service";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { AttachmentId } from "@/types/common";
import type { Comment } from "@/types/comment";
import type { TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Project } from "@/types/project";

const PAST = "2026-01-01T00:00:00.000Z";
const NOW = new Date("2026-06-01T07:00:00.000Z");

let cleanup: () => void;
let tenant: Tenant;
let frozen: Project;
let issue: Issue;
let comment: Comment;
let attachmentId: AttachmentId;
/** An overdue issue in the tenant's other, still-active project. */
let liveOverdue: Issue;
const detachers: Unsubscribe[] = [];

const WRITE_EVENTS: readonly TaskflowEventType[] = [
  "issue.updated",
  "issue.status_changed",
  "issue.assigned",
  "issue.archived",
  "comment.created",
  "comment.deleted",
];

function captureWrites(): string[] {
  const seen: string[] = [];
  for (const type of WRITE_EVENTS) {
    detachers.push(subscribe(type, () => void seen.push(type)));
  }
  return seen;
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  resetOverdueTracking();
  tenant = await createTenant("him8", "growth");
  await usageRepo.recomputeUsage(tenant.org.id);

  frozen = await projectService.createProject(tenant.actors.admin, {
    orgId: tenant.org.id,
    name: "Frozen",
    slug: "frozen",
    key: "FRZ",
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  });

  issue = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, frozen.id, {
      title: "Late and frozen",
      assigneeId: tenant.userIds.admin,
      dueAt: PAST,
    }),
  );
  liveOverdue = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title: "Late and live", dueAt: PAST }),
  );
  comment = await commentService.createComment(tenant.actors.member, {
    orgId: tenant.org.id,
    issueId: issue.id,
    body: "First!",
    parentId: null,
    mentionedUserIds: [],
  });
  const attachment = await attachmentService.addAttachment(tenant.actors.member, {
    orgId: tenant.org.id,
    issueId: issue.id,
    filename: "spec.pdf",
    contentType: "application/pdf",
    sizeBytes: 1_024,
  });
  attachmentId = attachment.id;

  await projectService.archiveProject(tenant.actors.admin, {
    orgId: tenant.org.id,
    projectId: frozen.id,
    archiveIssues: false,
  });
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  cleanup();
});

describe("issue writes in an archived project", () => {
  it("refuses field edits, status changes and board moves", async () => {
    const seen = captureWrites();

    await expect(
      issueService.updateIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        title: "Renamed while frozen",
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      issueService.changeIssueStatus(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        status: "in_progress",
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      issueService.moveIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        toStatus: "done",
        toIndex: 0,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);

    const stored = await issueRepo.findIssueById(tenant.org.id, issue.id);
    expect(stored?.title).toBe("Late and frozen");
    expect(stored?.status).toBe(issue.status);
    expect(seen).toEqual([]);
  });

  it("refuses assigning, un-assigning and archiving the issue", async () => {
    const seen = captureWrites();

    await expect(
      issueService.assignIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        assigneeId: tenant.userIds.viewer,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      issueService.assignIssue(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        assigneeId: null,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      issueService.archiveIssue(tenant.actors.admin, tenant.org.id, issue.id),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);

    const stored = await issueRepo.findIssueById(tenant.org.id, issue.id);
    expect(stored?.assigneeId).toBe(tenant.userIds.admin);
    expect(stored?.archivedAt).toBeNull();
    expect(seen).toEqual([]);
  });
});

describe("comment and attachment writes in an archived project", () => {
  it("refuses posting, editing and deleting comments", async () => {
    const seen = captureWrites();

    await expect(
      commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "Anyone there?",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      commentService.updateComment(tenant.actors.member, {
        orgId: tenant.org.id,
        commentId: comment.id,
        body: "Edited while frozen",
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      commentService.deleteComment(tenant.actors.admin, {
        orgId: tenant.org.id,
        commentId: comment.id,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);

    expect(seen).toEqual([]);
  });

  it("refuses adding and removing attachments", async () => {
    await expect(
      attachmentService.addAttachment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        filename: "late.pdf",
        contentType: "application/pdf",
        sizeBytes: 2_048,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(
      attachmentService.removeAttachment(tenant.actors.member, {
        orgId: tenant.org.id,
        attachmentId,
      }),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);

    const rows = await attachmentService.listAttachments(
      tenant.actors.member,
      tenant.org.id,
      issue.id,
    );
    expect(rows.map((row) => row.id)).toEqual([attachmentId]);
  });

  it("keeps the frozen issue readable", async () => {
    await expect(
      issueService.getIssue(tenant.actors.viewer, tenant.org.id, issue.id),
    ).resolves.toMatchObject({ issue: { id: issue.id }, commentCount: 1, attachmentCount: 1 });

    const thread = await commentService.getThread(tenant.actors.viewer, tenant.org.id, issue.id);
    expect(thread).toHaveLength(1);
    expect(thread[0]?.comment.body).toBe("First!");
  });
});

describe("the overdue sweep", () => {
  it("does not announce a frozen issue, but still announces live ones", async () => {
    const overdue: string[] = [];
    detachers.push(subscribe("issue.overdue", (payload) => void overdue.push(payload.issueId)));

    await runOverdueIssueJob(NOW);

    expect(overdue).toContain(liveOverdue.id);
    expect(overdue).not.toContain(issue.id);
  });
});

describe("restoring the project", () => {
  it("lifts the freeze for writes and for the overdue sweep", async () => {
    await projectService.restoreProject(tenant.actors.admin, tenant.org.id, frozen.id);

    await expect(
      issueService.changeIssueStatus(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        status: "in_progress",
      }),
    ).resolves.toMatchObject({ status: "in_progress" });
    await expect(
      commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "Back in business",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).resolves.toMatchObject({ issueId: issue.id });

    const overdue: string[] = [];
    detachers.push(subscribe("issue.overdue", (payload) => void overdue.push(payload.issueId)));
    await runOverdueIssueJob(NOW);
    expect(overdue).toContain(issue.id);
  });
});
