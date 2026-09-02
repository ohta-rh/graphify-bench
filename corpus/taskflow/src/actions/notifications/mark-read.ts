"use server";

/**
 * Marks one notification read.
 *
 * Owner D. `notification:read` is granted to every role, but the resource
 * carries `recipientId` — the ownership escalation inside `can()` is what stops
 * one member marking another member's inbox.
 *
 * Must call (do not reimplement): markNotificationReadSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  markNotificationReadSchema,
  type MarkNotificationReadInput,
} from "@/schemas/notification";
import { markRead } from "@/server/services/notification-service";
import type { ActionResult } from "@/types/api";
import type { Notification } from "@/types/notification";

const run = withAction<typeof markNotificationReadSchema, Notification>(
  markNotificationReadSchema,
  async (raw, actor) => {
    const input = raw as MarkNotificationReadInput;

    const allowed = can(actor, "notification:read", {
      kind: "notification",
      orgId: input.orgId,
      recipientId: actor.userId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("notification:read");
    }

    const notification = await markRead(actor, input);
    revalidateTagged(["notifications"], CACHE_PROFILES.seconds);
    return notification;
  },
  { revalidate: ["notifications"], cacheProfile: "seconds" },
);

export async function markNotificationReadAction(
  raw: unknown,
): Promise<ActionResult<Notification>> {
  return run(raw);
}
