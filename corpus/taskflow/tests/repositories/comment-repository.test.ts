/**
 * Thread assembly and soft-deleted rows.
 *
 * Owner C implements `@/server/repositories/comment-repository`.
 */
import { describe, it } from "vitest";

describe("repositories/comment-repository", () => {
  // Replies attach to their parentId, producing CommentThreadNode entries.
  it.todo("assembles top-level comments with their replies");

  // Replies are ordered by createdAt inside each thread.
  it.todo("orders replies oldest first inside a thread");

  // A soft-deleted comment is excluded by default.
  it.todo("hides soft-deleted comments from the default listing");

  // A deleted parent still renders its live replies rather than losing them.
  it.todo("keeps live replies when their parent is soft-deleted");

  // Every query is filtered by orgId as well as issueId.
  it.todo("scopes the thread to the organization, not just the issue");

  // The joined author row comes back with the comment.
  it.todo("joins the author user record onto each comment");
});
