/**
 * Permanently removes rows archived longer ago than the plan's `retentionDays`.
 *
 * Must call (do not reimplement): getPlanLimits, isArchived
 */
import { getPlanLimits } from "@/config/plan-limits";
import { createLogger } from "@/lib/logger";
import { isArchived } from "@/lib/soft-delete";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { toIsoTimestamp } from "@/types/common";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";

const ORG_BATCH = 25;
const PAGE_SIZE = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const logger = createLogger("cleanup-archived-job");

/**
 * The retention sweep. Soft-deleted rows are kept for as long as the plan
 * promises and no longer: the cut-off comes from `retentionDays`, so an
 * enterprise tenant keeps years of history where a free one keeps a month.
 *
 * Only the search documents are actually dropped here — the issue rows stay,
 * because the audit log still points at them — while the audit rows past the
 * window are purged outright.
 */
export async function runCleanupArchivedJob(now: Date): Promise<JobResult> {
  return runJob("cleanup-archived", async (result) => {
    const orgIds = await usageRepo.listOrgIdsForRollup(ORG_BATCH);

    for (const orgId of orgIds) {
      const org = await orgRepo.findOrgById(orgId);
      if (!org) continue;

      const { retentionDays } = getPlanLimits(org.plan);
      const cutoff = toIsoTimestamp(
        new Date(now.getTime() - retentionDays * MS_PER_DAY),
      );

      const archived = await issueRepo.listIssues({
        orgId,
        limit: PAGE_SIZE,
        cursor: null,
        includeArchived: true,
      });

      for (const issue of archived.items) {
        if (!isArchived(issue)) continue;
        if (issue.archivedAt === null || issue.archivedAt > cutoff) continue;

        await searchRepo.deleteSearchDocument(orgId, "issue", issue.id);
        result.processed += 1;
      }

      try {
        const purged = await activityRepo.purgeActivityBefore(orgId, cutoff);
        result.processed += purged;
      } catch (error) {
        result.failed += 1;
        logger.error("activity purge failed", {
          orgId,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}
