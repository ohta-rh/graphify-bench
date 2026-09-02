"use server";

/**
 * Adjusts the seat count within the plan's maximum.
 *
 * Owner D. Seats can be lowered freely as long as the remaining seats still
 * cover the members who actually occupy them; raising them is capped by the
 * plan's `seats` limit.
 *
 * Must call (do not reimplement): updateSeatsSchema, can, getPlanLimits,
 * getActor, toActionResult
 */

import { ForbiddenActionError, PlanLimitError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { getPlanLimits } from "@/config/plan-limits";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { updateSeatsSchema, type UpdateSeatsInput } from "@/schemas/billing";
import { updateSeats } from "@/server/services/billing-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Subscription } from "@/types/billing";

const run = withAction<typeof updateSeatsSchema, Subscription>(
  updateSeatsSchema,
  async (raw, actor) => {
    const input = raw as UpdateSeatsInput;

    if (!can(actor, "org:manage_billing", { kind: "billing", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:manage_billing");
    }

    const summary = await getOrganizationSummary(actor, input.orgId);
    const limits = getPlanLimits(summary.organization.plan);

    if (input.seats > limits.seats) {
      throw new PlanLimitError("seats", limits.seats, input.seats);
    }
    if (input.seats < summary.usage.seatsUsed) {
      throw new PlanLimitError("seats", input.seats, summary.usage.seatsUsed);
    }

    const subscription = await updateSeats(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return subscription;
  },
  { revalidate: ["billing"], cacheProfile: "hours" },
);

export async function updateSeatsAction(raw: unknown): Promise<ActionResult<Subscription>> {
  return run(raw);
}
