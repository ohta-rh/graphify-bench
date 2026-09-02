/**
 * Webhook endpoints and their delivery attempts.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { CreateWebhookInput, UpdateWebhookInput } from "@/schemas/webhook";
import type { WebhookDeliveryRow, WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { IsoTimestamp, OrgId, WebhookId } from "@/types/common";
export async function listEndpoints(orgId: OrgId): Promise<readonly WebhookEndpointRow[]> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function insertEndpoint(input: CreateWebhookInput, secret: string): Promise<WebhookEndpointRow> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function updateEndpoint(input: UpdateWebhookInput): Promise<WebhookEndpointRow> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function deleteEndpoint(orgId: OrgId, webhookId: WebhookId): Promise<void> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function countEndpoints(orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function enqueueDelivery(orgId: OrgId, endpointId: string, eventType: string, payload: string): Promise<WebhookDeliveryRow> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function claimPendingDeliveries(limit: number): Promise<readonly WebhookDeliveryRow[]> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function markDelivered(orgId: OrgId, deliveryId: string, at: IsoTimestamp): Promise<void> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}

export async function markDeliveryFailed(orgId: OrgId, deliveryId: string, error: string): Promise<void> {
  throw new Error("stub: src/server/repositories/webhook-repository.ts");
}
