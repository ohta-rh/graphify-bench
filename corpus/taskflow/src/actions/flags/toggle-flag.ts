"use server";

/**
 * Toggles an org-level feature flag override.
 *
 * Owner D. An override can only *turn on* a flag whose definition is
 * `overridable`; `isEnabled()` is consulted first so that toggling a flag which
 * is already on for structural reasons (plan or rollout percentage) is a no-op
 * rather than a confusing write.
 *
 * Must call (do not reimplement): toggleFeatureFlagSchema, can, isEnabled,
 * getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import {
  toggleFeatureFlagSchema,
  type ToggleFeatureFlagInput,
} from "@/schemas/feature-flag";
import {
  buildFlagContext,
  toggleFlag,
} from "@/server/services/feature-flag-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

const run = withAction<typeof toggleFeatureFlagSchema, Organization>(
  toggleFeatureFlagSchema,
  async (raw, actor) => {
    const input = raw as ToggleFeatureFlagInput;

    if (!can(actor, "org:manage_flags", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:manage_flags");
    }

    const { organization } = await getOrganizationSummary(actor, input.orgId);
    const context = buildFlagContext(actor, organization);
    if (isEnabled(input.flag, context) === input.enabled) {
      return organization;
    }

    const updated = await toggleFlag(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    return updated;
  },
  { revalidate: ["flags"], cacheProfile: "minutes" },
);

export async function toggleFeatureFlagAction(
  raw: unknown,
): Promise<ActionResult<Organization>> {
  return run(raw);
}
