"use server";

/**
 * Updates one notification preference row.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateNotificationPreferenceSchema, isEnabled, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { NotificationPreference } from "@/types/notification";

export async function updateNotificationPreferenceAction(raw: unknown): Promise<ActionResult<NotificationPreference>> {
  throw new Error("stub: src/actions/notifications/update-preferences.ts");
}
