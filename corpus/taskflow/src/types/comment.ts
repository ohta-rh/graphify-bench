import type {
  CommentId,
  IssueId,
  SoftDeletable,
  TenantScoped,
  Timestamps,
  UserId,
} from "./common";
import type { User } from "./member";

export interface Comment extends Timestamps, TenantScoped, SoftDeletable {
  readonly id: CommentId;
  readonly issueId: IssueId;
  readonly authorId: UserId;
  readonly body: string;
  readonly parentId: CommentId | null;
  readonly editedAt: string | null;
  readonly mentionedUserIds: readonly UserId[];
}

export interface CommentWithAuthor extends Comment {
  readonly author: User;
}

/** A top-level comment plus its replies, as rendered by `CommentThread`. */
export interface CommentThreadNode {
  readonly comment: CommentWithAuthor;
  readonly replies: readonly CommentWithAuthor[];
}

export interface CommentDraft {
  readonly issueId: IssueId;
  readonly body: string;
  readonly parentId: CommentId | null;
}
