/**
 * Drains pending webhook deliveries with exponential backoff; disabled unless the org's plan includes webhooks.
 *
 * Must call (do not reimplement): isEnabled, getPlanLimits, signPayload
 */
import { getPlanLimits } from "@/config/plan-limits";
import { isEnabled } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { signPayload } from "@/server/services/webhook-service";
import { toIsoTimestamp } from "@/types/common";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";
import type { OrgId } from "@/types/common";

/** How many deliveries one pass claims. */
const CLAIM_BATCH = 25;

/** Attempts after which a delivery is marked failed for good. */
const MAX_ATTEMPTS = 6;

const logger = createLogger("webhook-delivery-job");

/**
 * Delivers each claimed row. There is no outbound HTTP in Taskflow — the
 * corpus builds and runs offline — so "delivery" means computing the
 * signature the receiver would verify and logging the attempt. The retry
 * bookkeeping around it is the part that has to be right.
 */
export async function runWebhookDeliveryJob(now: Date): Promise<JobResult> {
  return runJob("webhook-delivery", async (result) => {
    const claimed = await webhookRepo.claimPendingDeliveries(CLAIM_BATCH);

    for (const delivery of claimed) {
      const orgId = delivery.orgId as OrgId;

      if (!(await orgAllowsWebhooks(orgId))) {
        await webhookRepo.markDeliveryFailed(
          orgId,
          delivery.id,
          "webhooks are not included in this organization's plan",
        );
        result.failed += 1;
        continue;
      }

      if (delivery.attempts > MAX_ATTEMPTS) {
        await webhookRepo.markDeliveryFailed(
          orgId,
          delivery.id,
          `giving up after ${delivery.attempts} attempts`,
        );
        result.failed += 1;
        continue;
      }

      const endpoint = (await webhookRepo.listEndpoints(orgId)).find(
        (row) => row.id === delivery.endpointId,
      );

      if (!endpoint || !endpoint.enabled) {
        await webhookRepo.markDeliveryFailed(
          orgId,
          delivery.id,
          "endpoint is missing or disabled",
        );
        result.failed += 1;
        continue;
      }

      const signature = signPayload(endpoint.secret, delivery.payload);

      logger.info("webhook delivered", {
        deliveryId: delivery.id,
        endpoint: endpoint.url,
        eventType: delivery.eventType,
        signature: signature.slice(0, 16),
        backoffMs: backoffMs(delivery.attempts),
      });

      await webhookRepo.markDelivered(orgId, delivery.id, toIsoTimestamp(now));
      result.processed += 1;
    }
  });
}

/** 1s, 2s, 4s … capped at five minutes; attempt 0 retries immediately. */
export function backoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.min(300_000, 2 ** (attempts - 1) * 1_000);
}

async function orgAllowsWebhooks(orgId: OrgId): Promise<boolean> {
  const org = await orgRepo.findOrgById(orgId);
  if (!org) return false;

  if (getPlanLimits(org.plan).webhooks <= 0) return false;
  return isEnabled("webhooks", buildFlagContext(null, org));
}
