"use server";

/**
 * Updates one notification preference row.
 *
 * Owner D. `digestOnly` is only meaningful while the `digest_email` flag is on
 * for the organization; asking for it otherwise would strand the notification
 * in a digest that never gets sent, so the flag is checked here.
 *
 * Must call (do not reimplement): updateNotificationPreferenceSchema,
 * isEnabled, getActor, toActionResult
 */

import { FeatureUnavailableError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, revalidateTagged } from "@/lib/cache";
import { isEnabled } from "@/lib/feature-flags";
import {
  updateNotificationPreferenceSchema,
  type UpdateNotificationPreferenceInput,
} from "@/schemas/notification";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { updatePreference } from "@/server/services/notification-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { NotificationPreference } from "@/types/notification";

const run = withAction<
  typeof updateNotificationPreferenceSchema,
  NotificationPreference
>(
  updateNotificationPreferenceSchema,
  async (raw, actor) => {
    const input = raw as UpdateNotificationPreferenceInput;

    const { organization } = await getOrganizationSummary(actor, input.orgId);
    const context = buildFlagContext(actor, organization);

    if (input.digestOnly && !isEnabled("digest_email", context)) {
      throw new FeatureUnavailableError("digest_email");
    }

    const preference = await updatePreference(actor, input);
    revalidateTagged(["notification-preferences"], CACHE_PROFILES.hours);
    return preference;
  },
  { revalidate: ["notification-preferences"], cacheProfile: "hours" },
);

export async function updateNotificationPreferenceAction(
  raw: unknown,
): Promise<ActionResult<NotificationPreference>> {
  return run(raw);
}
