/**
 * Drains pending webhook deliveries with exponential backoff; disabled unless the org's plan includes webhooks.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled, getPlanLimits, signPayload
 */
import type { JobResult } from "@/server/jobs/types";
export async function runWebhookDeliveryJob(now: Date): Promise<JobResult> {
  throw new Error("stub: src/server/jobs/webhook-delivery-job.ts");
}

export function backoffMs(attempts: number): number {
  throw new Error("stub: src/server/jobs/webhook-delivery-job.ts");
}
