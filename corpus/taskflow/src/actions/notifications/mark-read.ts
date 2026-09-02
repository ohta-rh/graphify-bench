"use server";

/**
 * Marks one notification read.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): markNotificationReadSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Notification } from "@/types/notification";

export async function markNotificationReadAction(raw: unknown): Promise<ActionResult<Notification>> {
  throw new Error("stub: src/actions/notifications/mark-read.ts");
}
