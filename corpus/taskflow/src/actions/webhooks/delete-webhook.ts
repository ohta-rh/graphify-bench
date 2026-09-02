"use server";

/**
 * Removes an endpoint.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): deleteWebhookSchema, can, getActor, toActionResult
 */

import type { ActionResult } from "@/types/api";

export async function deleteWebhookAction(raw: unknown): Promise<ActionResult<null>> {
  throw new Error("stub: src/actions/webhooks/delete-webhook.ts");
}
