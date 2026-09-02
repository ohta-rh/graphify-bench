/**
 * Next.js instrumentation hook. Runs once per server process before any
 * request is handled — the only sanctioned place to register the event-bus
 * subscribers and start the in-process job scheduler.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { registerEventHandlers } = await import(
    "@/server/services/event-registry"
  );
  const { startScheduler } = await import("@/server/jobs/scheduler");

  registerEventHandlers();
  startScheduler();
}

export function onRequestError(
  error: unknown,
  request: { path: string; method: string },
): void {
  console.error(
    `[taskflow] ${request.method} ${request.path} failed:`,
    error instanceof Error ? error.message : error,
  );
}
