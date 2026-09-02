/**
 * Cron-style trigger for the usage rollup.
 *
 * Owner D. `OrganizationUsage` is a cached aggregate; the quota guards read it
 * rather than counting rows on every check, which is why it needs a periodic
 * recompute to stay honest.
 *
 * Must call (do not reimplement): runUsageRollupJob
 */

import { assertCronSecret, errorResponse } from "@/app/api/_lib/responses";
import { runUsageRollupJob } from "@/server/jobs/usage-rollup-job";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertCronSecret(request);

    const result = await runUsageRollupJob(new Date());
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
