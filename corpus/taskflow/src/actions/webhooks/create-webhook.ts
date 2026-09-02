"use server";

/**
 * Registers a webhook endpoint; plan and flag gated.
 *
 * STUB — owner D. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): createWebhookSchema, can, isEnabled, getPlanLimits, getActor, toActionResult
 */

import type { WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { ActionResult } from "@/types/api";

export async function createWebhookAction(raw: unknown): Promise<ActionResult<WebhookEndpointRow>> {
  throw new Error("stub: src/actions/webhooks/create-webhook.ts");
}
