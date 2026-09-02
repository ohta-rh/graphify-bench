"use server";

/**
 * Cancels at period end or immediately.
 *
 * Owner D. Only an owner may cancel — `org:manage_billing` sits at owner level
 * in `ROLE_MATRIX`, so the `can()` call below is the whole guard.
 *
 * Must call (do not reimplement): cancelSubscriptionSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  cancelSubscriptionSchema,
  type CancelSubscriptionInput,
} from "@/schemas/billing";
import { cancelSubscription } from "@/server/services/billing-service";
import type { ActionResult } from "@/types/api";
import type { Subscription } from "@/types/billing";

const run = withAction<typeof cancelSubscriptionSchema, Subscription>(
  cancelSubscriptionSchema,
  async (raw, actor) => {
    const input = raw as CancelSubscriptionInput;

    if (!can(actor, "org:manage_billing", { kind: "billing", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:manage_billing");
    }

    const subscription = await cancelSubscription(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return subscription;
  },
  { revalidate: ["billing"], cacheProfile: "hours" },
);

export async function cancelSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<Subscription>> {
  return run(raw);
}
