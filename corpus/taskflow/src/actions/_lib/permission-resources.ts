/**
 * Placeholder branded ids for `can()` calls about rows that do not exist yet.
 *
 * `PermissionResource` is a closed discriminated union, so asking "may this
 * actor create an issue in this project?" still has to name an `issueId`. The
 * ownership escalations inside `can()` compare ids for equality, and an empty
 * string never matches a real ULID — so a create check falls through to the
 * role matrix, which is exactly the intent.
 */

import type {
  CommentId,
  IssueId,
  MemberId,
  OrgId,
  ProjectId,
} from "@/types/common";

export const PENDING_ISSUE_ID = "" as IssueId;
export const PENDING_PROJECT_ID = "" as ProjectId;
export const PENDING_COMMENT_ID = "" as CommentId;
export const PENDING_MEMBER_ID = "" as MemberId;

/**
 * Bucket owner for rate limits consumed before any tenant is known — the login
 * and password-reset flows, which are reachable without a session.
 */
export const ANONYMOUS_ORG_ID = "" as OrgId;
