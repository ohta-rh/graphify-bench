"use server";

/**
 * Soft-deletes an organization after slug confirmation.
 *
 * Owner D. `confirmSlug` is the "type the name to continue" guard; it is
 * compared against the stored slug rather than trusted, so a stale form cannot
 * delete a renamed organization.
 *
 * Must call (do not reimplement): deleteOrganizationSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  deleteOrganizationSchema,
  type DeleteOrganizationInput,
} from "@/schemas/organization";
import { deleteOrganization } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";
import { revalidatePath } from "next/cache";

const run = withAction<typeof deleteOrganizationSchema, Organization>(
  deleteOrganizationSchema,
  async (raw, actor) => {
    const input = raw as DeleteOrganizationInput;

    if (!can(actor, "org:delete", { kind: "organization", orgId: input.orgId })) {
      throw new ForbiddenActionError("org:delete");
    }

    const organization = await deleteOrganization(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    revalidatePath("/orgs");
    return organization;
  },
  { revalidate: ["organization"], cacheProfile: "minutes" },
);

export async function deleteOrganizationAction(
  raw: unknown,
): Promise<ActionResult<Organization>> {
  return run(raw);
}
