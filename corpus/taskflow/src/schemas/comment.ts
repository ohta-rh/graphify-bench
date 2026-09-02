import { z } from "zod";
import {
  commentIdSchema,
  issueIdSchema,
  orgIdSchema,
  pageRequestSchema,
  userIdSchema,
} from "./common";

export const createCommentSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  body: z.string().min(1, "write something").max(10_000),
  parentId: commentIdSchema.nullable().default(null),
  mentionedUserIds: z.array(userIdSchema).max(50).default([]),
});

export const updateCommentSchema = z.object({
  orgId: orgIdSchema,
  commentId: commentIdSchema,
  body: z.string().min(1).max(10_000),
});

export const deleteCommentSchema = z.object({
  orgId: orgIdSchema,
  commentId: commentIdSchema,
});

export const listCommentsSchema = z
  .object({
    orgId: orgIdSchema,
    issueId: issueIdSchema,
    includeArchived: z.boolean().default(false),
  })
  .extend(pageRequestSchema.shape);

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;
export type ListCommentsInput = z.infer<typeof listCommentsSchema>;
