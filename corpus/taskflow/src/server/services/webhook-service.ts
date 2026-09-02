/**
 * Webhook endpoint management and the bridge from `webhook.delivery_requested` to the delivery queue.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled, wouldExceedLimit
 */
import { createHmac } from "node:crypto";
import { wouldExceedLimit } from "@/config/plan-limits";
import { subscribe } from "@/lib/event-bus";
import { isEnabled } from "@/lib/feature-flags";
import { randomToken } from "@/lib/hash";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { requireFound, webhookResource } from "./_support";
import type {
  CreateWebhookInput,
  DeleteWebhookInput,
  UpdateWebhookInput,
} from "@/schemas/webhook";
import type { WebhookEndpointRow } from "@/server/db/schema/webhooks";
import type { OrgId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { FlagContext } from "@/types/feature-flag";
import type { Actor } from "@/types/member";

/** Length in bytes of a generated endpoint signing secret. */
const SECRET_BYTES = 32;

export async function listWebhooks(
  actor: Actor,
  orgId: OrgId,
): Promise<readonly WebhookEndpointRow[]> {
  assertOrgScope(actor, orgId);
  assertCan(actor, "webhook:manage", webhookResource(orgId, null));
  return webhookRepo.listEndpoints(orgId);
}

/**
 * Creating an endpoint is gated twice: the `webhooks` flag has to be on for
 * the org's plan, and the plan's endpoint count must have room. A secret is
 * minted here and never regenerated — rotating it means deleting the endpoint.
 */
export async function createWebhook(
  actor: Actor,
  input: CreateWebhookInput,
): Promise<WebhookEndpointRow> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "webhook:manage", webhookResource(input.orgId, null));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  if (!isEnabled("webhooks", flagContextFor(actor, org.plan, org.settings.enabledFlagOverrides))) {
    throw new Error("Outgoing webhooks are not included in this plan");
  }

  const used = await webhookRepo.countEndpoints(input.orgId);
  if (wouldExceedLimit(org.plan, "webhooks", used)) {
    throw new Error(`Plan ${org.plan} allows ${used} webhook endpoints`);
  }

  return webhookRepo.insertEndpoint(input, randomToken(SECRET_BYTES));
}

export async function updateWebhook(
  actor: Actor,
  input: UpdateWebhookInput,
): Promise<WebhookEndpointRow> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "webhook:manage", webhookResource(input.orgId, input.webhookId));
  return webhookRepo.updateEndpoint(input);
}

export async function deleteWebhook(
  actor: Actor,
  input: DeleteWebhookInput,
): Promise<void> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "webhook:manage", webhookResource(input.orgId, input.webhookId));
  await webhookRepo.deleteEndpoint(input.orgId, input.webhookId);
}

/**
 * HMAC-SHA256 over the raw body, hex encoded. The receiving end recomputes
 * this from the same secret — it is the only thing proving the delivery came
 * from Taskflow, so the payload string must be signed byte-for-byte as sent.
 */
export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/**
 * Fans domain events out into the delivery table. Each org's endpoints
 * declare which event types they want, so an endpoint only ever receives what
 * it subscribed to; the job drains the rows afterwards.
 */
export function registerWebhookListeners(): Unsubscribe {
  const offs: Unsubscribe[] = [
    subscribe("webhook.delivery_requested", async (payload) => {
      await enqueueForOrg(
        payload.orgId,
        payload.eventType,
        JSON.stringify(payload.payload),
      );
    }),
    subscribe("issue.created", async (payload) => {
      await enqueueForOrg(payload.orgId, "issue.created", JSON.stringify(payload));
    }),
    subscribe("issue.status_changed", async (payload) => {
      await enqueueForOrg(
        payload.orgId,
        "issue.status_changed",
        JSON.stringify(payload),
      );
    }),
    subscribe("comment.created", async (payload) => {
      await enqueueForOrg(
        payload.orgId,
        "comment.created",
        JSON.stringify(payload),
      );
    }),
    subscribe("billing.plan_changed", async (payload) => {
      await enqueueForOrg(
        payload.orgId,
        "billing.plan_changed",
        JSON.stringify(payload),
      );
    }),
  ];

  return () => {
    for (const off of offs) off();
  };
}

async function enqueueForOrg(
  orgId: OrgId,
  eventType: string,
  payload: string,
): Promise<void> {
  const endpoints = await webhookRepo.listEndpoints(orgId);

  for (const endpoint of endpoints) {
    if (!endpoint.enabled) continue;

    const wanted: readonly string[] = JSON.parse(endpoint.eventTypes) as string[];
    if (!wanted.includes(eventType)) continue;

    await webhookRepo.enqueueDelivery(orgId, endpoint.id, eventType, payload);
  }
}

function flagContextFor(
  actor: Actor,
  plan: FlagContext["plan"],
  overrides: readonly string[],
): FlagContext {
  return {
    orgId: actor.orgId,
    userId: actor.userId,
    plan,
    role: actor.role,
    overrides,
  };
}
