"use server";

/**
 * Registers a webhook endpoint; plan and flag gated.
 *
 * Owner D. Two independent gates: the `webhooks` feature flag (which is itself
 * plan-derived) and the numeric `webhooks` quota. Both are checked because a
 * flag can be force-enabled through an org override while the quota still
 * applies.
 *
 * Must call (do not reimplement): createWebhookSchema, can, isEnabled,
 * getPlanLimits, getActor, toActionResult
 */

import {
  FeatureUnavailableError,
  ForbiddenActionError,
  PlanLimitError,
} from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { getPlanLimits } from "@/config/plan-limits";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { createWebhookSchema, type CreateWebhookInput } from "@/schemas/webhook";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import { createWebhook, listWebhooks } from "@/server/services/webhook-service";
import type { WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { ActionResult } from "@/types/api";

const run = withAction<typeof createWebhookSchema, WebhookEndpointRow>(
  createWebhookSchema,
  async (raw, actor) => {
    const input = raw as CreateWebhookInput;

    const allowed = can(actor, "webhook:manage", {
      kind: "webhook",
      orgId: input.orgId,
      webhookId: null,
    });
    if (!allowed) {
      throw new ForbiddenActionError("webhook:manage");
    }

    const { organization } = await getOrganizationSummary(actor, input.orgId);
    if (!isEnabled("webhooks", buildFlagContext(actor, organization))) {
      throw new FeatureUnavailableError("webhooks");
    }

    const limits = getPlanLimits(organization.plan);
    const existing = await listWebhooks(actor, input.orgId);
    if (existing.length >= limits.webhooks) {
      throw new PlanLimitError("webhooks", limits.webhooks, existing.length);
    }

    const endpoint = await createWebhook(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.hours);
    return endpoint;
  },
  { revalidate: ["webhooks"], cacheProfile: "hours" },
);

export async function createWebhookAction(
  raw: unknown,
): Promise<ActionResult<WebhookEndpointRow>> {
  return run(raw);
}
