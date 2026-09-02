import { z } from "zod";
import {
  isoTimestampSchema,
  orgIdSchema,
  pageRequestSchema,
  projectIdSchema,
  userIdSchema,
} from "./common";

export const activityActionSchema = z.enum([
  "organization.updated",
  "project.created",
  "project.updated",
  "project.archived",
  "project.restored",
  "issue.created",
  "issue.updated",
  "issue.status_changed",
  "issue.assigned",
  "issue.archived",
  "issue.restored",
  "comment.created",
  "comment.updated",
  "comment.deleted",
  "member.invited",
  "member.joined",
  "member.role_changed",
  "member.removed",
  "billing.plan_changed",
  "flag.toggled",
]);

export const activitySubjectKindSchema = z.enum([
  "organization",
  "project",
  "issue",
  "comment",
  "member",
  "subscription",
  "feature_flag",
]);

export const activityFilterSchema = z
  .object({
    orgId: orgIdSchema,
    action: z.array(activityActionSchema).optional(),
    actorId: userIdSchema.optional(),
    projectId: projectIdSchema.optional(),
    subjectKind: activitySubjectKindSchema.optional(),
    since: isoTimestampSchema.optional(),
    until: isoTimestampSchema.optional(),
  })
  .extend(pageRequestSchema.shape);

export const exportActivitySchema = z.object({
  orgId: orgIdSchema,
  since: isoTimestampSchema,
  until: isoTimestampSchema,
  format: z.enum(["csv", "json"]).default("csv"),
});

export type ActivityFilterInput = z.infer<typeof activityFilterSchema>;
export type ExportActivityInput = z.infer<typeof exportActivitySchema>;
