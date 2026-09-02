/**
 * Comment creation, edit window enforcement, mention extraction and soft delete.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, emit, archivePatch
 */
import type { CreateCommentInput, DeleteCommentInput, UpdateCommentInput } from "@/schemas/comment";
import type { Comment, CommentThreadNode } from "@/types/comment";
import type { IssueId, OrgId } from "@/types/common";
import type { Actor } from "@/types/member";
export async function createComment(actor: Actor, input: CreateCommentInput): Promise<Comment> {
  throw new Error("stub: src/server/services/comment-service.ts");
}

export async function updateComment(actor: Actor, input: UpdateCommentInput): Promise<Comment> {
  throw new Error("stub: src/server/services/comment-service.ts");
}

export async function deleteComment(actor: Actor, input: DeleteCommentInput): Promise<Comment> {
  throw new Error("stub: src/server/services/comment-service.ts");
}

export async function getThread(actor: Actor, orgId: OrgId, issueId: IssueId): Promise<readonly CommentThreadNode[]> {
  throw new Error("stub: src/server/services/comment-service.ts");
}
