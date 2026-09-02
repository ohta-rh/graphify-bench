"use server";

/**
 * Removes an endpoint.
 *
 * Owner D. Unlike creation this is not flag-gated — an org that loses the
 * `webhooks` capability on a downgrade must still be able to clean up the
 * endpoints it already has.
 *
 * Must call (do not reimplement): deleteWebhookSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { deleteWebhookSchema, type DeleteWebhookInput } from "@/schemas/webhook";
import { deleteWebhook } from "@/server/services/webhook-service";
import type { ActionResult } from "@/types/api";

const run = withAction<typeof deleteWebhookSchema, null>(
  deleteWebhookSchema,
  async (raw, actor) => {
    const input = raw as DeleteWebhookInput;

    const allowed = can(actor, "webhook:manage", {
      kind: "webhook",
      orgId: input.orgId,
      webhookId: input.webhookId,
    });
    if (!allowed) {
      throw new ForbiddenActionError("webhook:manage");
    }

    await deleteWebhook(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return null;
  },
  { revalidate: ["webhooks"], cacheProfile: "hours" },
);

export async function deleteWebhookAction(raw: unknown): Promise<ActionResult<null>> {
  return run(raw);
}
