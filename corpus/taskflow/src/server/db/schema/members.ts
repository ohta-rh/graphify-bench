import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  idColumn,
  softDeleteColumns,
  tenantColumns,
  timestampColumns,
} from "./_shared";

export const members = sqliteTable(
  "members",
  {
    id: idColumn(),
    ...tenantColumns,
    userId: text("user_id").notNull(),
    role: text("role", { enum: ["owner", "admin", "member", "viewer"] })
      .notNull()
      .default("member"),
    status: text("status", { enum: ["active", "invited", "suspended"] })
      .notNull()
      .default("active"),
    invitedBy: text("invited_by"),
    joinedAt: text("joined_at"),
    lastSeenAt: text("last_seen_at"),
    ...timestampColumns,
    ...softDeleteColumns,
  },
  (table) => [
    uniqueIndex("members_org_user_idx").on(table.orgId, table.userId),
    index("members_org_role_idx").on(table.orgId, table.role),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: idColumn(),
    ...tenantColumns,
    email: text("email").notNull(),
    role: text("role", { enum: ["owner", "admin", "member", "viewer"] })
      .notNull()
      .default("member"),
    invitedBy: text("invited_by").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    acceptedAt: text("accepted_at"),
    revokedAt: text("revoked_at"),
    ...timestampColumns,
  },
  (table) => [
    uniqueIndex("invitations_token_idx").on(table.tokenHash),
    index("invitations_org_email_idx").on(table.orgId, table.email),
  ],
);

export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;
export type InvitationRow = typeof invitations.$inferSelect;
