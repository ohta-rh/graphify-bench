import { z } from "zod";
import type { IssuePriority, IssueStatus } from "@/types/issue";
import {
  archiveScopeSchema,
  isoTimestampSchema,
  issueIdSchema,
  labelIdSchema,
  orgIdSchema,
  pageRequestSchema,
  projectIdSchema,
  userIdSchema,
} from "./common";

export const issueStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
]);

export const issuePrioritySchema = z.enum([
  "none",
  "low",
  "medium",
  "high",
  "urgent",
]);

export const createIssueSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema,
  title: z.string().min(3, "give the issue a title").max(200),
  description: z.string().max(20_000).nullable().default(null),
  status: issueStatusSchema.default("backlog"),
  priority: issuePrioritySchema.default("none"),
  assigneeId: userIdSchema.nullable().default(null),
  parentId: issueIdSchema.nullable().default(null),
  estimate: z.number().int().min(0).max(100).nullable().default(null),
  dueAt: isoTimestampSchema.nullable().default(null),
  labelIds: z.array(labelIdSchema).max(20).default([]),
});

export const updateIssueSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(20_000).nullable().optional(),
  priority: issuePrioritySchema.optional(),
  estimate: z.number().int().min(0).max(100).nullable().optional(),
  dueAt: isoTimestampSchema.nullable().optional(),
  labelIds: z.array(labelIdSchema).max(20).optional(),
});

export const changeIssueStatusSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  status: issueStatusSchema,
});

export const assignIssueSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  assigneeId: userIdSchema.nullable(),
});

export const archiveIssueSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
});

export const issueFilterSchema = z
  .object({
    orgId: orgIdSchema,
    projectId: projectIdSchema.optional(),
    status: z.array(issueStatusSchema).optional(),
    priority: z.array(issuePrioritySchema).optional(),
    assigneeId: userIdSchema.nullable().optional(),
    authorId: userIdSchema.optional(),
    labelIds: z.array(labelIdSchema).optional(),
    query: z.string().max(200).optional(),
    dueBefore: isoTimestampSchema.optional(),
  })
  .extend(pageRequestSchema.shape)
  .extend(archiveScopeSchema.shape);

/** Board drag-and-drop payload: move one issue into a column at an index. */
export const moveIssueSchema = z.object({
  orgId: orgIdSchema,
  issueId: issueIdSchema,
  toStatus: issueStatusSchema,
  toIndex: z.number().int().min(0),
});

const _statusParity: IssueStatus = "in_review" satisfies z.infer<
  typeof issueStatusSchema
>;
const _priorityParity: IssuePriority = "urgent" satisfies z.infer<
  typeof issuePrioritySchema
>;
void _statusParity;
void _priorityParity;

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ChangeIssueStatusInput = z.infer<typeof changeIssueStatusSchema>;
export type AssignIssueInput = z.infer<typeof assignIssueSchema>;
export type IssueFilterInput = z.infer<typeof issueFilterSchema>;
export type MoveIssueInput = z.infer<typeof moveIssueSchema>;
