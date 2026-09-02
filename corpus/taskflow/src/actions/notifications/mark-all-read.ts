"use server";

/**
 * Marks the whole inbox read.
 *
 * Owner D. Returns the number of rows touched so the bell badge can be updated
 * without a second round trip.
 *
 * Must call (do not reimplement): markAllNotificationsReadSchema, can,
 * getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { markAllNotificationsReadSchema } from "@/schemas/notification";
import { markAllRead } from "@/server/services/notification-service";
import type { ActionResult } from "@/types/api";
import type { OrgId } from "@/types/common";

type MarkAllReadInput = { orgId: OrgId };

const run = withAction<typeof markAllNotificationsReadSchema, number>(
  markAllNotificationsReadSchema,
  async (raw, actor) => {
    const input = raw as MarkAllReadInput;

    const allowed = can(actor, "notification:manage", {
      kind: "notification",
      orgId: input.orgId,
      recipientId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("notification:manage");
    }

    const count = await markAllRead(actor, input.orgId);
    revalidateTagged(["notifications"], CACHE_PROFILES.seconds);
    return count;
  },
  { revalidate: ["notifications"], cacheProfile: "seconds" },
);

export async function markAllNotificationsReadAction(
  raw: unknown,
): Promise<ActionResult<number>> {
  return run(raw);
}
