/**
 * Wires every subscriber at process start. Called once from `src/instrumentation.ts`; the only module that knows the full listener set.
 *
 * Must call (do not reimplement): subscribe, registerActivityListeners, registerSearchListeners, registerUsageListeners, registerWebhookListeners
 */
import { subscribe } from "@/lib/event-bus";
import { createLogger } from "@/lib/logger";
import { enqueue } from "@/server/jobs/queue";
import { toIsoTimestamp } from "@/types/common";
import { registerActivityListeners } from "./activity-service";
import { registerSearchListeners } from "./search-service";
import { registerUsageListeners } from "./usage-service";
import { registerWebhookListeners } from "./webhook-service";
import type { Unsubscribe } from "@/types/event";

/**
 * Importing this module also loads `notification-service` transitively, which
 * attaches the notification fan-out on first import — that hub has no
 * `register*` entry point of its own.
 */
import "./notification-service";

const logger = createLogger("event-registry");

/** Non-null between `registerEventHandlers()` and `unregisterEventHandlers()`. */
let detach: Unsubscribe | null = null;

/**
 * Attaches every subscriber exactly once. Idempotent: `instrumentation.ts`
 * runs per server process, but a hot reload in dev can call it again and must
 * not double-deliver every event.
 */
export function registerEventHandlers(): void {
  if (detach !== null) return;

  const offs: Unsubscribe[] = [
    registerActivityListeners(),
    registerSearchListeners(),
    registerUsageListeners(),
    registerWebhookListeners(),
    registerDigestBridge(),
  ];

  detach = () => {
    for (const off of offs) off();
  };

  logger.info("event handlers registered", { groups: offs.length });
}

export function unregisterEventHandlers(): void {
  detach?.();
  detach = null;
}

/**
 * The one piece of wiring that belongs to no single service: turning a
 * `digest.due` event into a queued job. Keeping it here rather than inside
 * `DigestService` stops the service layer from depending on the job layer.
 */
function registerDigestBridge(): Unsubscribe {
  return subscribe("digest.due", (payload) => {
    enqueue({
      id: `digest:${payload.orgId}:${payload.recipientId}`,
      kind: "digest-email",
      runAt: toIsoTimestamp(new Date()),
      attempts: 0,
      payload: {
        orgId: payload.orgId,
        recipientId: payload.recipientId,
        windowStart: payload.windowStart,
      },
    });
  });
}
