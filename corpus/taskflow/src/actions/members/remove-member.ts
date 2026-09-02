"use server";

/**
 * Removes a member (soft delete) and frees the seat.
 *
 * Owner D. The membership row is archived rather than deleted so that issues
 * and comments authored by the person keep resolving their author.
 *
 * Must call (do not reimplement): removeMemberSchema, can, getActor,
 * toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import { removeMemberSchema, type RemoveMemberInput } from "@/schemas/member";
import { removeMember } from "@/server/services/member-service";
import type { ActionResult } from "@/types/api";
import type { Member } from "@/types/member";

const run = withAction<typeof removeMemberSchema, Member>(
  removeMemberSchema,
  async (raw, actor) => {
    const input = raw as RemoveMemberInput;

    const allowed = can(actor, "member:remove", {
      kind: "member",
      orgId: input.orgId,
      memberId: input.memberId,
      targetUserId: actor.userId,
      targetRole: actor.role,
    });
    if (!allowed) {
      throw new ForbiddenActionError("member:remove");
    }

    const member = await removeMember(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    return member;
  },
  { revalidate: ["members"], cacheProfile: "minutes" },
);

export async function removeMemberAction(raw: unknown): Promise<ActionResult<Member>> {
  return run(raw);
}
