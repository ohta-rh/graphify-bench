"use server";

/**
 * Adjusts the seat count within the plan's maximum.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): updateSeatsSchema, can, getPlanLimits, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Subscription } from "@/types/billing";

export async function updateSeatsAction(raw: unknown): Promise<ActionResult<Subscription>> {
  throw new Error("stub: src/actions/billing/update-seats.ts");
}
