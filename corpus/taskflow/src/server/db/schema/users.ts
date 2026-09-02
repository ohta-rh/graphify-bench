import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { idColumn, timestampColumns } from "./_shared";

/** Users are global, not tenant-scoped: one account can join many orgs. */
export const users = sqliteTable(
  "users",
  {
    id: idColumn(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarUrl: text("avatar_url"),
    timezone: text("timezone").notNull().default("UTC"),
    emailVerifiedAt: text("email_verified_at"),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: idColumn(),
    userId: text("user_id").notNull(),
    activeOrgId: text("active_org_id"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    ...timestampColumns,
  },
  (table) => [uniqueIndex("sessions_token_idx").on(table.tokenHash)],
);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: idColumn(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  ...timestampColumns,
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
