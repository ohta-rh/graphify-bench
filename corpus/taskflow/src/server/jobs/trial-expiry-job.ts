/**
 * Downgrades organizations whose trial ended and emits `billing.plan_changed`.
 *
 * Must call (do not reimplement): emit, getPlanLimits
 */
import { getPlanLimits } from "@/config/plan-limits";
import { emit } from "@/lib/event-bus";
import { createLogger } from "@/lib/logger";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import { toIsoTimestamp } from "@/types/common";
import { runJob } from "./types";
import type { JobResult } from "@/server/jobs/types";
import type { OrgId } from "@/types/common";

/** Where an expired trial lands. */
const FALLBACK_PLAN = "free" as const;

const logger = createLogger("trial-expiry-job");

/**
 * Moves expired trials down to the free plan and announces the change so the
 * audit log and any webhook subscriber see it.
 *
 * A tenant that outgrew the free limits during the trial is left alone and
 * logged instead: silently downgrading them would put their workspace over
 * quota, and every subsequent write would fail with no explanation.
 */
export async function runTrialExpiryJob(now: Date): Promise<JobResult> {
  return runJob("trial-expiry", async (result) => {
    const stamp = toIsoTimestamp(now);
    const expiring = await subscriptionRepo.listTrialsEndingBefore(stamp);
    const freeLimits = getPlanLimits(FALLBACK_PLAN);

    for (const subscription of expiring) {
      const orgId = subscription.orgId as OrgId;
      const usage = await usageRepo.getUsage(orgId);

      if (
        usage.seatsUsed > freeLimits.seats ||
        usage.projectsUsed > freeLimits.projects
      ) {
        result.failed += 1;
        logger.warn("trial expired but tenant is over the free plan", {
          orgId,
          seats: usage.seatsUsed,
          projects: usage.projectsUsed,
        });
        continue;
      }

      await subscriptionRepo.updateSubscriptionPlan(
        orgId,
        FALLBACK_PLAN,
        subscription.interval,
      );

      await emit("billing.plan_changed", {
        orgId,
        actorId: null,
        occurredAt: stamp,
        from: subscription.plan,
        to: FALLBACK_PLAN,
      });

      result.processed += 1;
    }
  });
}
