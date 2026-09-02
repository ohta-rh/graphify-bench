import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  idColumn,
  softDeleteColumns,
  tenantColumns,
  timestampColumns,
} from "./_shared";

export const issues = sqliteTable(
  "issues",
  {
    id: idColumn(),
    ...tenantColumns,
    projectId: text("project_id").notNull(),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["backlog", "todo", "in_progress", "in_review", "done", "canceled"],
    })
      .notNull()
      .default("backlog"),
    priority: text("priority", {
      enum: ["none", "low", "medium", "high", "urgent"],
    })
      .notNull()
      .default("none"),
    authorId: text("author_id").notNull(),
    assigneeId: text("assignee_id"),
    parentId: text("parent_id"),
    estimate: integer("estimate"),
    dueAt: text("due_at"),
    startedAt: text("started_at"),
    completedAt: text("completed_at"),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    uniqueIndex("issues_project_number_idx").on(table.projectId, table.number),
    index("issues_org_status_idx").on(table.orgId, table.status),
    index("issues_org_assignee_idx").on(table.orgId, table.assigneeId),
    index("issues_org_archived_idx").on(table.orgId, table.archivedAt),
    index("issues_org_due_idx").on(table.orgId, table.dueAt),
  ],
);

export const labels = sqliteTable(
  "labels",
  {
    id: idColumn(),
    ...tenantColumns,
    name: text("name").notNull(),
    color: text("color").notNull().default("#94a3b8"),
    description: text("description"),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("labels_org_name_idx").on(table.orgId, table.name)],
);

export const issueLabels = sqliteTable(
  "issue_labels",
  {
    ...tenantColumns,
    issueId: text("issue_id").notNull(),
    labelId: text("label_id").notNull(),
  },
  (table) => [
    uniqueIndex("issue_labels_pk").on(table.issueId, table.labelId),
    index("issue_labels_org_idx").on(table.orgId),
  ],
);

export const attachments = sqliteTable(
  "attachments",
  {
    id: idColumn(),
    ...tenantColumns,
    issueId: text("issue_id").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull(),
    ...timestampColumns,
  },
  (table) => [index("attachments_org_issue_idx").on(table.orgId, table.issueId)],
);

export type IssueRow = typeof issues.$inferSelect;
export type NewIssueRow = typeof issues.$inferInsert;
export type LabelRow = typeof labels.$inferSelect;
export type AttachmentRow = typeof attachments.$inferSelect;
