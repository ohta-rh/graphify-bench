"use server";

/**
 * Changes plan; refuses a downgrade that would breach a current quota.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): changePlanSchema, can, getPlanLimits, wouldExceedLimit, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Subscription } from "@/types/billing";

export async function changePlanAction(raw: unknown): Promise<ActionResult<Subscription>> {
  throw new Error("stub: src/actions/billing/change-plan.ts");
}
