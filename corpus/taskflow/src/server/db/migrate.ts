/**
 * Applies the drizzle-kit migrations in ./drizzle to the SQLite file. Run via `pnpm db:migrate`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import Database from "better-sqlite3";

const DEFAULT_DB_PATH = "./data/taskflow.db";
const MIGRATIONS_DIR = "./drizzle";

/**
 * Statements that bring an empty database up to the current schema.
 *
 * `drizzle-kit generate` writes SQL into `./drizzle`, and when that directory
 * exists it is authoritative. It is not checked in — the corpus has to migrate
 * offline from a clean clone — so this is the fallback "push" path, equivalent
 * to `drizzle-kit push` and kept in step with `src/server/db/schema/**`.
 */
const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS users (
     id TEXT PRIMARY KEY NOT NULL,
     email TEXT NOT NULL,
     name TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     avatar_url TEXT,
     timezone TEXT NOT NULL DEFAULT 'UTC',
     email_verified_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     active_org_id TEXT,
     token_hash TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_idx ON sessions (token_hash)`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     id TEXT PRIMARY KEY NOT NULL,
     user_id TEXT NOT NULL,
     token_hash TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     used_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS organizations (
     id TEXT PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     slug TEXT NOT NULL,
     owner_id TEXT NOT NULL,
     plan TEXT NOT NULL DEFAULT 'free',
     logo_url TEXT,
     trial_ends_at TEXT,
     default_issue_status TEXT NOT NULL DEFAULT 'backlog',
     allow_public_projects INTEGER NOT NULL DEFAULT 0,
     require_two_factor INTEGER NOT NULL DEFAULT 0,
     digest_hour_utc INTEGER NOT NULL DEFAULT 7,
     enabled_flag_overrides TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     archived_at TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_idx ON organizations (slug)`,
  `CREATE INDEX IF NOT EXISTS organizations_owner_idx ON organizations (owner_id)`,
  `CREATE TABLE IF NOT EXISTS organization_usage (
     org_id TEXT PRIMARY KEY NOT NULL,
     seats_used INTEGER NOT NULL DEFAULT 0,
     projects_used INTEGER NOT NULL DEFAULT 0,
     issues_used INTEGER NOT NULL DEFAULT 0,
     storage_mb_used INTEGER NOT NULL DEFAULT 0,
     measured_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS members (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'member',
     status TEXT NOT NULL DEFAULT 'active',
     invited_by TEXT,
     joined_at TEXT,
     last_seen_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     archived_at TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS members_org_user_idx ON members (org_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS members_org_role_idx ON members (org_id, role)`,
  `CREATE TABLE IF NOT EXISTS invitations (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     email TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'member',
     invited_by TEXT NOT NULL,
     token_hash TEXT NOT NULL,
     expires_at TEXT NOT NULL,
     accepted_at TEXT,
     revoked_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token_hash)`,
  `CREATE INDEX IF NOT EXISTS invitations_org_email_idx ON invitations (org_id, email)`,
  `CREATE TABLE IF NOT EXISTS projects (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     name TEXT NOT NULL,
     slug TEXT NOT NULL,
     key TEXT NOT NULL,
     description TEXT,
     visibility TEXT NOT NULL DEFAULT 'org',
     status TEXT NOT NULL DEFAULT 'active',
     lead_id TEXT,
     color TEXT NOT NULL DEFAULT '#6366f1',
     starts_at TEXT,
     target_date TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     archived_at TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS projects_org_slug_idx ON projects (org_id, slug)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS projects_org_key_idx ON projects (org_id, key)`,
  `CREATE INDEX IF NOT EXISTS projects_org_archived_idx ON projects (org_id, archived_at)`,
  `CREATE TABLE IF NOT EXISTS project_members (
     org_id TEXT NOT NULL,
     project_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     added_at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS project_members_pk ON project_members (project_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS project_members_org_idx ON project_members (org_id)`,
  `CREATE TABLE IF NOT EXISTS issues (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     project_id TEXT NOT NULL,
     number INTEGER NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     status TEXT NOT NULL DEFAULT 'backlog',
     priority TEXT NOT NULL DEFAULT 'none',
     author_id TEXT NOT NULL,
     assignee_id TEXT,
     parent_id TEXT,
     estimate INTEGER,
     due_at TEXT,
     started_at TEXT,
     completed_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     archived_at TEXT
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS issues_project_number_idx ON issues (project_id, number)`,
  `CREATE INDEX IF NOT EXISTS issues_org_status_idx ON issues (org_id, status)`,
  `CREATE INDEX IF NOT EXISTS issues_org_assignee_idx ON issues (org_id, assignee_id)`,
  `CREATE INDEX IF NOT EXISTS issues_org_archived_idx ON issues (org_id, archived_at)`,
  `CREATE INDEX IF NOT EXISTS issues_org_due_idx ON issues (org_id, due_at)`,
  `CREATE TABLE IF NOT EXISTS labels (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     name TEXT NOT NULL,
     color TEXT NOT NULL DEFAULT '#94a3b8',
     description TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS labels_org_name_idx ON labels (org_id, name)`,
  `CREATE TABLE IF NOT EXISTS issue_labels (
     org_id TEXT NOT NULL,
     issue_id TEXT NOT NULL,
     label_id TEXT NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS issue_labels_pk ON issue_labels (issue_id, label_id)`,
  `CREATE INDEX IF NOT EXISTS issue_labels_org_idx ON issue_labels (org_id)`,
  `CREATE TABLE IF NOT EXISTS attachments (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     issue_id TEXT NOT NULL,
     filename TEXT NOT NULL,
     content_type TEXT NOT NULL,
     size_bytes INTEGER NOT NULL,
     uploaded_by TEXT NOT NULL,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS attachments_org_issue_idx ON attachments (org_id, issue_id)`,
  `CREATE TABLE IF NOT EXISTS comments (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     issue_id TEXT NOT NULL,
     author_id TEXT NOT NULL,
     body TEXT NOT NULL,
     parent_id TEXT,
     edited_at TEXT,
     mentioned_user_ids TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL,
     archived_at TEXT
   )`,
  `CREATE INDEX IF NOT EXISTS comments_org_issue_idx ON comments (org_id, issue_id)`,
  `CREATE INDEX IF NOT EXISTS comments_org_archived_idx ON comments (org_id, archived_at)`,
  `CREATE TABLE IF NOT EXISTS notifications (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     recipient_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT NOT NULL,
     href TEXT NOT NULL,
     actor_id TEXT,
     read_at TEXT,
     channels TEXT NOT NULL DEFAULT '["in_app"]',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS notifications_org_recipient_idx ON notifications (org_id, recipient_id)`,
  `CREATE INDEX IF NOT EXISTS notifications_org_read_idx ON notifications (org_id, read_at)`,
  `CREATE TABLE IF NOT EXISTS notification_preferences (
     org_id TEXT NOT NULL,
     user_id TEXT NOT NULL,
     kind TEXT NOT NULL,
     in_app INTEGER NOT NULL DEFAULT 1,
     email INTEGER NOT NULL DEFAULT 1,
     digest_only INTEGER NOT NULL DEFAULT 0
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_pk ON notification_preferences (org_id, user_id, kind)`,
  `CREATE TABLE IF NOT EXISTS activity_events (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     action TEXT NOT NULL,
     actor_id TEXT,
     subject_kind TEXT NOT NULL,
     subject_id TEXT NOT NULL,
     project_id TEXT,
     summary TEXT NOT NULL,
     metadata TEXT NOT NULL DEFAULT '{}',
     occurred_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS activity_org_occurred_idx ON activity_events (org_id, occurred_at)`,
  `CREATE INDEX IF NOT EXISTS activity_org_action_idx ON activity_events (org_id, action)`,
  `CREATE INDEX IF NOT EXISTS activity_org_subject_idx ON activity_events (org_id, subject_kind, subject_id)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     plan TEXT NOT NULL DEFAULT 'free',
     interval TEXT NOT NULL DEFAULT 'monthly',
     status TEXT NOT NULL DEFAULT 'trialing',
     seats INTEGER NOT NULL DEFAULT 1,
     current_period_start TEXT NOT NULL,
     current_period_end TEXT NOT NULL,
     cancel_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS subscriptions_org_idx ON subscriptions (org_id)`,
  `CREATE TABLE IF NOT EXISTS invoices (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     number TEXT NOT NULL,
     amount_cents INTEGER NOT NULL,
     currency TEXT NOT NULL DEFAULT 'usd',
     period_start TEXT NOT NULL,
     period_end TEXT NOT NULL,
     paid_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS invoices_org_period_idx ON invoices (org_id, period_start)`,
  `CREATE TABLE IF NOT EXISTS webhook_endpoints (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     url TEXT NOT NULL,
     secret TEXT NOT NULL,
     event_types TEXT NOT NULL DEFAULT '[]',
     enabled INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS webhook_endpoints_org_idx ON webhook_endpoints (org_id)`,
  `CREATE TABLE IF NOT EXISTS webhook_deliveries (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     endpoint_id TEXT NOT NULL,
     event_type TEXT NOT NULL,
     payload TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     attempts INTEGER NOT NULL DEFAULT 0,
     last_error TEXT,
     delivered_at TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS webhook_deliveries_org_status_idx ON webhook_deliveries (org_id, status)`,
  `CREATE TABLE IF NOT EXISTS rate_limit_buckets (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     bucket_key TEXT NOT NULL,
     tokens INTEGER NOT NULL,
     refilled_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS rate_limit_org_key_idx ON rate_limit_buckets (org_id, bucket_key)`,
  `CREATE TABLE IF NOT EXISTS search_index (
     id TEXT PRIMARY KEY NOT NULL,
     org_id TEXT NOT NULL,
     subject_kind TEXT NOT NULL,
     subject_id TEXT NOT NULL,
     project_id TEXT,
     content TEXT NOT NULL,
     indexed_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS search_index_org_kind_idx ON search_index (org_id, subject_kind)`,
];

/**
 * Brings `databasePath` up to date. Generated migrations win when they exist;
 * otherwise the embedded schema is pushed. Safe to run repeatedly — every
 * statement is `IF NOT EXISTS`.
 */
export async function runMigrations(
  databasePath: string = process.env.TASKFLOW_DB_PATH ?? DEFAULT_DB_PATH,
): Promise<void> {
  const absolute = resolve(process.cwd(), databasePath);
  mkdirSync(dirname(absolute), { recursive: true });

  const sqlite = new Database(absolute);
  sqlite.pragma("journal_mode = WAL");

  try {
    for (const statement of readMigrationStatements()) {
      sqlite.exec(statement);
    }
  } finally {
    sqlite.close();
  }
}

/** `pnpm db:migrate` runs this file directly; importing it must stay inert. */
if (process.argv[1]?.endsWith("migrate.ts") === true) {
  await runMigrations();
}

function readMigrationStatements(): readonly string[] {
  const dir = resolve(process.cwd(), MIGRATIONS_DIR);
  if (!existsSync(dir)) return SCHEMA_STATEMENTS;

  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (files.length === 0) return SCHEMA_STATEMENTS;

  return files.flatMap((name) =>
    readFileSync(join(dir, name), "utf8")
      .split("--> statement-breakpoint")
      .map((chunk) => chunk.trim())
      .filter(Boolean),
  );
}
