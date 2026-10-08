/**
 * Hidden test for AFX1-discussion-threads: replies form complete threads with
 * deleted placeholders, mentions reach every active member of any size of
 * workspace and nobody else, each person gets one alert per comment, edits
 * re-read the mentions and stay inside a window counted from the posting,
 * and one member's burst of comments is charged to them alone.
 *
 * Self-contained: a throwaway SQLite file, tenants built through the real
 * repositories, the real id generator, logger and rate limiter.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { emit } from "@/lib/event-bus";
import { resetRateLimits } from "@/lib/rate-limit";
import { TenantScopeError } from "@/lib/tenant";
import { runMigrations } from "@/server/db/migrate";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as commentService from "@/server/services/comment-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as memberService from "@/server/services/member-service";
import * as notificationService from "@/server/services/notification-service";
import type { PlanId } from "@/types/billing";
import type { Comment } from "@/types/comment";
import type { CommentId, IssueId, UserId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor, Role } from "@/types/member";
import type { NotificationKind } from "@/types/notification";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

const T0 = new Date("2026-04-01T09:00:00.000Z");
const SECOND = 1000;
const MINUTE = 60 * SECOND;

const ROLES: readonly Role[] = ["owner", "admin", "member", "viewer"];

interface Tenant {
  readonly org: Organization;
  readonly project: Project;
  readonly actors: Readonly<Record<Role, Actor>>;
  readonly userIds: Readonly<Record<Role, UserId>>;
}

let dir: string;
let clockMs = T0.getTime();
const detachers: Unsubscribe[] = [];

/** Moves the pinned clock forward so every row gets a distinct timestamp. */
function tick(ms = SECOND): void {
  clockMs += ms;
  vi.setSystemTime(new Date(clockMs));
}

async function createTenant(slug: string, plan: PlanId = "free"): Promise<Tenant> {
  const owner = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");

  const userIds: Partial<Record<Role, UserId>> = {};
  const actors: Partial<Record<Role, Actor>> = {};
  for (const role of ROLES) {
    const user =
      role === "owner"
        ? owner
        : await userRepo.insertUser({
            email: `${role}@${slug}.test`,
            name: `${slug} ${role}`,
            passwordHash: "seed",
          });
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

  return {
    org,
    project,
    actors: actors as Readonly<Record<Role, Actor>>,
    userIds: userIds as Readonly<Record<Role, UserId>>,
  };
}

/** Adds one more active member; the clock moves so memberships stay ordered. */
async function addMember(t: Tenant, email: string, role: Role = "member"): Promise<UserId> {
  const user = await userRepo.insertUser({ email, name: email, passwordHash: "seed" });
  tick();
  await memberRepo.insertMember(t.org.id, user.id, role, null);
  return user.id;
}

async function newIssue(t: Tenant, actor: Actor, assigneeId: UserId | null = null): Promise<Issue> {
  tick();
  return issueService.createIssue(actor, {
    orgId: t.org.id,
    projectId: t.project.id,
    title: "Discussion target",
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId,
    parentId: null,
    estimate: null,
    dueAt: null,
    labelIds: [],
  });
}

async function post(
  t: Tenant,
  actor: Actor,
  issueId: IssueId,
  body: string,
  parentId: CommentId | null = null,
): Promise<Comment> {
  tick();
  return commentService.createComment(actor, {
    orgId: t.org.id,
    issueId,
    body,
    parentId,
    mentionedUserIds: [],
  });
}

async function alertsFor(
  t: Tenant,
  userId: UserId,
  kind?: NotificationKind,
): Promise<readonly { kind: NotificationKind; title: string }[]> {
  const page = await notificationService.listNotifications(t.actors.owner, {
    orgId: t.org.id,
    recipientId: userId,
    unreadOnly: false,
    ...(kind === undefined ? {} : { kind: [kind] }),
    limit: 100,
    cursor: null,
  });
  return page.items.map((row) => ({ kind: row.kind, title: row.title }));
}

async function thread(t: Tenant, issueId: IssueId) {
  return commentService.getThread(t.actors.owner, t.org.id, issueId);
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
  dir = mkdtempSync(join(tmpdir(), "taskflow-afx1-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  registerEventHandlers();
});

beforeEach(() => {
  resetRateLimits();
  while (detachers.length > 0) detachers.pop()?.();
});

afterAll(() => {
  unregisterEventHandlers();
  vi.useRealTimers();
  rmSync(dir, { recursive: true, force: true });
});

describe("who a comment mentions", () => {
  it("reaches a long-standing member of a workspace with 130 people", async () => {
    const t = await createTenant("big");
    let newest: UserId = t.userIds.viewer;
    for (let i = 1; i <= 130; i += 1) {
      newest = await addMember(t, `m${String(i).padStart(3, "0")}@big.test`);
    }
    const issue = await newIssue(t, t.actors.admin);

    const comment = await post(t, t.actors.member, issue.id, "Founders: @owner, and welcome @m130");

    expect([...comment.mentionedUserIds].sort()).toEqual([t.userIds.owner, newest].sort());
    expect(await alertsFor(t, t.userIds.owner, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, newest, "comment_mention")).toHaveLength(1);
  });

  it("matches handles case-insensitively, whatever the member's role", async () => {
    const t = await createTenant("roles");
    const issue = await newIssue(t, t.actors.admin);

    const comment = await post(t, t.actors.member, issue.id, "Please read this, @Viewer and @ADMIN");

    expect([...comment.mentionedUserIds].sort()).toEqual([t.userIds.viewer, t.userIds.admin].sort());
    expect(await alertsFor(t, t.userIds.viewer, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, t.userIds.admin, "comment_mention")).toHaveLength(1);
  });

  it("mentions every member who shares a handle", async () => {
    const t = await createTenant("shared");
    const patA = await addMember(t, "pat@north.test");
    const patB = await addMember(t, "pat@south.test");
    const issue = await newIssue(t, t.actors.admin);

    const comment = await post(t, t.actors.member, issue.id, "@pat can one of you take this?");

    expect([...comment.mentionedUserIds].sort()).toEqual([patA, patB].sort());
    expect(await alertsFor(t, patA, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, patB, "comment_mention")).toHaveLength(1);
  });

  it("ignores the author's own handle", async () => {
    const t = await createTenant("selfping");
    const issue = await newIssue(t, t.actors.admin);

    const comment = await post(t, t.actors.member, issue.id, "Note to self: @member must follow up");

    expect(comment.mentionedUserIds).toEqual([]);
    expect(await alertsFor(t, t.userIds.member)).toHaveLength(0);
  });

  it("cannot reach someone who was removed from the workspace", async () => {
    const t = await createTenant("removed");
    const gone = await addMember(t, "gone@removed.test");
    const membership = await memberRepo.findMember(t.org.id, gone);
    if (!membership) throw new Error("membership missing");
    await memberService.removeMember(t.actors.admin, { orgId: t.org.id, memberId: membership.id });
    const issue = await newIssue(t, t.actors.admin);

    const comment = await post(t, t.actors.member, issue.id, "@gone are you still around?");

    expect(comment.mentionedUserIds).toEqual([]);
    expect(await alertsFor(t, gone)).toHaveLength(0);
  });

  it("never crosses into another workspace, even for an identical handle", async () => {
    const a = await createTenant("tenant-a");
    const b = await createTenant("tenant-b");
    const issue = await newIssue(a, a.actors.admin);

    const comment = await post(a, a.actors.member, issue.id, "@admin please check");

    expect(comment.mentionedUserIds).toEqual([a.userIds.admin]);
    expect(await alertsFor(b, b.userIds.admin)).toHaveLength(0);
  });
});

describe("who is told about a comment", () => {
  it("tells the issue's author and assignee, never the comment's author", async () => {
    const t = await createTenant("watchers");
    const issue = await newIssue(t, t.actors.owner, t.userIds.admin);

    await post(t, t.actors.member, issue.id, "Picking this up");

    expect(await alertsFor(t, t.userIds.owner)).toEqual([{ kind: "comment_created", title: expect.any(String) }]);
    expect(await alertsFor(t, t.userIds.admin)).toEqual([{ kind: "comment_created", title: expect.any(String) }]);
    expect(await alertsFor(t, t.userIds.member)).toHaveLength(0);
  });

  it("gives a mentioned assignee one alert, the mention", async () => {
    const t = await createTenant("mentioned-assignee");
    const issue = await newIssue(t, t.actors.owner, t.userIds.admin);

    await post(t, t.actors.member, issue.id, "@admin this one is yours");

    const admin = await alertsFor(t, t.userIds.admin);
    expect(admin).toHaveLength(1);
    expect(admin[0]?.kind).toBe("comment_mention");
    expect((await alertsFor(t, t.userIds.owner)).map((row) => row.kind)).toEqual(["comment_created"]);
  });

  it("tells the author of the comment a reply answers", async () => {
    const t = await createTenant("reply-author");
    const issue = await newIssue(t, t.actors.owner);
    const opener = await post(t, t.actors.admin, issue.id, "What do we do here?");

    await post(t, t.actors.member, issue.id, "Ship it", opener.id);

    expect((await alertsFor(t, t.userIds.admin)).map((row) => row.kind)).toEqual(["comment_created"]);
    // The issue's author heard about the opener and about the reply.
    expect((await alertsFor(t, t.userIds.owner)).map((row) => row.kind)).toEqual([
      "comment_created",
      "comment_created",
    ]);
    expect(await alertsFor(t, t.userIds.member)).toHaveLength(0);
  });

  it("tells the answered author once even when they are also the assignee", async () => {
    const t = await createTenant("reply-assignee");
    const issue = await newIssue(t, t.actors.owner, t.userIds.admin);
    const opener = await post(t, t.actors.admin, issue.id, "Any objections?");

    await post(t, t.actors.member, issue.id, "None", opener.id);

    expect((await alertsFor(t, t.userIds.admin)).map((row) => row.kind)).toEqual(["comment_created"]);
  });

  it("gives the answered author who is also mentioned one alert, the mention", async () => {
    const t = await createTenant("reply-mention");
    const issue = await newIssue(t, t.actors.owner);
    const opener = await post(t, t.actors.admin, issue.id, "Thoughts?");

    await post(t, t.actors.member, issue.id, "@admin agreed", opener.id);

    const admin = await alertsFor(t, t.userIds.admin);
    expect(admin).toHaveLength(1);
    expect(admin[0]?.kind).toBe("comment_mention");
  });

  it("keeps one alert per person when the event reaches the fan-out directly", async () => {
    const t = await createTenant("direct-event");
    const issue = await newIssue(t, t.actors.owner, t.userIds.admin);

    tick();
    await emit("comment.created", {
      orgId: t.org.id,
      actorId: t.userIds.member,
      occurredAt: new Date(clockMs).toISOString() as never,
      commentId: "01HZZZDIRECTEVENTCOMMENT01" as CommentId,
      issueId: issue.id,
      mentionedUserIds: [t.userIds.admin],
    });

    const admin = await alertsFor(t, t.userIds.admin);
    expect(admin).toHaveLength(1);
    expect(admin[0]?.kind).toBe("comment_mention");
    expect((await alertsFor(t, t.userIds.owner)).map((row) => row.kind)).toEqual(["comment_created"]);
  });

  it("applies the recipient's own preferences to a mention", async () => {
    const t = await createTenant("prefs");
    await notificationService.updatePreference(t.actors.admin, {
      orgId: t.org.id,
      userId: t.userIds.admin,
      kind: "comment_mention",
      inApp: false,
      email: false,
      digestOnly: false,
    });
    const issue = await newIssue(t, t.actors.owner);

    await post(t, t.actors.member, issue.id, "@admin quiet please");

    expect(await alertsFor(t, t.userIds.admin)).toHaveLength(0);
  });
});

describe("replies and the thread", () => {
  it("keeps a reply to a reply in the thread, in order of posting", async () => {
    const t = await createTenant("nested");
    const issue = await newIssue(t, t.actors.owner);
    const top = await post(t, t.actors.admin, issue.id, "Opener");
    const r1 = await post(t, t.actors.member, issue.id, "First answer", top.id);
    const r3 = await post(t, t.actors.owner, issue.id, "Another answer", top.id);
    const r2 = await post(t, t.actors.admin, issue.id, "Answer to the first answer", r1.id);

    const nodes = await thread(t, issue.id);
    expect(nodes.map((node) => node.comment.id)).toEqual([top.id]);
    expect(nodes[0]?.replies.map((reply) => reply.id)).toEqual([r1.id, r3.id, r2.id]);

    const found = await issueService.getIssue(t.actors.owner, t.org.id, issue.id);
    expect(found.commentCount).toBe(4);
  });

  it("keeps a chain of thirty nested replies complete", async () => {
    const t = await createTenant("chain");
    const issue = await newIssue(t, t.actors.owner);
    const top = await post(t, t.actors.admin, issue.id, "Opener");
    const ids: CommentId[] = [];
    let parent = top.id;
    for (let depth = 1; depth <= 30; depth += 1) {
      const reply = await post(t, depth % 2 === 0 ? t.actors.member : t.actors.admin, issue.id, `Depth ${depth}`, parent);
      ids.push(reply.id);
      parent = reply.id;
    }

    const nodes = await thread(t, issue.id);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.replies.map((reply) => reply.id)).toEqual(ids);
  });

  it("keeps a deleted opener as a placeholder with its replies in place", async () => {
    const t = await createTenant("placeholder");
    const issue = await newIssue(t, t.actors.owner);
    const opener = await post(t, t.actors.admin, issue.id, "Confidential opener");
    const reply = await post(t, t.actors.member, issue.id, "Still relevant", opener.id);
    tick();
    await commentService.deleteComment(t.actors.admin, { orgId: t.org.id, commentId: opener.id });

    const nodes = await thread(t, issue.id);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.comment.id).toBe(opener.id);
    expect(nodes[0]?.comment.archivedAt).not.toBeNull();
    expect(nodes[0]?.comment.body).toBe("");
    expect(nodes[0]?.replies.map((row) => [row.id, row.body])).toEqual([[reply.id, "Still relevant"]]);
  });

  it("keeps a deleted reply as a placeholder and the count honest", async () => {
    const t = await createTenant("deleted-reply");
    const issue = await newIssue(t, t.actors.owner);
    const opener = await post(t, t.actors.admin, issue.id, "Opener");
    const reply = await post(t, t.actors.member, issue.id, "Oops", opener.id);
    const later = await post(t, t.actors.owner, issue.id, "Later", opener.id);
    tick();
    await commentService.deleteComment(t.actors.member, { orgId: t.org.id, commentId: reply.id });

    const nodes = await thread(t, issue.id);
    expect(nodes[0]?.replies.map((row) => [row.id, row.body, row.archivedAt === null])).toEqual([
      [reply.id, "", false],
      [later.id, "Later", true],
    ]);
    expect((await issueService.getIssue(t.actors.owner, t.org.id, issue.id)).commentCount).toBe(2);
  });

  it("refuses to show another workspace's thread", async () => {
    const a = await createTenant("thread-a");
    const b = await createTenant("thread-b");
    const issue = await newIssue(a, a.actors.owner);

    await expect(commentService.getThread(b.actors.owner, a.org.id, issue.id)).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });
});

describe("editing a comment", () => {
  it("lets the author edit within fifteen minutes of posting, not of the last edit", async () => {
    const t = await createTenant("window");
    const issue = await newIssue(t, t.actors.owner);
    const comment = await post(t, t.actors.member, issue.id, "First draft");

    tick(10 * MINUTE);
    await expect(
      commentService.updateComment(t.actors.member, { orgId: t.org.id, commentId: comment.id, body: "Second draft" }),
    ).resolves.toMatchObject({ body: "Second draft" });

    tick(10 * MINUTE);
    await expect(
      commentService.updateComment(t.actors.member, { orgId: t.org.id, commentId: comment.id, body: "Third draft" }),
    ).rejects.toThrow();

    const nodes = await thread(t, issue.id);
    expect(nodes[0]?.comment.body).toBe("Second draft");
  });

  it("does not bind an admin to the window", async () => {
    const t = await createTenant("admin-edit");
    const issue = await newIssue(t, t.actors.owner);
    const comment = await post(t, t.actors.member, issue.id, "Needs moderation");

    tick(3 * 60 * MINUTE);
    await expect(
      commentService.updateComment(t.actors.admin, { orgId: t.org.id, commentId: comment.id, body: "Moderated" }),
    ).resolves.toMatchObject({ body: "Moderated" });
  });

  it("re-reads the mentions on edit and alerts only the newly mentioned", async () => {
    const t = await createTenant("edit-mentions");
    const issue = await newIssue(t, t.actors.owner);
    const comment = await post(t, t.actors.member, issue.id, "@admin first look");
    expect(await alertsFor(t, t.userIds.admin, "comment_mention")).toHaveLength(1);

    tick();
    const edited = await commentService.updateComment(t.actors.member, {
      orgId: t.org.id,
      commentId: comment.id,
      body: "@admin first look, then @viewer",
    });
    expect([...edited.mentionedUserIds].sort()).toEqual([t.userIds.admin, t.userIds.viewer].sort());
    expect(await alertsFor(t, t.userIds.admin, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, t.userIds.viewer, "comment_mention")).toHaveLength(1);

    tick();
    const trimmed = await commentService.updateComment(t.actors.member, {
      orgId: t.org.id,
      commentId: comment.id,
      body: "only @viewer now",
    });
    expect(trimmed.mentionedUserIds).toEqual([t.userIds.viewer]);
    expect(await alertsFor(t, t.userIds.admin, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, t.userIds.viewer, "comment_mention")).toHaveLength(1);
    expect(await alertsFor(t, t.userIds.member)).toHaveLength(0);
  });

  it("can mention a long-standing member of a large workspace on edit", async () => {
    const t = await createTenant("big-edit");
    for (let i = 1; i <= 130; i += 1) {
      await addMember(t, `e${String(i).padStart(3, "0")}@big-edit.test`);
    }
    const issue = await newIssue(t, t.actors.admin);
    const comment = await post(t, t.actors.member, issue.id, "Draft without names");

    tick();
    const edited = await commentService.updateComment(t.actors.member, {
      orgId: t.org.id,
      commentId: comment.id,
      body: "Draft, now for @owner",
    });

    expect(edited.mentionedUserIds).toEqual([t.userIds.owner]);
    expect(await alertsFor(t, t.userIds.owner, "comment_mention")).toHaveLength(1);
  });

  it("makes the edited text what search finds", async () => {
    const t = await createTenant("edit-search");
    const issue = await newIssue(t, t.actors.owner);
    const comment = await post(t, t.actors.member, issue.id, "The pelican was late");

    tick();
    await commentService.updateComment(t.actors.member, {
      orgId: t.org.id,
      commentId: comment.id,
      body: "The albatross was late",
    });

    const after = await searchRepo.searchDocuments({ orgId: t.org.id, q: "albatross", kinds: ["comment"], limit: 25, cursor: null });
    expect(after.items.map((row) => row.subjectId)).toEqual([comment.id]);
    const before = await searchRepo.searchDocuments({ orgId: t.org.id, q: "pelican", kinds: ["comment"], limit: 25, cursor: null });
    expect(before.items).toHaveLength(0);
  });
});

describe("the posting limit", () => {
  it("is charged to the member who bursts, not to the whole workspace", async () => {
    const t = await createTenant("burst");
    const issue = await newIssue(t, t.actors.owner);

    let refused = false;
    for (let attempt = 0; attempt < 200 && !refused; attempt += 1) {
      try {
        await post(t, t.actors.member, issue.id, `Burst ${attempt}`);
      } catch {
        refused = true;
      }
    }
    expect(refused).toBe(true);

    await expect(post(t, t.actors.admin, issue.id, "Still able to talk")).resolves.toMatchObject({
      body: "Still able to talk",
    });
  });
});
