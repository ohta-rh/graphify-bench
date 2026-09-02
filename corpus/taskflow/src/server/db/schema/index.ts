/**
 * The Drizzle schema barrel. `drizzle.config.ts` points at this file and
 * `src/server/db/client.ts` passes it to `drizzle()` as the schema object, so
 * every table must be re-exported here to exist in migrations.
 */
export * from "./_shared";
export * from "./users";
export * from "./organizations";
export * from "./members";
export * from "./projects";
export * from "./issues";
export * from "./comments";
export * from "./notifications";
export * from "./activity";
export * from "./billing";
export * from "./webhooks";
