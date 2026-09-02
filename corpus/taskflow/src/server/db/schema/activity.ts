import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, tenantColumns } from "./_shared";

export const activityEvents = sqliteTable(
  "activity_events",
  {
    id: idColumn(),
    ...tenantColumns,
    action: text("action").notNull(),
    actorId: text("actor_id"),
    subjectKind: text("subject_kind", {
      enum: [
        "organization",
        "project",
        "issue",
        "comment",
        "member",
        "subscription",
        "feature_flag",
      ],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    projectId: text("project_id"),
    summary: text("summary").notNull(),
    /** JSON object of scalar metadata. */
    metadata: text("metadata").notNull().default("{}"),
    occurredAt: text("occurred_at").notNull(),
  },
  (table) => [
    index("activity_org_occurred_idx").on(table.orgId, table.occurredAt),
    index("activity_org_action_idx").on(table.orgId, table.action),
    index("activity_org_subject_idx").on(table.orgId, table.subjectKind, table.subjectId),
  ],
);

export type ActivityEventRow = typeof activityEvents.$inferSelect;
export type NewActivityEventRow = typeof activityEvents.$inferInsert;
