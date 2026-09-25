/**
 * Hidden test for HIM4: the participants of an issue.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { TenantScopeError } from "@/lib/tenant";
import { issueParticipantsSchema } from "@/schemas/comment";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as userRepo from "@/server/repositories/user-repository";
import { NotFoundError } from "@/server/services/_support";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Actor } from "@/types/member";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let a: Tenant;
let b: Tenant;
let extra = 0;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("him4a", "growth");
  b = await createTenant("him4b", "growth");
});

afterAll(() => {
  cleanup();
});

/** A further `member`-role user in tenant `t`, plus a way to remove them. */
async function extraMember(t: Tenant): Promise<{ actor: Actor; remove: () => Promise<void> }> {
  extra += 1;
  const user = await userRepo.insertUser({
    email: `extra${extra}@${t.org.slug}.test`,
    name: `extra${extra}`,
    passwordHash: "seed",
  });
  const member = await memberRepo.insertMember(t.org.id, user.id, "member", null);
  return {
    actor: { userId: user.id, orgId: t.org.id, role: "member" },
    remove: async () => {
      await memberRepo.archiveMember(t.org.id, member.id);
    },
  };
}

async function comment(actor: Actor, issue: Issue, body = "A thought") {
  return commentService.createComment(actor, {
    orgId: issue.orgId,
    issueId: issue.id,
    body,
    parentId: null,
    mentionedUserIds: [],
  });
}

const sorted = (ids: readonly string[]) => [...ids].sort();

describe("HIM4 commentService.getIssueParticipants", () => {
  it("collects the author, the assignee and the commenters, once each", async () => {
    const issue = await issueService.createIssue(
      a.actors.member,
      issueInput(a.org.id, a.project.id, { title: "Participants basic", assigneeId: a.userIds.viewer }),
    );
    await comment(a.actors.admin, issue);
    await comment(a.actors.admin, issue, "Another one");
    await comment(a.actors.member, issue);

    const participants = await commentService.getIssueParticipants(a.actors.viewer, a.org.id, issue.id);

    expect(participants).toHaveLength(3);
    expect(sorted(participants)).toEqual(
      sorted([a.userIds.member, a.userIds.viewer, a.userIds.admin]),
    );
  });

  it("ignores authors whose only comments were deleted", async () => {
    const issue = await issueService.createIssue(
      a.actors.member,
      issueInput(a.org.id, a.project.id, { title: "Participants deleted" }),
    );
    const gone = await comment(a.actors.owner, issue, "Never mind");
    await commentService.deleteComment(a.actors.owner, { orgId: a.org.id, commentId: gone.id });
    await comment(a.actors.admin, issue);

    const participants = await commentService.getIssueParticipants(a.actors.member, a.org.id, issue.id);

    expect(sorted(participants)).toEqual(sorted([a.userIds.member, a.userIds.admin]));
  });

  it("leaves out people who are no longer members of the organization", async () => {
    const leaver = await extraMember(a);
    const stayer = await extraMember(a);

    const issue = await issueService.createIssue(
      leaver.actor,
      issueInput(a.org.id, a.project.id, { title: "Participants leaver" }),
    );
    await comment(leaver.actor, issue);
    await comment(stayer.actor, issue);
    await leaver.remove();

    const participants = await commentService.getIssueParticipants(a.actors.viewer, a.org.id, issue.id);

    expect(sorted(participants)).toEqual([stayer.actor.userId]);
  });

  it("treats another organization's issue as not found, and another organization as off limits", async () => {
    const theirs = await issueService.createIssue(
      b.actors.member,
      issueInput(b.org.id, b.project.id, { title: "Foreign participants" }),
    );

    await expect(
      commentService.getIssueParticipants(a.actors.owner, a.org.id, theirs.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      commentService.getIssueParticipants(a.actors.owner, b.org.id, theirs.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
  });

  it("lists distinct live comment authors per issue in the repository", async () => {
    const issue = await issueService.createIssue(
      a.actors.member,
      issueInput(a.org.id, a.project.id, { title: "Repository authors" }),
    );
    const other = await issueService.createIssue(
      a.actors.member,
      issueInput(a.org.id, a.project.id, { title: "Repository other" }),
    );
    await comment(a.actors.admin, issue);
    await comment(a.actors.admin, issue, "twice");
    const deleted = await comment(a.actors.owner, issue);
    await commentService.deleteComment(a.actors.owner, { orgId: a.org.id, commentId: deleted.id });
    await comment(a.actors.member, other);

    expect(sorted(await commentRepo.listCommentAuthorIds(a.org.id, issue.id))).toEqual([
      a.userIds.admin,
    ]);
    expect(await commentRepo.listCommentAuthorIds(b.org.id, issue.id)).toEqual([]);
  });

  it("validates the request shape", () => {
    expect(
      issueParticipantsSchema.safeParse({ orgId: a.org.id, issueId: a.project.id }).success,
    ).toBe(true);
    expect(issueParticipantsSchema.safeParse({ orgId: a.org.id, issueId: "nope" }).success).toBe(false);
    expect(issueParticipantsSchema.safeParse({ orgId: a.org.id }).success).toBe(false);
  });
});
