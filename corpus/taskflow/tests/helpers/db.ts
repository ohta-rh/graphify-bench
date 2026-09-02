/**
 * In-memory SQLite fixture: migrate, seed a tenant pair, reset between tests.
 *
 * Repository and service suites call `setupTestDb()` once, `resetTestDb()` in
 * `beforeEach` and `seedTwoTenants()` when they need two organizations to
 * prove a query is org-scoped. The database is `:memory:`, so nothing here
 * touches the developer's `data/taskflow.db`.
 */
// Aliased on import: the contract calls it `useInMemoryDb`, which the
// react-hooks lint rule would otherwise mistake for a React hook here.
import { getDb, useInMemoryDb as attachInMemoryDb } from "@/server/db";
import { runMigrations } from "@/server/db/migrate";
import { organizations } from "@/server/db/schema/organizations";
import { users } from "@/server/db/schema/users";
import type { Organization } from "@/types/organization";
import { makeOrganization, ORG_A, ORG_B } from "./factories";

let migrated = false;

/** Points the singleton client at an in-memory database and migrates it. */
export async function setupTestDb(): Promise<void> {
  attachInMemoryDb();
  await runMigrations(":memory:");
  migrated = true;
}

/** Truncates every table, keeping the schema — cheaper than re-migrating. */
export async function resetTestDb(): Promise<void> {
  if (!migrated) await setupTestDb();

  const db = getDb();
  const tables = db.$client
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
    )
    .all() as readonly { name: string }[];

  db.$client.pragma("foreign_keys = OFF");
  for (const table of tables) {
    db.$client.prepare(`DELETE FROM "${table.name}"`).run();
  }
  db.$client.pragma("foreign_keys = ON");
}

/**
 * Inserts two organizations owned by two different users. Every "does this
 * query filter by orgId?" test seeds through here so the negative case is a
 * real row in a real other tenant, not an absence.
 */
export async function seedTwoTenants(): Promise<{
  orgA: Organization;
  orgB: Organization;
}> {
  const db = getDb();

  const orgA = makeOrganization({ id: ORG_A, name: "Acme", slug: "acme" });
  const orgB = makeOrganization({
    id: ORG_B,
    name: "Globex",
    slug: "globex",
    ownerId: orgA.ownerId,
  });

  await db
    .insert(users)
    .values({
      id: orgA.ownerId,
      email: "owner@example.com",
      name: "Test Owner",
      passwordHash: "scrypt:00:00",
      timezone: "UTC",
      createdAt: orgA.createdAt,
      updatedAt: orgA.updatedAt,
    })
    .onConflictDoNothing();

  for (const org of [orgA, orgB]) {
    await db.insert(organizations).values({
      id: org.id,
      name: org.name,
      slug: org.slug,
      ownerId: org.ownerId,
      plan: org.plan,
      logoUrl: org.logoUrl,
      trialEndsAt: org.trialEndsAt,
      // `OrganizationSettings` is flattened across columns on this table.
      defaultIssueStatus: org.settings.defaultIssueStatus,
      allowPublicProjects: org.settings.allowPublicProjects,
      requireTwoFactor: org.settings.requireTwoFactor,
      digestHourUtc: org.settings.digestHourUtc,
      enabledFlagOverrides: JSON.stringify(org.settings.enabledFlagOverrides),
      archivedAt: org.archivedAt,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    });
  }

  return { orgA, orgB };
}
