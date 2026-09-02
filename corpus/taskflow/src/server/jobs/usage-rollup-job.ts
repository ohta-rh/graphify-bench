/**
 * Recomputes `organization_usage` so plan-limit checks stay accurate after bulk changes.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): recomputeUsage
 */
import type { JobResult } from "@/server/jobs/types";
export async function runUsageRollupJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/usage-rollup-job.ts");
}
