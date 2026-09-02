import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  idColumn,
  softDeleteColumns,
  tenantColumns,
  timestampColumns,
} from "./_shared";

export const projects = sqliteTable(
  "projects",
  {
    id: idColumn(),
    ...tenantColumns,
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    key: text("key").notNull(),
    description: text("description"),
    visibility: text("visibility", { enum: ["private", "org", "public"] })
      .notNull()
      .default("org"),
    status: text("status", { enum: ["active", "paused", "completed"] })
      .notNull()
      .default("active"),
    leadId: text("lead_id"),
    color: text("color").notNull().default("#6366f1"),
    startsAt: text("starts_at"),
    targetDate: text("target_date"),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    uniqueIndex("projects_org_slug_idx").on(table.orgId, table.slug),
    uniqueIndex("projects_org_key_idx").on(table.orgId, table.key),
    index("projects_org_archived_idx").on(table.orgId, table.archivedAt),
  ],
);

export const projectMembers = sqliteTable(
  "project_members",
  {
    ...tenantColumns,
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    addedAt: text("added_at").notNull(),
  },
  (table) => [
    uniqueIndex("project_members_pk").on(table.projectId, table.userId),
    index("project_members_org_idx").on(table.orgId),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type ProjectMemberRow = typeof projectMembers.$inferSelect;
