"use server";

/**
 * Cancels at period end or immediately.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): cancelSubscriptionSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";
import type { Subscription } from "@/types/billing";

export async function cancelSubscriptionAction(raw: unknown): Promise<ActionResult<Subscription>> {
  throw new Error("stub: src/actions/billing/cancel-subscription.ts");
}
