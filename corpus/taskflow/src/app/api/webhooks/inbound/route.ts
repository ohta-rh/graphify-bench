/**
 * Receives third-party callbacks validated with `inboundWebhookSchema`.
 *
 * Owner D. The receiver is deliberately dumb: it validates the envelope, charges
 * a rate limit and hands the payload to the event bus. Anything that needs to
 * happen as a result is a subscriber's job, so a slow handler cannot make the
 * sender time out and retry.
 *
 * Must call (do not reimplement): inboundWebhookSchema, consumeRateLimit
 */

import { ANONYMOUS_ORG_ID } from "@/actions/_lib/permission-resources";
import { errorResponse, failure } from "@/app/api/_lib/responses";
import { emit } from "@/lib/event-bus";
import { consumeRateLimit } from "@/lib/rate-limit";
import { inboundWebhookSchema } from "@/schemas/webhook";
import { toIsoTimestamp } from "@/types/common";

export const dynamic = "force-dynamic";

const INBOUND_BUCKET = "webhook:inbound";

export async function POST(request: Request): Promise<Response> {
  try {
    // The sender is not a tenant, so the bucket is the shared anonymous one.
    const verdict = await consumeRateLimit(ANONYMOUS_ORG_ID, INBOUND_BUCKET);
    if (!verdict.allowed) {
      return failure("rate_limited", "Too many inbound callbacks.");
    }

    const body: unknown = await request.json();
    const parsed = inboundWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return failure("validation_failed", "Unrecognised callback envelope.");
    }

    await emit("webhook.delivery_requested", {
      orgId: ANONYMOUS_ORG_ID,
      actorId: null,
      occurredAt: toIsoTimestamp(parsed.data.occurredAt),
      eventType: `inbound.${parsed.data.source}`,
      payload: parsed.data.payload,
    });

    // 202: the callback is accepted, not yet acted on.
    return Response.json({ accepted: true, eventId: parsed.data.eventId }, { status: 202 });
  } catch (error) {
    return errorResponse(error);
  }
}
