import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { idColumn, tenantColumns, timestampColumns } from "./_shared";

const NOTIFICATION_KINDS = [
  "issue_assigned",
  "issue_status_changed",
  "issue_due_soon",
  "issue_overdue",
  "comment_created",
  "comment_mention",
  "member_invited",
  "member_joined",
  "project_archived",
  "plan_limit_reached",
  "digest_ready",
] as const;

export const notifications = sqliteTable(
  "notifications",
  {
    id: idColumn(),
    ...tenantColumns,
    recipientId: text("recipient_id").notNull(),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    href: text("href").notNull(),
    actorId: text("actor_id"),
    readAt: text("read_at"),
    /** JSON array of `NotificationChannel`. */
    channels: text("channels").notNull().default('["in_app"]'),
    ...timestampColumns,
  },
  (table) => [
    index("notifications_org_recipient_idx").on(table.orgId, table.recipientId),
    index("notifications_org_read_idx").on(table.orgId, table.readAt),
  ],
);

export const notificationPreferences = sqliteTable(
  "notification_preferences",
  {
    ...tenantColumns,
    userId: text("user_id").notNull(),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    inApp: integer("in_app", { mode: "boolean" }).notNull().default(true),
    email: integer("email", { mode: "boolean" }).notNull().default(true),
    digestOnly: integer("digest_only", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("notification_preferences_pk").on(
      table.orgId,
      table.userId,
      table.kind,
    ),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationPreferenceRow =
  typeof notificationPreferences.$inferSelect;
