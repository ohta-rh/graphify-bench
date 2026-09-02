"use server";

/**
 * Switches the session's active organization.
 *
 * Owner D. `assertOrgScope()` is the guard that matters: the target org is only
 * legitimate if the caller already has a membership in it, which is exactly
 * what "the resolved actor's orgId equals the requested orgId" expresses.
 *
 * Must call (do not reimplement): switchOrgSchema, assertOrgScope
 */

import { UnauthorizedActionError } from "@/actions/_lib/action-errors";
import { requireActorFor } from "@/lib/actor";
import { toActionResult } from "@/lib/errors";
import { getSessionPrincipal } from "@/lib/session";
import { assertOrgScope } from "@/lib/tenant";
import { switchOrgSchema } from "@/schemas/session";
import { switchActiveOrg } from "@/server/services/session-service";
import type { ActionResult } from "@/types/api";
import { revalidatePath } from "next/cache";

export async function switchOrgAction(raw: unknown): Promise<ActionResult<null>> {
  const parsed = switchOrgSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const principal = await getSessionPrincipal();
    if (principal === null) {
      throw new UnauthorizedActionError();
    }

    const actor = await requireActorFor(parsed.data.orgId);
    assertOrgScope(actor, parsed.data.orgId);

    await switchActiveOrg(principal, parsed.data);

    revalidatePath("/", "layout");
    return { ok: true, data: null, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}
