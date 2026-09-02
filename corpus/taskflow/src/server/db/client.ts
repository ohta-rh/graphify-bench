import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * The single Drizzle connection for the process.
 *
 * Repositories import `db` from `@/server/db` (the barrel), never this module
 * directly, so the connection can be swapped in tests. Never construct a
 * second `Database` — SQLite in WAL mode tolerates it, but the in-process
 * event bus assumes one writer.
 */

const DEFAULT_DB_PATH = "./data/taskflow.db";

let instance: ReturnType<typeof createClient> | null = null;

function createClient(path: string) {
  const absolute = resolve(process.cwd(), path);
  mkdirSync(dirname(absolute), { recursive: true });
  const sqlite = new Database(absolute);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export function getDb(path: string = process.env.TASKFLOW_DB_PATH ?? DEFAULT_DB_PATH) {
  instance ??= createClient(path);
  return instance;
}

/** Test hook: point the singleton at an in-memory database. */
export function useInMemoryDb(): void {
  instance = createClient(":memory:");
}

export type Db = ReturnType<typeof getDb>;
export type DbSchema = typeof schema;
