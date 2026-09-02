import { z } from "zod";
import { orgIdSchema, projectIdSchema } from "./common";
import { issuePrioritySchema, issueStatusSchema } from "./issue";

/** Query parameters accepted by `/api/export/issues`. Gated on the
 *  `csv_export` feature flag and on `activity:export` for the audit log. */
export const exportIssuesSchema = z.object({
  orgId: orgIdSchema,
  projectId: projectIdSchema.optional(),
  status: z.array(issueStatusSchema).optional(),
  priority: z.array(issuePrioritySchema).optional(),
  includeArchived: z.coerce.boolean().default(false),
  format: z.enum(["csv", "json"]).default("csv"),
});

export const exportColumnSchema = z.enum([
  "key",
  "title",
  "status",
  "priority",
  "assignee",
  "author",
  "dueAt",
  "createdAt",
  "updatedAt",
]);

export const DEFAULT_EXPORT_COLUMNS: readonly z.infer<
  typeof exportColumnSchema
>[] = ["key", "title", "status", "priority", "assignee", "dueAt"];

export type ExportIssuesInput = z.infer<typeof exportIssuesSchema>;
export type ExportColumn = z.infer<typeof exportColumnSchema>;
