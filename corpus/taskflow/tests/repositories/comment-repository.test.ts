/**
 * Thread assembly and soft-deleted rows.
 *
 * Owner C implements `@/server/repositories/comment-repository`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let north: Tenant;
let acme: Tenant;
let northIssue: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  north = await createTenant("northwind-comments");
  acme = await createTenant("acme-comments");

  const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
  northIssue = await issueRepo.insertIssue(
    issueInput(north.org.id, north.project.id, { title: "Thread carrier" }),
    north.userIds.owner,
    number,
  );
});

afterAll(() => {
  cleanup();
});

describe("repositories/comment-repository", () => {
  it("assembles top-level comments with their replies", async () => {
    const top = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: northIssue.id,
        body: "Top-level comment",
        parentId: null,
        mentionedUserIds: [],
      },
      north.userIds.owner,
    );
    const reply = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: northIssue.id,
        body: "A reply",
        parentId: top.id,
        mentionedUserIds: [],
      },
      north.userIds.member,
    );

    const thread = await commentRepo.listThread(north.org.id, northIssue.id);
    const node = thread.find((n) => n.comment.id === top.id);

    expect(node).toBeDefined();
    expect(node?.replies.map((r) => r.id)).toEqual([reply.id]);
  });

  it("orders replies oldest first inside a thread", async () => {
    const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(north.org.id, north.project.id, { title: "Ordering thread" }),
      north.userIds.owner,
      number,
    );

    const top = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Parent",
        parentId: null,
        mentionedUserIds: [],
      },
      north.userIds.owner,
    );
    const first = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "First reply",
        parentId: top.id,
        mentionedUserIds: [],
      },
      north.userIds.member,
    );
    const second = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Second reply",
        parentId: top.id,
        mentionedUserIds: [],
      },
      north.userIds.member,
    );

    const thread = await commentRepo.listThread(north.org.id, issue.id);
    const node = thread.find((n) => n.comment.id === top.id);

    expect(node?.replies.map((r) => r.id)).toEqual([first.id, second.id]);
  });

  it("hides soft-deleted comments from the default listing", async () => {
    const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(north.org.id, north.project.id, { title: "Soft delete listing" }),
      north.userIds.owner,
      number,
    );
    const comment = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Will be deleted",
        parentId: null,
        mentionedUserIds: [],
      },
      north.userIds.owner,
    );
    await commentRepo.archiveComment(north.org.id, comment.id);

    const page = await commentRepo.listComments({
      orgId: north.org.id,
      issueId: issue.id,
      limit: 25,
      cursor: null,
      includeArchived: false,
    });

    expect(page.items.map((row) => row.id)).not.toContain(comment.id);
  });

  it("keeps live replies when their parent is soft-deleted", async () => {
    const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(north.org.id, north.project.id, { title: "Deleted parent" }),
      north.userIds.owner,
      number,
    );

    const top = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Parent to delete",
        parentId: null,
        mentionedUserIds: [],
      },
      north.userIds.owner,
    );
    const reply = await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Still alive",
        parentId: top.id,
        mentionedUserIds: [],
      },
      north.userIds.member,
    );
    await commentRepo.archiveComment(north.org.id, top.id);

    const thread = await commentRepo.listThread(north.org.id, issue.id);
    const node = thread.find((n) => n.comment.id === top.id);

    expect(node).toBeDefined();
    expect(node?.comment.archivedAt).not.toBeNull();
    expect(node?.replies.map((r) => r.id)).toEqual([reply.id]);
  });

  it("scopes the thread to the organization, not just the issue", async () => {
    await expect(
      commentRepo.listThread(acme.org.id, northIssue.id),
    ).resolves.toEqual([]);
  });

  it("joins the author user record onto each comment", async () => {
    const number = await issueRepo.nextIssueNumber(north.org.id, north.project.id);
    const issue = await issueRepo.insertIssue(
      issueInput(north.org.id, north.project.id, { title: "Author join" }),
      north.userIds.owner,
      number,
    );
    await commentRepo.insertComment(
      {
        orgId: north.org.id,
        issueId: issue.id,
        body: "Authored",
        parentId: null,
        mentionedUserIds: [],
      },
      north.userIds.member,
    );

    const page = await commentRepo.listComments({
      orgId: north.org.id,
      issueId: issue.id,
      limit: 25,
      cursor: null,
      includeArchived: false,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.author.id).toBe(north.userIds.member);
    expect(page.items[0]?.author.email).toBe(`member@northwind-comments.test`);
  });
});
