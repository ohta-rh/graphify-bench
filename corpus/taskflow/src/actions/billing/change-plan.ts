"use server";

/**
 * Changes plan; refuses a downgrade that would breach a current quota.
 *
 * Owner D. The interesting case is the *downgrade*: the target plan's limits
 * are compared against today's usage before the switch, so an org on growth
 * with 40 seats cannot silently drop to starter and strand 37 people.
 *
 * Must call (do not reimplement): changePlanSchema, can, getPlanLimits,
 * wouldExceedLimit, getActor, toActionResult
 */

import { ForbiddenActionError, PlanLimitError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { getPlanLimits, wouldExceedLimit } from "@/config/plan-limits";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { changePlanSchema, type ChangePlanInput } from "@/schemas/billing";
import { changePlan } from "@/server/services/billing-service";
import { getUsage } from "@/server/services/usage-service";
import type { ActionResult } from "@/types/api";
import type { LimitedResource, Subscription } from "@/types/billing";
import type { Actor } from "@/types/member";

const run = withAction<typeof changePlanSchema, Subscription>(
  changePlanSchema,
  async (raw, actor) => {
    const input = raw as ChangePlanInput;

    if (!can(actor, "org:manage_billing", { kind: "billing", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:manage_billing");
    }

    await assertPlanFitsCurrentUsage(actor, input);

    const subscription = await changePlan(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return subscription;
  },
  { revalidate: ["billing"], cacheProfile: "hours" },
);

/**
 * Compares live usage against the *target* plan. `wouldExceedLimit` is called
 * with a requested delta of zero: we are not consuming anything, only asking
 * whether what is already in use still fits.
 */
async function assertPlanFitsCurrentUsage(
  actor: Actor,
  input: ChangePlanInput,
): Promise<void> {
  const usage = await getUsage(actor, input.orgId);
  const limits = getPlanLimits(input.plan);

  const consumption: ReadonlyArray<readonly [LimitedResource, number]> = [
    ["seats", usage.seatsUsed],
    ["projects", usage.projectsUsed],
    ["storageMb", usage.storageMbUsed],
  ];

  for (const [resource, used] of consumption) {
    if (wouldExceedLimit(input.plan, resource, used, 0)) {
      throw new PlanLimitError(resource, limits[resource], used);
    }
  }
}

export async function changePlanAction(raw: unknown): Promise<ActionResult<Subscription>> {
  return run(raw);
}
