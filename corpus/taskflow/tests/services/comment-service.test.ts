/**
 * Comment authoring, edit window and soft delete.
 *
 * Owner C implements `@/server/services/comment-service`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Issue } from "@/types/issue";

let cleanup: () => void;
let tenant: Tenant;
let issue: Issue;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("commentsvc");
  issue = await issueService.createIssue(
    tenant.actors.member,
    issueInput(tenant.org.id, tenant.project.id, { title: "Comment target" }),
  );
});

afterAll(() => {
  cleanup();
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
  vi.useRealTimers();
});

describe("services/comment-service", () => {
  it("resolves @handle mentions to member ids on create", async () => {
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: `Heads up @admin, please take a look`,
      parentId: null,
      mentionedUserIds: [],
    });

    expect(comment.mentionedUserIds).toEqual([tenant.userIds.admin]);
  });

  it("emits comment.created with the resolved mentions", async () => {
    const received: unknown[] = [];
    const off = subscribe("comment.created", (payload) => {
      received.push(payload);
    });

    try {
      const comment = await commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: `cc @owner`,
        parentId: null,
        mentionedUserIds: [],
      });

      expect(received).toHaveLength(1);
      expect(received[0]).toMatchObject({
        commentId: comment.id,
        issueId: issue.id,
        mentionedUserIds: [tenant.userIds.owner],
      });
    } finally {
      off();
    }
  });

  it("allows the author to edit inside the edit window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "original body",
      parentId: null,
      mentionedUserIds: [],
    });

    vi.setSystemTime(new Date("2026-01-01T00:05:00.000Z"));

    const edited = await commentService.updateComment(tenant.actors.member, {
      orgId: tenant.org.id,
      commentId: comment.id,
      body: "edited within the window",
    });

    expect(edited.body).toBe("edited within the window");
  });

  it("refuses an edit once the edit window has closed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-02T00:00:00.000Z"));

    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "original body",
      parentId: null,
      mentionedUserIds: [],
    });

    vi.setSystemTime(new Date("2026-01-02T00:16:00.000Z"));

    await expect(
      commentService.updateComment(tenant.actors.member, {
        orgId: tenant.org.id,
        commentId: comment.id,
        body: "too late",
      }),
    ).rejects.toThrow(/edit window/);
  });

  it("lets an admin delete a comment they did not write", async () => {
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "member wrote this",
      parentId: null,
      mentionedUserIds: [],
    });

    await expect(
      commentService.deleteComment(tenant.actors.admin, {
        orgId: tenant.org.id,
        commentId: comment.id,
      }),
    ).resolves.toMatchObject({ id: comment.id });
  });

  it("soft-deletes rather than removing the row", async () => {
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "will be deleted",
      parentId: null,
      mentionedUserIds: [],
    });

    await commentService.deleteComment(tenant.actors.member, {
      orgId: tenant.org.id,
      commentId: comment.id,
    });

    const stillThere = await commentRepo.findCommentById(tenant.org.id, comment.id);
    expect(stillThere).not.toBeNull();
    expect(stillThere?.archivedAt).not.toBeNull();
  });

  it("rate-limits comment creation per organization", async () => {
    rateLimitState.allowed = false;

    await expect(
      commentService.createComment(tenant.actors.member, {
        orgId: tenant.org.id,
        issueId: issue.id,
        body: "should be throttled",
        parentId: null,
        mentionedUserIds: [],
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});
