/**
 * Scans for issues past `dueAt` and emits `issue.overdue`, which the notification fan-out turns into alerts.
 *
 * Must call (do not reimplement): emit, shouldFilterArchived
 */
import { emit } from "@/lib/event-bus";
import { createLogger } from "@/lib/logger";
import { shouldFilterArchived } from "@/lib/soft-delete";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { toIsoTimestamp } from "@/types/common";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";

/** How many organizations one pass sweeps. */
const ORG_BATCH = 50;

/** Archived issues are never overdue — an archived issue has no due date. */
const LIVE_ONLY = {} as const;

const logger = createLogger("overdue-issue-job");

/**
 * Issues already announced this process's lifetime. A later sweep still
 * finds a still-open, still-overdue issue — this is what keeps the job from
 * re-emitting `issue.overdue` for it on every pass.
 */
const reported = new Set<string>();

/** Test-only: clears the reported set so a fresh scenario starts empty. */
export function resetOverdueTracking(): void {
  reported.clear();
}

/**
 * Publishes one `issue.overdue` per still-open, past-due issue. The job owns
 * no notification logic: it announces the fact, and whoever cares (in-app
 * alerts, the digest, webhooks) reacts on the bus.
 */
export async function runOverdueIssueJob(now: Date): Promise<JobResult> {
  return runJob("overdue-issues", async (result) => {
    if (!shouldFilterArchived(LIVE_ONLY)) {
      logger.warn("archive scope misconfigured; skipping sweep", {});
      return;
    }

    const stamp = toIsoTimestamp(now);
    const orgIds = await usageRepo.listOrgIdsForRollup(ORG_BATCH);

    for (const orgId of orgIds) {
      const overdue = await issueRepo.listOverdueIssues(orgId, stamp);

      for (const issue of overdue) {
        if (issue.dueAt === null) continue;
        if (reported.has(issue.id)) continue;

        try {
          await emit("issue.overdue", {
            orgId,
            actorId: null,
            occurredAt: stamp,
            issueId: issue.id,
            projectId: issue.projectId,
            dueAt: issue.dueAt,
            assigneeId: issue.assigneeId,
          });
          reported.add(issue.id);
          result.processed += 1;
        } catch (error) {
          result.failed += 1;
          logger.error("failed to announce overdue issue", {
            issueId: issue.id,
            reason: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  });
}
