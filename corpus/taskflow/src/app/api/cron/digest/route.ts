/**
 * Cron-style trigger for the digest job.
 *
 * Owner D. The route is a trigger, not the job: `runDigestEmailJob` decides
 * which organizations are due based on their `digestHourUtc`, so calling this
 * every hour is correct and calling it twice in one hour is harmless.
 *
 * Must call (do not reimplement): runDigestEmailJob
 */

import { assertCronSecret, errorResponse } from "@/app/api/_lib/responses";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertCronSecret(request);

    const result = await runDigestEmailJob(new Date());
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
