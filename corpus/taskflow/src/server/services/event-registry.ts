/**
 * Wires every subscriber at process start. Called once from `src/instrumentation.ts`; the only module that knows the full listener set.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): subscribe, registerActivityListeners, registerSearchListeners, registerUsageListeners, registerWebhookListeners
 */
export function registerEventHandlers(): void {
  throw new Error("stub: src/server/services/event-registry.ts");
}

export function unregisterEventHandlers(): void {
  throw new Error("stub: src/server/services/event-registry.ts");
}
