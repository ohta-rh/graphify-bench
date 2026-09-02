"use server";

/**
 * Invites one member; enforces the seat quota and the invite rate limit.
 *
 * Owner D. Pending invitations count against `seats` — otherwise an org on the
 * free plan could queue fifty invitations and blow past three seats the moment
 * they are accepted.
 *
 * Must call (do not reimplement): inviteMemberSchema, can, getPlanLimits,
 * consumeRateLimit, getActor, toActionResult
 */

import {
  ForbiddenActionError,
  PlanLimitError,
  RateLimitedError,
} from "@/actions/_lib/action-errors";
import { PENDING_MEMBER_ID } from "@/actions/_lib/permission-resources";
import { withAction } from "@/actions/_lib/with-action";
import { getPlanLimits } from "@/config/plan-limits";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { inviteMemberSchema, type InviteMemberInput } from "@/schemas/member";
import { inviteMember } from "@/server/services/invitation-service";
import { getOrganizationSummary } from "@/server/services/organization-service";
import type { ActionResult } from "@/types/api";
import type { Invitation } from "@/types/member";

const INVITE_BUCKET = "member:invite";

const run = withAction<typeof inviteMemberSchema, Invitation>(
  inviteMemberSchema,
  async (raw, actor) => {
    const input = raw as InviteMemberInput;

    const allowed = can(actor, "member:invite", {
      kind: "member",
      orgId: input.orgId,
      memberId: PENDING_MEMBER_ID,
      targetUserId: actor.userId,
      targetRole: input.role,
    });
    if (!allowed) {
      throw new ForbiddenActionError("member:invite");
    }

    const verdict = await consumeRateLimit(input.orgId, INVITE_BUCKET);
    if (!verdict.allowed) {
      throw new RateLimitedError(INVITE_BUCKET, verdict.resetAt);
    }

    const summary = await getOrganizationSummary(actor, input.orgId);
    const limits = getPlanLimits(summary.organization.plan);
    if (summary.usage.seatsUsed + 1 > limits.seats) {
      throw new PlanLimitError("seats", limits.seats, summary.usage.seatsUsed);
    }

    const invitation = await inviteMember(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    return invitation;
  },
  { revalidate: ["members", "invitations"], cacheProfile: "minutes" },
);

export async function inviteMemberAction(raw: unknown): Promise<ActionResult<Invitation>> {
  return run(raw);
}
