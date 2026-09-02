/**
 * Downgrades organizations whose trial ended and emits `billing.plan_changed`.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): emit, getPlanLimits
 */
import type { JobResult } from "@/server/jobs/types";
export async function runTrialExpiryJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/trial-expiry-job.ts");
}
