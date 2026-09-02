/**
 * Permanently removes rows archived longer ago than the plan's `retentionDays`.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): getPlanLimits, isArchived
 */
import type { JobResult } from "@/server/jobs/types";
export async function runCleanupArchivedJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/cleanup-archived-job.ts");
}
