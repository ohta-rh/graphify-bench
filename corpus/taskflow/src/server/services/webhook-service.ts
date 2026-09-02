/**
 * Webhook endpoint management and the bridge from `webhook.delivery_requested` to the delivery queue.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled, wouldExceedLimit
 */
import type { CreateWebhookInput, DeleteWebhookInput, UpdateWebhookInput } from "@/schemas/webhook";
import type { WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { OrgId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Actor } from "@/types/member";
export async function listWebhooks(actor: Actor, orgId: OrgId): Promise<readonly WebhookEndpointRow[]> {
  throw new Error("stub: src/server/services/webhook-service.ts");
}

export async function createWebhook(actor: Actor, input: CreateWebhookInput): Promise<WebhookEndpointRow> {
  throw new Error("stub: src/server/services/webhook-service.ts");
}

export async function updateWebhook(actor: Actor, input: UpdateWebhookInput): Promise<WebhookEndpointRow> {
  throw new Error("stub: src/server/services/webhook-service.ts");
}

export async function deleteWebhook(actor: Actor, input: DeleteWebhookInput): Promise<void> {
  throw new Error("stub: src/server/services/webhook-service.ts");
}

export function signPayload(secret: string, payload: string): string {
  throw new Error("stub: src/server/services/webhook-service.ts");
}

export function registerWebhookListeners(): Unsubscribe {
  throw new Error("stub: src/server/services/webhook-service.ts");
}
