/**
 * Comment creation, edit window enforcement, mention extraction and soft delete.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, archivePatch
 */
import { emit } from "@/lib/event-bus";
import { resolveMentions } from "@/lib/mentions";
import { assertCan } from "@/lib/permissions";
import { archivePatch, assertNotArchived } from "@/lib/soft-delete";
import { assertOrgScope } from "@/lib/tenant";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import {
  actorEnvelope,
  commentResource,
  issueResource,
  requireFound,
} from "./_support";
import type {
  CreateCommentInput,
  DeleteCommentInput,
  UpdateCommentInput,
} from "@/schemas/comment";
import type { Comment, CommentThreadNode } from "@/types/comment";
import type { IssueId, OrgId, UserId } from "@/types/common";
import type { Actor } from "@/types/member";

/** How long after posting an author may still edit their own comment. */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** How many members are scanned when resolving `@handle` mentions. */
const MENTION_LOOKUP_LIMIT = 100;

/**
 * Posts a comment on a live issue. Mentions written as `@handle` in the body
 * are resolved against the org's members here, so the stored row and the
 * `comment.created` payload agree on who was mentioned — the notification
 * fan-out reads that list rather than re-parsing the markdown.
 */
export async function createComment(
  actor: Actor,
  input: CreateCommentInput,
): Promise<Comment> {
  assertOrgScope(actor, input.orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(input.orgId, input.issueId),
    "Issue",
    input.issueId,
  );
  assertCan(actor, "comment:create", issueResource(issue));
  assertNotArchived("Issue", issue.id, issue);

  const mentionedUserIds = await resolveMentionedUsers(
    input.orgId,
    input.body,
    input.mentionedUserIds,
  );

  const comment = await commentRepo.insertComment(
    { ...input, mentionedUserIds: [...mentionedUserIds] },
    actor.userId,
  );

  await emit("comment.created", {
    ...actorEnvelope(actor),
    commentId: comment.id,
    issueId: comment.issueId,
    mentionedUserIds,
  });

  return comment;
}

/**
 * Edits are allowed inside a fifteen-minute window, or by anyone the role
 * matrix already lets update a comment. `can()` decides the second half —
 * this service only owns the time window.
 */
export async function updateComment(
  actor: Actor,
  input: UpdateCommentInput,
): Promise<Comment> {
  assertOrgScope(actor, input.orgId);

  const comment = requireFound(
    await commentRepo.findCommentById(input.orgId, input.commentId),
    "Comment",
    input.commentId,
  );
  assertCan(actor, "comment:update", commentResource(comment));
  assertNotArchived("Comment", comment.id, comment);

  if (comment.authorId === actor.userId && isPastEditWindow(comment)) {
    throw new Error("The edit window for this comment has closed");
  }

  return commentRepo.updateComment(input);
}

/**
 * Deletion is soft: the row keeps its place so replies below it still have an
 * anchor. `archivePatch()` is what the repository writes; asking for it here
 * documents that this service deliberately never issues a hard delete.
 */
export async function deleteComment(
  actor: Actor,
  input: DeleteCommentInput,
): Promise<Comment> {
  assertOrgScope(actor, input.orgId);

  const comment = requireFound(
    await commentRepo.findCommentById(input.orgId, input.commentId),
    "Comment",
    input.commentId,
  );
  assertCan(actor, "comment:delete", commentResource(comment));
  assertNotArchived("Comment", comment.id, comment);

  const { archivedAt } = archivePatch();
  const archived = await commentRepo.archiveComment(
    input.orgId,
    input.commentId,
  );

  await emit("comment.deleted", {
    ...actorEnvelope(actor),
    occurredAt: archivedAt,
    commentId: archived.id,
    issueId: archived.issueId,
  });

  return archived;
}

export async function getThread(
  actor: Actor,
  orgId: OrgId,
  issueId: IssueId,
): Promise<readonly CommentThreadNode[]> {
  assertOrgScope(actor, orgId);

  const issue = requireFound(
    await issueRepo.findIssueById(orgId, issueId),
    "Issue",
    issueId,
  );
  assertCan(actor, "comment:read", issueResource(issue));

  return commentRepo.listThread(orgId, issueId);
}

function isPastEditWindow(comment: Comment): boolean {
  const posted = new Date(comment.createdAt).getTime();
  return Date.now() - posted > EDIT_WINDOW_MS;
}

/**
 * Union of the ids the client already resolved (optimistic UI) and the ones
 * parsed out of the body server-side. The server list wins on disagreement.
 */
async function resolveMentionedUsers(
  orgId: OrgId,
  body: string,
  clientProvided: readonly UserId[],
): Promise<readonly UserId[]> {
  const members = await memberRepo.listMembers({
    orgId,
    limit: MENTION_LOOKUP_LIMIT,
    cursor: null,
  });

  const resolved = resolveMentions(body, members.items);
  const known = new Set(members.items.map((member) => member.userId));

  return [
    ...new Set([...resolved, ...clientProvided.filter((id) => known.has(id))]),
  ];
}
