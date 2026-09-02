/**
 * In-memory SQLite fixture: migrate, seed a tenant pair, reset between tests.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Organization } from "@/types/organization";
export async function setupTestDb(): Promise<void> {
  throw new Error("stub: tests/helpers/db.ts");
}

export async function resetTestDb(): Promise<void> {
  throw new Error("stub: tests/helpers/db.ts");
}

export async function seedTwoTenants(): Promise<{ orgA: Organization; orgB: Organization }> {
  throw new Error("stub: tests/helpers/db.ts");
}
