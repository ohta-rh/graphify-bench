"use server";

/**
 * Accepts an invitation token and creates the membership.
 *
 * Owner D. Runs for a signed-in user who is *not yet* a member of the target
 * org, so there is no `Actor` to resolve and the action cannot use
 * `withAction()`. The seat quota is re-checked at acceptance time because the
 * organization may have filled up since the invitation was sent.
 *
 * Must call (do not reimplement): acceptInvitationTokenSchema, getPlanLimits
 */

import { PlanLimitError, UnauthorizedActionError } from "@/actions/_lib/action-errors";
import { getPlanLimits } from "@/config/plan-limits";
import { toActionResult } from "@/lib/errors";
import { getSessionPrincipal } from "@/lib/session";
import { acceptInvitationTokenSchema } from "@/schemas/invitation";
import { acceptInvitation } from "@/server/services/invitation-service";
import { resolveActor } from "@/server/services/member-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

export async function acceptInvitationAction(raw: unknown): Promise<ActionResult<Member>> {
  const parsed = acceptInvitationTokenSchema.safeParse(raw);
  if (!parsed.success) {
    return toActionResult(parsed.error);
  }

  try {
    const principal = await getSessionPrincipal();
    if (principal === null) {
      throw new UnauthorizedActionError("Sign in before accepting an invitation.");
    }

    const member = await acceptInvitation(principal.userId, parsed.data);
    await assertSeatAvailable(member);

    return { ok: true, data: member, submittedAt: new Date().toISOString() };
  } catch (error) {
    return toActionResult(error);
  }
}

/**
 * Confirms the newly created membership still fits the plan. Reading usage
 * requires an actor inside the org, which only exists once the membership row
 * has been written — hence the check runs after `acceptInvitation`.
 */
async function assertSeatAvailable(member: Member): Promise<void> {
  const actor = await resolveActor(member.userId, member.orgId);
  if (actor === null) {
    throw new UnauthorizedActionError("That invitation is no longer valid.");
  }

  const summary = await getOrganizationSummary(actor, member.orgId);
  const limits = getPlanLimits(summary.organization.plan);
  if (summary.usage.seatsUsed > limits.seats) {
    throw new PlanLimitError("seats", limits.seats, summary.usage.seatsUsed);
  }
}
