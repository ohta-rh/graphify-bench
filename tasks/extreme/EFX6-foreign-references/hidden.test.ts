/**
 * EFX6 — foreign references.
 *
 * Everything a write points at (assignee, lead, labels, parent issue, parent
 * comment, mentions) must be usable from the workspace the write is made in.
 * A reference into another workspace is a cross-workspace access; a missing,
 * archived, deleted or non-member reference is not found; a refused write
 * changes nothing.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { TenantScopeError } from "@/lib/tenant";
import * as labelRepo from "@/server/repositories/label-repository";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as labelService from "@/server/services/label-service";
import * as memberService from "@/server/services/member-service";
import * as notificationService from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CreateProjectInput } from "@/schemas/project";
import type { Comment } from "@/types/comment";
import type { IssueId, LabelId, OrgId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";
import type { Issue, IssueLabel } from "@/types/issue";
import type { Project } from "@/types/project";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

let a: Tenant;
let b: Tenant;
let bug: IssueLabel;
let feature: IssueLabel;
let secret: IssueLabel;
let side: Project;
let parentA: Issue;
let archivedA: Issue;
let sideIssue: Issue;
let issueB: Issue;
let host: Issue;
let commentA: Comment;
let replyA: Comment;
let deletedA: Comment;
let elsewhereA: Comment;
let commentB: Comment;

const MISSING_ISSUE = "01HZZZMISSINGISSUE0000000X" as IssueId;
const MISSING_LABEL = "01HZZZMISSINGLABEL0000000X" as LabelId;

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

function projectInput(
  orgId: OrgId,
  overrides: Partial<CreateProjectInput> = {},
): CreateProjectInput {
  return {
    orgId,
    name: "Side project",
    slug: "side-project",
    key: "SID",
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
    ...overrides,
  };
}

async function issueCount(tenant: Tenant): Promise<number> {
  const page = await issueService.listIssues(tenant.actors.owner, {
    orgId: tenant.org.id,
    limit: 100,
    cursor: null,
  });
  return page.total;
}

async function labelIdsOf(tenant: Tenant, issueId: IssueId): Promise<readonly string[]> {
  const found = await issueService.getIssue(tenant.actors.owner, tenant.org.id, issueId);
  return found.labels.map((label) => label.id).sort();
}

async function comment(
  tenant: Tenant,
  issueId: IssueId,
  body: string,
  parentId: Comment["parentId"] = null,
): Promise<Comment> {
  return commentService.createComment(tenant.actors.member, {
    orgId: tenant.org.id,
    issueId,
    body,
    parentId,
    mentionedUserIds: [],
  });
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("efx6-a", "growth");
  b = await createTenant("efx6-b", "growth");

  bug = await labelService.createLabel(a.actors.admin, {
    orgId: a.org.id,
    name: "bug",
    color: "#ff0000",
    description: null,
  });
  feature = await labelService.createLabel(a.actors.admin, {
    orgId: a.org.id,
    name: "feature",
    color: "#00ff00",
    description: null,
  });
  secret = await labelService.createLabel(b.actors.admin, {
    orgId: b.org.id,
    name: "secret",
    color: "#0000ff",
    description: null,
  });

  side = await projectService.createProject(a.actors.admin, projectInput(a.org.id));

  parentA = await issueService.createIssue(
    a.actors.member,
    issueInput(a.org.id, a.project.id, { title: "Parent" }),
  );
  const doomed = await issueService.createIssue(
    a.actors.member,
    issueInput(a.org.id, a.project.id, { title: "Archived parent" }),
  );
  archivedA = await issueService.archiveIssue(a.actors.member, a.org.id, doomed.id);
  sideIssue = await issueService.createIssue(
    a.actors.member,
    issueInput(a.org.id, side.id, { title: "Side issue" }),
  );
  issueB = await issueService.createIssue(
    b.actors.member,
    issueInput(b.org.id, b.project.id, { title: "Foreign issue" }),
  );

  host = await issueService.createIssue(
    a.actors.member,
    issueInput(a.org.id, a.project.id, { title: "Host of the thread" }),
  );
  commentA = await comment(a, host.id, "top-level comment");
  replyA = await comment(a, host.id, "a reply", commentA.id);
  const gone = await comment(a, host.id, "to be deleted");
  deletedA = await commentService.deleteComment(a.actors.admin, {
    orgId: a.org.id,
    commentId: gone.id,
  });
  elsewhereA = await comment(a, parentA.id, "comment on another issue");
  commentB = await comment(b, issueB.id, "comment in the other workspace");

  // The viewer of workspace A leaves.
  const members = await memberService.listMembers(a.actors.owner, {
    orgId: a.org.id,
    limit: 100,
    cursor: null,
  });
  const viewer = members.items.find((row) => row.userId === a.userIds.viewer);
  if (!viewer) throw new Error("fixture viewer missing");
  await memberService.removeMember(a.actors.owner, { orgId: a.org.id, memberId: viewer.id });
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  cleanup();
});

describe("labels", () => {
  it("refuses another workspace's label on a new issue as a cross-workspace access", async () => {
    const created = capture("issue.created");
    const before = await issueCount(a);

    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Foreign label" }),
        labelIds: [bug.id, secret.id],
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await issueCount(a)).toBe(before);
    expect(created).toHaveLength(0);
  });

  it("refuses a label that does not exist as not found", async () => {
    const before = await issueCount(a);

    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Missing label" }),
        labelIds: [bug.id, MISSING_LABEL],
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    expect(await issueCount(a)).toBe(before);
  });

  it("accepts the workspace's own labels", async () => {
    const issue = await issueService.createIssue(a.actors.member, {
      ...issueInput(a.org.id, a.project.id, { title: "Own labels" }),
      labelIds: [bug.id, feature.id],
    });

    expect(await labelIdsOf(a, issue.id)).toEqual([bug.id, feature.id].sort());
  });

  it("refuses a label change that names another workspace's label and keeps the old labels", async () => {
    const issue = await issueService.createIssue(a.actors.member, {
      ...issueInput(a.org.id, a.project.id, { title: "Keep my labels" }),
      labelIds: [bug.id],
    });

    await expect(
      issueService.updateIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        labelIds: [feature.id, secret.id],
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await labelIdsOf(a, issue.id)).toEqual([bug.id]);
  });

  it("refuses a label that has been deleted and keeps the old labels", async () => {
    const temp = await labelService.createLabel(a.actors.admin, {
      orgId: a.org.id,
      name: "temporary",
      color: "#123456",
      description: null,
    });
    const issue = await issueService.createIssue(a.actors.member, {
      ...issueInput(a.org.id, a.project.id, { title: "Deleted label" }),
      labelIds: [feature.id],
    });
    await labelService.deleteLabel(a.actors.admin, a.org.id, temp.id);

    await expect(
      issueService.updateIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        labelIds: [bug.id, temp.id],
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    expect(await labelIdsOf(a, issue.id)).toEqual([feature.id]);

    await expect(
      issueService.updateIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        labelIds: [bug.id],
      }),
    ).resolves.toMatchObject({ labelIds: [bug.id] });
  });

  it("never shows a label that is not the workspace's own, even if one was attached before", async () => {
    const issue = await issueService.createIssue(a.actors.member, {
      ...issueInput(a.org.id, a.project.id, { title: "Planted label" }),
      labelIds: [bug.id],
    });
    await labelRepo.setIssueLabels(a.org.id, issue.id, [bug.id, secret.id]);

    expect(await labelIdsOf(a, issue.id)).toEqual([bug.id]);
    const page = await issueService.listIssues(a.actors.owner, {
      orgId: a.org.id,
      limit: 100,
      cursor: null,
    });
    const listed = page.items.find((row) => row.id === issue.id);
    expect(listed?.labelIds).toEqual([bug.id]);
  });
});

describe("people", () => {
  it("refuses an assignee who is not a member of the workspace", async () => {
    const before = await issueCount(a);

    await expect(
      issueService.createIssue(
        a.actors.member,
        issueInput(a.org.id, a.project.id, {
          title: "Assigned to a stranger",
          assigneeId: b.userIds.member,
        }),
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    expect(await issueCount(a)).toBe(before);
  });

  it("refuses an assignee who has left and leaves the issue as it was", async () => {
    await expect(
      issueService.createIssue(
        a.actors.member,
        issueInput(a.org.id, a.project.id, {
          title: "Assigned to a former member",
          assigneeId: a.userIds.viewer,
        }),
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    const issue = await issueService.createIssue(
      a.actors.member,
      issueInput(a.org.id, a.project.id, {
        title: "Reassign target",
        assigneeId: a.userIds.admin,
      }),
    );
    const assigned = capture("issue.assigned");

    await expect(
      issueService.assignIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        assigneeId: a.userIds.viewer,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      issueService.assignIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        assigneeId: b.userIds.owner,
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const stored = await issueService.getIssue(a.actors.owner, a.org.id, issue.id);
    expect(stored.issue.assigneeId).toBe(a.userIds.admin);
    expect(assigned).toHaveLength(0);

    await expect(
      issueService.assignIssue(a.actors.member, {
        orgId: a.org.id,
        issueId: issue.id,
        assigneeId: a.userIds.member,
      }),
    ).resolves.toMatchObject({ assigneeId: a.userIds.member });
  });

  it("refuses a project lead who is not a current member", async () => {
    await expect(
      projectService.createProject(
        a.actors.admin,
        projectInput(a.org.id, {
          name: "Led by a stranger",
          slug: "led-by-a-stranger",
          key: "LBS",
          leadId: b.userIds.admin,
        }),
      ),
    ).rejects.toMatchObject({ code: "not_found" });

    await expect(
      projectService.updateProject(a.actors.admin, {
        orgId: a.org.id,
        projectId: side.id,
        leadId: a.userIds.viewer,
      }),
    ).rejects.toMatchObject({ code: "not_found" });

    const stored = await projectService.getProject(a.actors.owner, a.org.id, side.slug);
    expect(stored.project.leadId).toBeNull();

    await expect(
      projectService.updateProject(a.actors.admin, {
        orgId: a.org.id,
        projectId: side.id,
        leadId: a.userIds.member,
      }),
    ).resolves.toMatchObject({ leadId: a.userIds.member });
  });
});

describe("parent issues", () => {
  it("refuses a parent from another workspace as a cross-workspace access", async () => {
    const before = await issueCount(a);

    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Foreign parent" }),
        parentId: issueB.id,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect(await issueCount(a)).toBe(before);
  });

  it("refuses a parent from another project of the same workspace as not found", async () => {
    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Parent elsewhere" }),
        parentId: sideIssue.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses an archived parent as not found", async () => {
    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Archived parent" }),
        parentId: archivedA.id,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("refuses a parent that does not exist as not found", async () => {
    await expect(
      issueService.createIssue(a.actors.member, {
        ...issueInput(a.org.id, a.project.id, { title: "Missing parent" }),
        parentId: MISSING_ISSUE,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("accepts a live parent from the same project", async () => {
    const child = await issueService.createIssue(a.actors.member, {
      ...issueInput(a.org.id, a.project.id, { title: "Child" }),
      parentId: parentA.id,
    });

    expect(child.parentId).toBe(parentA.id);
    const stored = await issueService.getIssue(a.actors.owner, a.org.id, child.id);
    expect(stored.issue.parentId).toBe(parentA.id);
  });
});

describe("replies", () => {
  it("refuses a reply to a comment in another workspace as a cross-workspace access", async () => {
    const created = capture("comment.created");
    const before = await commentService.getThread(a.actors.owner, a.org.id, host.id);

    await expect(comment(a, host.id, "cross-workspace reply", commentB.id)).rejects.toBeInstanceOf(
      TenantScopeError,
    );

    const after = await commentService.getThread(a.actors.owner, a.org.id, host.id);
    expect(after).toEqual(before);
    expect(created).toHaveLength(0);
  });

  it("refuses a reply to a comment on a different issue as not found", async () => {
    await expect(comment(a, host.id, "wrong issue", elsewhereA.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("refuses a reply to a deleted comment or to a reply as not found", async () => {
    await expect(comment(a, host.id, "reply to deleted", deletedA.id)).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(comment(a, host.id, "reply to a reply", replyA.id)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("threads a reply under a live top-level comment on the same issue", async () => {
    const reply = await comment(a, host.id, "a proper reply", commentA.id);

    const thread = await commentService.getThread(a.actors.owner, a.org.id, host.id);
    const node = thread.find((entry) => entry.comment.id === commentA.id);
    expect(node?.replies.map((row) => row.id)).toContain(reply.id);
  });

  it("ignores mentions of people outside the workspace and never notifies them", async () => {
    const created = capture("comment.created");

    const posted = await commentService.createComment(a.actors.member, {
      orgId: a.org.id,
      issueId: host.id,
      body: "no handles in the body",
      parentId: null,
      mentionedUserIds: [b.userIds.member, a.userIds.viewer, a.userIds.admin],
    });

    expect(posted.mentionedUserIds).toEqual([a.userIds.admin]);
    expect(created[0]?.mentionedUserIds).toEqual([a.userIds.admin]);

    for (const outsider of [b.userIds.member, a.userIds.viewer]) {
      const page = await notificationService.listNotifications(a.actors.owner, {
        orgId: a.org.id,
        recipientId: outsider,
        unreadOnly: false,
        kind: ["comment_mention"],
        limit: 25,
        cursor: null,
      });
      expect(page.total).toBe(0);
    }
    const admin = await notificationService.listNotifications(a.actors.owner, {
      orgId: a.org.id,
      recipientId: a.userIds.admin,
      unreadOnly: false,
      kind: ["comment_mention"],
      limit: 25,
      cursor: null,
    });
    expect(admin.total).toBe(1);
  });
});
