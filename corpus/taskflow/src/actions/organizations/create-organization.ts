"use server";

/**
 * Creates an organization with the caller as owner.
 *
 * Owner D. There is no actor *before* the org exists, so this action resolves
 * the session principal first and only calls `getActor()` afterwards — against
 * the slug of the organization it just created — to confirm the owner
 * membership landed.
 *
 * Must call (do not reimplement): createOrganizationSchema, getActor,
 * toActionResult
 */

import { UnauthorizedActionError } from "@/actions/_lib/action-errors";
import { getActor } from "@/lib/actor";
import { toActionResult } from "@/lib/errors";
import { getSessionPrincipal } from "@/lib/session";
import { createOrganizationSchema } from "@/schemas/organization";
import { createOrganization } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Organization } from "@/types/organization";
import { revalidatePath } from "next/cache";

export async function createOrganizationAction(
  raw: unknown,
): Promise<ActionResult<Organization>> {
  const parsed = createOrganizationSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const principal = await getSessionPrincipal();
    if (principal === null) {
      throw new UnauthorizedActionError();
    }

    const organization = await createOrganization(principal.userId, parsed.data);

    // The owner membership is written by the service; resolving the actor here
    // fails loudly if it was not, rather than leaving an org nobody can open.
    await getActor(organization.slug);

    revalidatePath("/orgs");
    return { ok: true, data: organization, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
