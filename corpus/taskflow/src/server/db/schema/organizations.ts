import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { idColumn, softDeleteColumns, timestampColumns } from "./_shared";

export const organizations = sqliteTable(
  "organizations",
  {
    id: idColumn(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    ownerId: text("owner_id").notNull(),
    plan: text("plan", {
      enum: ["free", "starter", "growth", "enterprise"],
    })
      .notNull()
      .default("free"),
    logoUrl: text("logo_url"),
    trialEndsAt: text("trial_ends_at"),
    defaultIssueStatus: text("default_issue_status").notNull().default("backlog"),
    allowPublicProjects: integer("allow_public_projects", { mode: "boolean" })
      .notNull()
      .default(false),
    requireTwoFactor: integer("require_two_factor", { mode: "boolean" })
      .notNull()
      .default(false),
    digestHourUtc: integer("digest_hour_utc").notNull().default(7),
    enabledFlagOverrides: text("enabled_flag_overrides").notNull().default("[]"),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    uniqueIndex("organizations_slug_idx").on(table.slug),
    index("organizations_owner_idx").on(table.ownerId),
  ],
);

export const organizationUsage = sqliteTable("organization_usage", {
  orgId: text("org_id").primaryKey(),
  seatsUsed: integer("seats_used").notNull().default(0),
  projectsUsed: integer("projects_used").notNull().default(0),
  issuesUsed: integer("issues_used").notNull().default(0),
  storageMbUsed: integer("storage_mb_used").notNull().default(0),
  measuredAt: text("measured_at").notNull(),
});

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
export type OrganizationUsageRow = typeof organizationUsage.$inferSelect;
