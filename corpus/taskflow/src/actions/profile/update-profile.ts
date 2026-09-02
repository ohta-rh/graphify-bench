"use server";

/**
 * Updates the signed-in user's own profile.
 *
 * Owner D. The profile is a *user* record rather than a tenant row, so the
 * payload carries no `orgId` and the wrapper falls back to the session's active
 * organization (`requireOrg: false`). There is no permission to check — the
 * only rule is that the payload's `userId` is the caller's own.
 *
 * Must call (do not reimplement): updateProfileSchema, getActor, toActionResult
 */

import { ForbiddenActionError } from "@/actions/_lib/action-errors";
import { withAction } from "@/actions/_lib/with-action";
import { updateProfileSchema, type UpdateProfileInput } from "@/schemas/member";
import { updateUser } from "@/server/repositories/user-repository";
import type { ActionResult } from "@/types/api";
import type { User } from "@/types/member";
import { revalidatePath } from "next/cache";

const run = withAction<typeof updateProfileSchema, User>(
  updateProfileSchema,
  async (raw, actor) => {
    const input = raw as UpdateProfileInput;

    if (input.userId !== actor.userId) {
      throw new ForbiddenActionError("member:update_role");
    }

    // The profile is the one write with no service in front of it: there is no
    // tenant rule, no event and no quota to apply, so the action talks to
    // `UserRepository` directly rather than inventing a pass-through service.
    const user = await updateUser(input.userId, input);
    revalidatePath("/", "layout");
    return user;
  },
  { requireOrg: false, revalidate: ["profile"], cacheProfile: "hours" },
);

export async function updateProfileAction(raw: unknown): Promise<ActionResult<User>> {
  return run(raw);
}
