/**
 * Webhook endpoints and their delivery attempts.
 */
import { and, asc, count, eq } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, webhookDeliveries, webhookEndpoints } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import type { CreateWebhookInput, UpdateWebhookInput } from "@/schemas/webhook";
import type {
  WebhookDeliveryRow,
  WebhookEndpointRow,
} from "@/server/db/schema/webhooks";
import type { IsoTimestamp, OrgId, WebhookId } from "@/types/common";

export async function listEndpoints(
  orgId: OrgId,
): Promise<readonly WebhookEndpointRow[]> {
  return getDb()
    .select()
    .from(webhookEndpoints)
    .where(orgPredicate(webhookEndpoints.orgId, orgId))
    .orderBy(asc(webhookEndpoints.createdAt))
    .all();
}

export async function insertEndpoint(
  input: CreateWebhookInput,
  secret: string,
): Promise<WebhookEndpointRow> {
  const stamp = toIsoTimestamp(new Date());
  return getDb()
    .insert(webhookEndpoints)
    .values({
      id: newId(),
      orgId: input.orgId,
      url: input.url,
      secret,
      eventTypes: JSON.stringify(input.eventTypes),
      enabled: true,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();
}

export async function updateEndpoint(
  input: UpdateWebhookInput,
): Promise<WebhookEndpointRow> {
  const row = getDb()
    .update(webhookEndpoints)
    .set({
      ...(input.url === undefined ? {} : { url: input.url }),
      ...(input.eventTypes === undefined
        ? {}
        : { eventTypes: JSON.stringify(input.eventTypes) }),
      ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(
      and(
        orgPredicate(webhookEndpoints.orgId, input.orgId),
        eq(webhookEndpoints.id, input.webhookId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Webhook ${input.webhookId} not found`);
  return row;
}

export async function deleteEndpoint(
  orgId: OrgId,
  webhookId: WebhookId,
): Promise<void> {
  const db = getDb();
  db.delete(webhookDeliveries)
    .where(
      and(
        orgPredicate(webhookDeliveries.orgId, orgId),
        eq(webhookDeliveries.endpointId, webhookId),
      ),
    )
    .run();
  db.delete(webhookEndpoints)
    .where(
      and(
        orgPredicate(webhookEndpoints.orgId, orgId),
        eq(webhookEndpoints.id, webhookId),
      ),
    )
    .run();
}

/** The `webhooks` quota compares against this. */
export async function countEndpoints(orgId: OrgId): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(webhookEndpoints)
    .where(orgPredicate(webhookEndpoints.orgId, orgId))
    .get();
  return row?.value ?? 0;
}

export async function enqueueDelivery(
  orgId: OrgId,
  endpointId: string,
  eventType: string,
  payload: string,
): Promise<WebhookDeliveryRow> {
  const stamp = toIsoTimestamp(new Date());
  return getDb()
    .insert(webhookDeliveries)
    .values({
      id: newId(),
      orgId,
      endpointId,
      eventType,
      payload,
      status: "pending",
      attempts: 0,
      lastError: null,
      deliveredAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();
}

/**
 * Claims a batch for the delivery job. Cross-tenant on purpose — the queue is
 * drained by a background worker, not by a request — and the attempt counter
 * is bumped on claim so a crashed worker cannot retry forever.
 */
export async function claimPendingDeliveries(
  limit: number,
): Promise<readonly WebhookDeliveryRow[]> {
  const db = getDb();
  const pending = db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.status, "pending"))
    .orderBy(asc(webhookDeliveries.createdAt))
    .limit(Math.max(1, limit))
    .all();

  return pending.map((row) =>
    db
      .update(webhookDeliveries)
      .set({
        attempts: row.attempts + 1,
        updatedAt: toIsoTimestamp(new Date()),
      })
      .where(eq(webhookDeliveries.id, row.id))
      .returning()
      .get(),
  );
}

export async function markDelivered(
  orgId: OrgId,
  deliveryId: string,
  at: IsoTimestamp,
): Promise<void> {
  getDb()
    .update(webhookDeliveries)
    .set({ status: "delivered", deliveredAt: at, updatedAt: at })
    .where(
      and(
        orgPredicate(webhookDeliveries.orgId, orgId),
        eq(webhookDeliveries.id, deliveryId),
      ),
    )
    .run();
}

export async function markDeliveryFailed(
  orgId: OrgId,
  deliveryId: string,
  error: string,
): Promise<void> {
  getDb()
    .update(webhookDeliveries)
    .set({
      status: "failed",
      lastError: error.slice(0, 500),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(
      and(
        orgPredicate(webhookDeliveries.orgId, orgId),
        eq(webhookDeliveries.id, deliveryId),
      ),
    )
    .run();
}
