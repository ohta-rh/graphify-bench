/**
 * Sends a signed test payload to one endpoint.
 *
 * Owner D. The point of the route is to prove the *signature* round-trips, so
 * it returns the signature it computed alongside the payload — a customer can
 * verify their own check against a known-good pair without waiting for a real
 * event.
 *
 * Must call (do not reimplement): can, signPayload
 */

import { errorResponse, failure } from "@/app/api/_lib/responses";
import { getActor } from "@/lib/actor";
import { can } from "@/lib/permissions";
import { webhookIdSchema } from "@/schemas/common";
import { listWebhooks, signPayload } from "@/server/services/webhook-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ endpointId: string }> };

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const orgSlug = url.searchParams.get("orgSlug");
    if (orgSlug === null) {
      return failure("validation_failed", "orgSlug is required.");
    }

    // Next.js 16: route `params` is a Promise and MUST be awaited.
    const { endpointId } = await context.params;
    const parsedId = webhookIdSchema.safeParse(endpointId);
    if (!parsedId.success) {
      return failure("validation_failed", "Malformed endpoint id.");
    }

    const actor = await getActor(orgSlug);

    const allowed = can(actor, "webhook:manage", {
      kind: "webhook",
      orgId: actor.orgId,
      webhookId: parsedId.data,
    });
    if (!allowed) {
      return failure("forbidden", "You cannot manage webhooks here.");
    }

    // Listing is org-scoped, so an endpoint id from another tenant simply is
    // not in the result and the route reports it as missing.
    const endpoints = await listWebhooks(actor, actor.orgId);
    const endpoint = endpoints.find((row) => row.id === parsedId.data);
    if (endpoint === undefined) {
      return failure("not_found", "No such endpoint in this organization.");
    }

    const payload = JSON.stringify({
      eventType: "webhook.test",
      orgId: actor.orgId,
      endpointId: endpoint.id,
      sentAt: new Date().toISOString(),
    });

    return Response.json({
      delivered: endpoint.enabled,
      url: endpoint.url,
      signature: signPayload(endpoint.secret, payload),
      payload,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
