/**
 * Deterministic development seed: two organizations on different plans, members in all four roles, projects, issues (including archived and overdue) and comments.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): uniqueSlug, getPlanLimits
 */
export async function seedDatabase(databasePath?: string): Promise<SeedSummary> {
  throw new Error("stub: src/server/db/seed.ts");
}

export type SeedSummary = { organizations: number; users: number; projects: number; issues: number; comments: number };
