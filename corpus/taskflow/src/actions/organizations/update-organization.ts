"use server";

/**
 * Updates org profile and settings.
 *
 * Owner D. `settings` is a partial patch — the service merges it over the
 * stored `OrganizationSettings` so a form that only touches `digestHourUtc`
 * cannot silently clear the flag overrides.
 *
 * Must call (do not reimplement): updateOrganizationSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from "@/schemas/organization";
import { updateOrganization } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";

const run = withAction<typeof updateOrganizationSchema, Organization>(
  updateOrganizationSchema,
  async (raw, actor) => {
    const input = raw as UpdateOrganizationInput;

    if (!can(actor, "org:update", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:update");
    }

    const organization = await updateOrganization(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    return organization;
  },
  { revalidate: ["organization"], cacheProfile: "minutes" },
);

export async function updateOrganizationAction(
  raw: unknown,
): Promise<ActionResult<Organization>> {
  return run(raw);
}
