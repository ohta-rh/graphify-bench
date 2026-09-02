/**
 * Comment rows, soft deleted so a deleted comment keeps its place in the thread.
 *
 * Must call (do not reimplement): archivePatch, shouldFilterArchived
 */
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { newId } from "@/lib/id";
import { archivePatch, shouldFilterArchived } from "@/lib/soft-delete";
import { comments, getDb, users } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toComment, toUser } from "./_mappers";
import type {
  CreateCommentInput,
  ListCommentsInput,
  UpdateCommentInput,
} from "@/schemas/comment";
import type {
  Comment,
  CommentThreadNode,
  CommentWithAuthor,
} from "@/types/comment";
import type { CommentId, IssueId, OrgId, Page, UserId } from "@/types/common";

export async function findCommentById(
  orgId: OrgId,
  commentId: CommentId,
): Promise<Comment | null> {
  const row = getDb()
    .select()
    .from(comments)
    .where(and(orgPredicate(comments.orgId, orgId), eq(comments.id, commentId)))
    .get();
  return row ? toComment(row) : null;
}

export async function listComments(
  input: ListCommentsInput,
): Promise<Page<CommentWithAuthor>> {
  const db = getDb();
  const sort = { sortColumn: comments.createdAt, idColumn: comments.id };

  const filters = compact(
    orgPredicate(comments.orgId, input.orgId),
    eq(comments.issueId, input.issueId),
    shouldFilterArchived(input) ? isNull(comments.archivedAt) : undefined,
  );

  const total = db
    .select({ value: count() })
    .from(comments)
    .where(and(...filters))
    .get();

  const rows = db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(
    rows,
    input.limit,
    total?.value ?? 0,
    (row) => ({ ...toComment(row.comment), author: toUser(row.author) }),
    (row) => ({ id: row.comment.id, sortValue: row.comment.createdAt }),
  );
}

/**
 * The whole thread for one issue, in reading order: top-level comments oldest
 * first, each followed by its replies. Archived comments are kept so a reply
 * chain never loses its anchor — the UI renders them as "deleted".
 */
export async function listThread(
  orgId: OrgId,
  issueId: IssueId,
): Promise<readonly CommentThreadNode[]> {
  const rows = getDb()
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(
      and(
        orgPredicate(comments.orgId, orgId),
        eq(comments.issueId, issueId),
      ),
    )
    .orderBy(asc(comments.createdAt))
    .all();

  const decorated: CommentWithAuthor[] = rows.map((row) => ({
    ...toComment(row.comment),
    author: toUser(row.author),
  }));

  const repliesBy = new Map<string, CommentWithAuthor[]>();
  for (const comment of decorated) {
    if (comment.parentId === null) continue;
    const bucket = repliesBy.get(comment.parentId) ?? [];
    bucket.push(comment);
    repliesBy.set(comment.parentId, bucket);
  }

  return decorated
    .filter((comment) => comment.parentId === null)
    .map((comment) => ({
      comment,
      replies: repliesBy.get(comment.id) ?? [],
    }));
}

export async function countComments(
  orgId: OrgId,
  issueId: IssueId,
): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(comments)
    .where(
      and(
        orgPredicate(comments.orgId, orgId),
        eq(comments.issueId, issueId),
        isNull(comments.archivedAt),
      ),
    )
    .get();
  return row?.value ?? 0;
}

export async function insertComment(
  input: CreateCommentInput,
  authorId: UserId,
): Promise<Comment> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(comments)
    .values({
      id: newId(),
      orgId: input.orgId,
      issueId: input.issueId,
      authorId,
      body: input.body,
      parentId: input.parentId,
      editedAt: null,
      mentionedUserIds: JSON.stringify(input.mentionedUserIds),
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toComment(row);
}

/** An edit stamps `edited_at`, which the UI shows next to the timestamp. */
export async function updateComment(
  input: UpdateCommentInput,
): Promise<Comment> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .update(comments)
    .set({ body: input.body, editedAt: stamp, updatedAt: stamp })
    .where(
      and(
        orgPredicate(comments.orgId, input.orgId),
        eq(comments.id, input.commentId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Comment ${input.commentId} not found`);
  return toComment(row);
}

export async function archiveComment(
  orgId: OrgId,
  commentId: CommentId,
): Promise<Comment> {
  const row = getDb()
    .update(comments)
    .set(archivePatch())
    .where(and(orgPredicate(comments.orgId, orgId), eq(comments.id, commentId)))
    .returning()
    .get();

  if (!row) throw new Error(`Comment ${commentId} not found`);
  return toComment(row);
}
