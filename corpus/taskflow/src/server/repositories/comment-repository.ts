/**
 * Comment rows, soft deleted so a deleted comment keeps its place in the thread.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): archivePatch, shouldFilterArchived
 */
import type { CreateCommentInput, ListCommentsInput, UpdateCommentInput } from "@/schemas/comment";
import type { Comment, CommentThreadNode, CommentWithAuthor } from "@/types/comment";
import type { CommentId, IssueId, OrgId, Page, UserId } from "@/types/common";
export async function findCommentById(orgId: OrgId, commentId: CommentId): Promise<Comment | null> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function listComments(input: ListCommentsInput): Promise<Page<CommentWithAuthor>> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function listThread(orgId: OrgId, issueId: IssueId): Promise<readonly CommentThreadNode[]> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function countComments(orgId: OrgId, issueId: IssueId): Promise<number> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function insertComment(input: CreateCommentInput, authorId: UserId): Promise<Comment> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function updateComment(input: UpdateCommentInput): Promise<Comment> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}

export async function archiveComment(orgId: OrgId, commentId: CommentId): Promise<Comment> {
  throw new Error("stub: src/server/repositories/comment-repository.ts");
}
