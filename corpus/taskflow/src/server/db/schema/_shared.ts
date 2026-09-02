import { text } from "drizzle-orm/sqlite-core";

/**
 * Column fragments every Taskflow table reuses.
 *
 * Conventions enforced here:
 *  - ids are ULID text primary keys
 *  - timestamps are ISO-8601 text, not unix integers
 *  - every tenant-scoped table carries `org_id`
 *  - every soft-deletable table carries `archived_at`
 */

export const nowIso = () => new Date().toISOString();

export const idColumn = (name = "id") => text(name).primaryKey();

export const timestampColumns = {
  createdAt: text("created_at").notNull().$defaultFn(nowIso),
  updatedAt: text("updated_at").notNull().$defaultFn(nowIso),
};

/** Spread into every table that belongs to exactly one organization. */
export const tenantColumns = {
  orgId: text("org_id").notNull(),
};

/** Spread into every table that is archived rather than deleted. */
export const softDeleteColumns = {
  archivedAt: text("archived_at"),
};
