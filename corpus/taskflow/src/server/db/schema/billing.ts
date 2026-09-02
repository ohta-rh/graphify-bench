import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, tenantColumns, timestampColumns } from "./_shared";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: idColumn(),
    ...tenantColumns,
    plan: text("plan", { enum: ["free", "starter", "growth", "enterprise"] })
      .notNull()
      .default("free"),
    interval: text("interval", { enum: ["monthly", "annual"] })
      .notNull()
      .default("monthly"),
    status: text("status", {
      enum: ["trialing", "active", "past_due", "canceled"],
    })
      .notNull()
      .default("trialing"),
    seats: integer("seats").notNull().default(1),
    currentPeriodStart: text("current_period_start").notNull(),
    currentPeriodEnd: text("current_period_end").notNull(),
    cancelAt: text("cancel_at"),
    ...timestampColumns,
  },
  (table) => [index("subscriptions_org_idx").on(table.orgId)],
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: idColumn(),
    ...tenantColumns,
    number: text("number").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    paidAt: text("paid_at"),
    ...timestampColumns,
  },
  (table) => [index("invoices_org_period_idx").on(table.orgId, table.periodStart)],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type InvoiceRow = typeof invoices.$inferSelect;
