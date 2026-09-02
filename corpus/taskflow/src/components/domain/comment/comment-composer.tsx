"use client";

/**
 * Comment box bound to `createCommentSchema`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createCommentSchema
 */
import type { CreateCommentInput } from "@/schemas/comment";
import type { ActionResult } from "@/types/api";
import type { Comment } from "@/types/comment";
import type { IssueId, OrgId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
export type CommentComposerProps = { orgId: OrgId; issueId: IssueId; members: readonly MemberWithUser[]; onSubmit: (input: CreateCommentInput) => Promise<ActionResult<Comment>> };

export function CommentComposer(props: CommentComposerProps): ReactElement | null {
  return null;
}
