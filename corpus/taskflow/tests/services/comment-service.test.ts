/**
 * Comment authoring, edit window and soft delete.
 *
 * Owner C implements `@/server/services/comment-service`.
 */
import { describe, it } from "vitest";

describe("services/comment-service", () => {
  // resolveMentions() populates mentionedUserIds from the org's member list.
  it.todo("resolves @handle mentions to member ids on create");

  // comment.created carries the resolved mentionedUserIds for the fan-out.
  it.todo("emits comment.created with the resolved mentions");

  // COMMENT_EDIT_WINDOW_MINUTES bounds how long an author may edit.
  it.todo("allows the author to edit inside the edit window");

  // Past the window the edit is a conflict, even for the author.
  it.todo("refuses an edit once the edit window has closed");

  // An admin passes by role where a non-author viewer does not.
  it.todo("lets an admin delete a comment they did not write");

  // Deleting applies archivePatch and emits comment.deleted.
  it.todo("soft-deletes rather than removing the row");

  // consumeRateLimit(orgId, "comment:create") gates burst commenting.
  it.todo("rate-limits comment creation per organization");
});
