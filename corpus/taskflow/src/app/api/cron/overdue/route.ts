/**
 * Cron-style trigger for the overdue scan.
 *
 * Owner D. The job emits `issue.overdue`; the notification fan-out is a
 * subscriber, so this route never sends anything itself.
 *
 * Must call (do not reimplement): runOverdueIssueJob
 */

import { assertCronSecret, errorResponse } from "@/app/api/_lib/responses";
import { runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertCronSecret(request);

    const result = await runOverdueIssueJob(new Date());
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
