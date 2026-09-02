"use server";

/**
 * Changes a member's role, keeping at least one owner.
 *
 * Owner D. Two guards that are easy to get wrong: nobody may grant a role above
 * their own (`hasRoleAtLeast`), and the last owner may not be demoted —
 * `MemberService.assertLastOwnerRetained` owns that second rule because it
 * needs to count owners.
 *
 * Must call (do not reimplement): updateMemberRoleSchema, can, hasRoleAtLeast,
 * getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { CACHE_PROFILES, orgTag, revalidateTagged } from "@/lib/cache";
import { can } from "@/lib/permissions";
import {
  updateMemberRoleSchema,
  type UpdateMemberRoleInput,
} from "@/schemas/member";
import {
  assertLastOwnerRetained,
  updateMemberRole,
} from "@/server/services/member-service";
import type { ActionResult } from "@/types/api";
import { hasRoleAtLeast, type Member } from "@/types/member";

const run = withAction<typeof updateMemberRoleSchema, Member>(
  updateMemberRoleSchema,
  async (raw, actor) => {
    const input = raw as UpdateMemberRoleInput;

    const allowed = can(actor, "member:update_role", {
      kind: "member",
      orgId: input.orgId,
      memberId: input.memberId,
      targetUserId: actor.userId,
      targetRole: input.role,
    });
    if (!allowed) {
      throw new ForbiddenActionError("member:update_role");
    }

    // Privilege escalation guard: an admin cannot mint an owner.
    if (!hasRoleAtLeast(actor.role, input.role)) {
      throw new ForbiddenActionError("member:update_role");
    }

    await assertLastOwnerRetained(input.orgId, input.memberId, input.role);

    const member = await updateMemberRole(actor, input);
    revalidateTagged([orgTag(input.orgId)], CACHE_PROFILES.minutes);
    return member;
  },
  { revalidate: ["members"], cacheProfile: "minutes" },
);

export async function updateMemberRoleAction(raw: unknown): Promise<ActionResult<Member>> {
  return run(raw);
}
