import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { idColumn, tenantColumns, timestampColumns } from "./_shared";

export const webhookEndpoints = sqliteTable(
  "webhook_endpoints",
  {
    id: idColumn(),
    ...tenantColumns,
    url: text("url").notNull(),
    secret: text("secret").notNull(),
    /** JSON array of `TaskflowEventType`. */
    eventTypes: text("event_types").notNull().default("[]"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    ...timestampColumns,
  },
  (table) => [index("webhook_endpoints_org_idx").on(table.orgId)],
);

export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: idColumn(),
    ...tenantColumns,
    endpointId: text("endpoint_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: text("payload").notNull(),
    status: text("status", { enum: ["pending", "delivered", "failed"] })
      .notNull()
      .default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    deliveredAt: text("delivered_at"),
    ...timestampColumns,
  },
  (table) => [
    index("webhook_deliveries_org_status_idx").on(table.orgId, table.status),
  ],
);

/** Token-bucket state for `src/lib/rate-limit.ts`, persisted per org+key. */
export const rateLimitBuckets = sqliteTable(
  "rate_limit_buckets",
  {
    id: idColumn(),
    ...tenantColumns,
    bucketKey: text("bucket_key").notNull(),
    tokens: integer("tokens").notNull(),
    refilledAt: text("refilled_at").notNull(),
  },
  (table) => [index("rate_limit_org_key_idx").on(table.orgId, table.bucketKey)],
);

/** Denormalised full-text index maintained by `SearchService`. */
export const searchIndex = sqliteTable(
  "search_index",
  {
    id: idColumn(),
    ...tenantColumns,
    subjectKind: text("subject_kind", {
      enum: ["issue", "comment", "project"],
    }).notNull(),
    subjectId: text("subject_id").notNull(),
    projectId: text("project_id"),
    content: text("content").notNull(),
    indexedAt: text("indexed_at").notNull(),
  },
  (table) => [
    index("search_index_org_kind_idx").on(table.orgId, table.subjectKind),
  ],
);

export type WebhookEndpointRow = typeof webhookEndpoints.$inferSelect;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type SearchIndexRow = typeof searchIndex.$inferSelect;
