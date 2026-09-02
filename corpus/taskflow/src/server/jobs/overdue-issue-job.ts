/**
 * Scans for issues past `dueAt` and emits `issue.overdue`, which the notification fan-out turns into alerts.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): emit, shouldFilterArchived
 */
import type { JobResult } from "@/server/jobs/types";
export async function runOverdueIssueJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/overdue-issue-job.ts");
}
