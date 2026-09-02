"use server";

/**
 * Marks the whole inbox read.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): markAllNotificationsReadSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";

export async function markAllNotificationsReadAction(raw: unknown): Promise<ActionResult<number>> {
  throw new Error("stub: src/actions/notifications/mark-all-read.ts");
}
