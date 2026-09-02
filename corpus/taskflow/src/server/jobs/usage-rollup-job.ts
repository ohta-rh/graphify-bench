/**
 * Recomputes `organization_usage` so plan-limit checks stay accurate after bulk changes.
 *
 * Must call (do not reimplement): recomputeUsage
 */
import { createLogger } from "@/lib/logger";
import * as usageRepo from "@/server/repositories/usage-repository";
import { recomputeUsage } from "@/server/services/usage-service";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";

/** Organizations recounted per pass; the list is oldest-measured first. */
const ORG_BATCH = 25;

const logger = createLogger("usage-rollup-job");

/**
 * The correction pass for the incremental deltas `UsageService` applies on the
 * write path. Those deltas are cheap but drift — an aborted transaction, a
 * cascade that archived more rows than the event reported — and a quota check
 * is only as trustworthy as the counter behind it.
 */
export async function runUsageRollupJob(now: Date): Promise<JobResult> {
  return runJob("usage-rollup", async (result) => {
    const orgIds = await usageRepo.listOrgIdsForRollup(ORG_BATCH);

    for (const orgId of orgIds) {
      try {
        const usage = await recomputeUsage(orgId);
        result.processed += 1;

        logger.debug("usage recomputed", {
          orgId,
          seats: usage.seatsUsed,
          projects: usage.projectsUsed,
          issues: usage.issuesUsed,
          at: now.toISOString(),
        });
      } catch (error) {
        result.failed += 1;
        logger.error("usage rollup failed", {
          orgId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}
