"use server";

/**
 * Updates the signed-in user's own profile.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateProfileSchema, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { User } from "@/types/member";

export async function updateProfileAction(raw: unknown): Promise<ActionResult<User>> {
  throw new Error("stub: src/actions/profile/update-profile.ts");
}
