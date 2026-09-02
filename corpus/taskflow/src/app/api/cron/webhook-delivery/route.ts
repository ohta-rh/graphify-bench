/**
 * Cron-style trigger that drains the webhook queue.
 *
 * Owner D. Deliveries are queued by a subscriber to
 * `webhook.delivery_requested` and retried here with the backoff the job
 * computes, so a customer's endpoint being down never blocks a mutation.
 *
 * Must call (do not reimplement): runWebhookDeliveryJob
 */

import { assertCronSecret, errorResponse } from "@/app/api/_lib/responses";
import { runWebhookDeliveryJob } from "@/server/jobs/webhook-delivery-job";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    assertCronSecret(request);

    const result = await runWebhookDeliveryJob(new Date());
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
