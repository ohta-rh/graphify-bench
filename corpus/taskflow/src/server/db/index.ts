/**
 * Data-layer entry point. Repositories import `{ getDb }` and the table
 * objects from here so the concrete client module stays swappable.
 */
export { getDb, useInMemoryDb } from "./client";
export type { Db, DbSchema } from "./client";
export * from "./schema";
