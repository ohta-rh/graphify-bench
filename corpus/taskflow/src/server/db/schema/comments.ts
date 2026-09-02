import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  idColumn,
  softDeleteColumns,
  tenantColumns,
  timestampColumns,
} from "./_shared";

export const comments = sqliteTable(
  "comments",
  {
    id: idColumn(),
    ...tenantColumns,
    issueId: text("issue_id").notNull(),
    authorId: text("author_id").notNull(),
    body: text("body").notNull(),
    parentId: text("parent_id"),
    editedAt: text("edited_at"),
    /** JSON array of user ids, kept denormalised for the mention fan-out. */
    mentionedUserIds: text("mentioned_user_ids").notNull().default("[]"),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    index("comments_org_issue_idx").on(table.orgId, table.issueId),
    index("comments_org_archived_idx").on(table.orgId, table.archivedAt),
  ],
);

export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;
