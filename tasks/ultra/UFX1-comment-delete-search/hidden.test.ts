/**
 * UFX1 — deleted comments, archived issues and the search index rebuild.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { runSearchReindexJob } from "@/server/jobs/search-reindex-job";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as searchService from "@/server/services/search-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Comment } from "@/types/comment";
import type { CommentId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let detach: Unsubscribe;
let acme: Tenant;
let globex: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  detach = searchService.registerSearchListeners();
  acme = await createTenant("ufx1-acme", "growth");
  globex = await createTenant("ufx1-globex", "growth");
});

afterAll(() => {
  detach();
  cleanup();
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
});

async function newIssue(tenant: Tenant, title: string): Promise<Issue> {
  return issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title }),
  );
}

async function comment(
  tenant: Tenant,
  issue: Issue,
  body: string,
  parentId: CommentId | null = null,
): Promise<Comment> {
  return commentService.createComment(tenant.actors.member, {
    orgId: tenant.org.id,
    issueId: issue.id,
    body,
    parentId,
    mentionedUserIds: [],
  });
}

async function remove(tenant: Tenant, target: Comment): Promise<void> {
  await commentService.deleteComment(tenant.actors.admin, {
    orgId: tenant.org.id,
    commentId: target.id,
  });
}

async function hits(
  tenant: Tenant,
  q: string,
  kind: "issue" | "comment",
): Promise<readonly string[]> {
  const page = await searchService.search(tenant.actors.member, {
    orgId: tenant.org.id,
    q,
    kinds: [kind],
    limit: 100,
    cursor: null,
  });
  return page.items.map((item) => item.id).sort();
}

async function total(tenant: Tenant, q: string, kind: "issue" | "comment"): Promise<number> {
  const page = await searchService.search(tenant.actors.member, {
    orgId: tenant.org.id,
    q,
    kinds: [kind],
    limit: 25,
    cursor: null,
  });
  return page.total;
}

describe("UFX1 comment count", () => {
  it("does not count deleted comments on the issue page, but counts live replies", async () => {
    const issue = await newIssue(acme, "Count target issue");
    const top = await comment(acme, issue, "top level note");
    await comment(acme, issue, "reply under the top note", top.id);
    await comment(acme, issue, "another top level note");

    await remove(acme, top);

    const view = await issueService.getIssue(acme.actors.member, acme.org.id, issue.id);
    expect(view.commentCount).toBe(2);
  });
});

describe("UFX1 search after deleting a comment", () => {
  it("drops the deleted comment from search right away", async () => {
    const issue = await newIssue(acme, "Deletion target issue");
    const doomed = await comment(acme, issue, "Quasardelete marker text");
    expect(await hits(acme, "Quasardelete", "comment")).toEqual([doomed.id]);

    await remove(acme, doomed);

    expect(await hits(acme, "Quasardelete", "comment")).toEqual([]);
  });

  it("keeps the deleted comment's replies and its issue searchable", async () => {
    const issue = await newIssue(acme, "Pulsarkeep issue title");
    const parent = await comment(acme, issue, "Pulsarkeep parent comment");
    const reply = await comment(acme, issue, "Pulsarkeep reply comment", parent.id);

    await remove(acme, parent);

    expect(await hits(acme, "Pulsarkeep", "comment")).toEqual([reply.id]);
    expect(await hits(acme, "Pulsarkeep", "issue")).toEqual([issue.id]);
  });
});

describe("UFX1 search after archiving an issue", () => {
  it("drops the archived issue's comments and replies, and nothing else", async () => {
    const archivedIssue = await newIssue(acme, "Nebulaarch going away");
    const keptIssue = await newIssue(acme, "Nebulaarch staying");
    const top = await comment(acme, archivedIssue, "Nebulaarch top comment");
    await comment(acme, archivedIssue, "Nebulaarch reply comment", top.id);
    const kept = await comment(acme, keptIssue, "Nebulaarch kept comment");

    const other = await newIssue(globex, "Nebulaarch other tenant");
    const otherComment = await comment(globex, other, "Nebulaarch other tenant comment");

    await issueService.archiveIssue(acme.actors.admin, acme.org.id, archivedIssue.id);

    expect(await hits(acme, "Nebulaarch", "comment")).toEqual([kept.id]);
    expect(await hits(acme, "Nebulaarch", "issue")).toEqual([keptIssue.id]);
    expect(await hits(globex, "Nebulaarch", "comment")).toEqual([otherComment.id]);
  });
});

describe("UFX1 search index rebuild", () => {
  it("does not bring a deleted comment back", async () => {
    const issue = await newIssue(acme, "Rebuild deleted issue");
    const doomed = await comment(acme, issue, "Cometgone deleted before rebuild");
    const live = await comment(acme, issue, "Cometgone still here");
    await remove(acme, doomed);

    await runSearchReindexJob(acme.org.id);

    expect(await hits(acme, "Cometgone", "comment")).toEqual([live.id]);
  });

  it("indexes a live reply whose parent comment was deleted", async () => {
    const issue = await newIssue(acme, "Rebuild orphan issue");
    const parent = await comment(acme, issue, "Orbitparent will be deleted");
    // Imported straight into the table: only the rebuild can index it.
    const reply = await commentRepo.insertComment(
      {
        orgId: acme.org.id,
        issueId: issue.id,
        body: "Orbitparent imported reply survives",
        parentId: parent.id,
        mentionedUserIds: [],
      },
      acme.userIds.member,
    );
    await remove(acme, parent);
    expect(await hits(acme, "Orbitparent", "comment")).toEqual([]);

    await runSearchReindexJob(acme.org.id);

    expect(await hits(acme, "Orbitparent", "comment")).toEqual([reply.id]);
  });

  it("does not bring an archived issue or its comments back", async () => {
    const issue = await newIssue(acme, "Meteorarch archived issue");
    await comment(acme, issue, "Meteorarch comment on archived issue");
    await issueService.archiveIssue(acme.actors.admin, acme.org.id, issue.id);

    await runSearchReindexJob(acme.org.id);

    expect(await hits(acme, "Meteorarch", "issue")).toEqual([]);
    expect(await hits(acme, "Meteorarch", "comment")).toEqual([]);
  });

  it("indexes every live issue of a workspace holding more than one hundred", async () => {
    const tenant = await createTenant("ufx1-bulk", "growth");
    const inserted: string[] = [];
    for (let i = 0; i < 107; i += 1) {
      const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
      const issue = await issueRepo.insertIssue(
        issueInput(tenant.org.id, tenant.project.id, {
          title: `Bulkimport item ${String(i).padStart(3, "0")}`,
        }),
        tenant.userIds.owner,
        number,
      );
      inserted.push(issue.id);
    }

    await runSearchReindexJob(tenant.org.id);

    expect(await total(tenant, "Bulkimport", "issue")).toBe(107);
    expect(await hits(tenant, "Bulkimport item 000", "issue")).toEqual([inserted[0]]);
  });

  it("indexes every live comment of an issue holding more than one hundred", async () => {
    const tenant = await createTenant("ufx1-chatty", "growth");
    const number = await issueRepo.nextIssueNumber(tenant.org.id, tenant.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(tenant.org.id, tenant.project.id, { title: "Chatty issue" }),
      tenant.userIds.owner,
      number,
    );
    const first = await commentRepo.insertComment(
      {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "Chattyline first ever",
        parentId: null,
        mentionedUserIds: [],
      },
      tenant.userIds.member,
    );
    for (let i = 0; i < 104; i += 1) {
      await commentRepo.insertComment(
        {
          orgId: tenant.org.id,
          issueId: issue.id,
          body: `Chattyline message ${i}`,
          parentId: null,
          mentionedUserIds: [],
        },
        tenant.userIds.member,
      );
    }

    await runSearchReindexJob(tenant.org.id);

    expect(await total(tenant, "Chattyline", "comment")).toBe(105);
    expect(await hits(tenant, "Chattyline first", "comment")).toEqual([first.id]);
  });

  it("is scoped to one workspace and idempotent", async () => {
    const mine = await newIssue(acme, "Galaxyscope acme issue");
    const mineComment = await comment(acme, mine, "Galaxyscope acme comment");

    const number = await issueRepo.nextIssueNumber(globex.org.id, globex.project.id);
    await issueRepo.insertIssue(
      issueInput(globex.org.id, globex.project.id, { title: "Galaxyscope globex issue" }),
      globex.userIds.owner,
      number,
    );

    await runSearchReindexJob(acme.org.id);
    await runSearchReindexJob(acme.org.id);

    expect(await hits(acme, "Galaxyscope", "issue")).toEqual([mine.id]);
    expect(await hits(acme, "Galaxyscope", "comment")).toEqual([mineComment.id]);
    expect(await total(globex, "Galaxyscope", "issue")).toBe(0);
  });
});
