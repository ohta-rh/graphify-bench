/**
 * Rebuilds the search index for one organization; used after a bulk import or an index drift alarm.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): indexIssue, indexComment, indexProject
 */
import type { JobResult } from "@/server/jobs/types";
import type { OrgId } from "@/types/common";
export async function runSearchReindexJob(orgId: OrgId): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/search-reindex-job.ts");
}
