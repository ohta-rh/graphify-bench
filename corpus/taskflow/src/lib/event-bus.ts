import type {
  EventHandler,
  TaskflowEventMap,
  TaskflowEventPayload,
  TaskflowEventType,
  Unsubscribe,
} from "@/types/event";

/**
 * In-process, typed publish/subscribe bus.
 *
 * Taskflow keeps `IssueService`, `NotificationService`, `ActivityService`, the
 * search indexer and the webhook dispatcher decoupled: writers `emit()`, and
 * every reactive concern `subscribe()`s at module init (see
 * `src/server/services/event-registry.ts`). Handlers are isolated — one
 * throwing handler never fails the emit or the sibling handlers.
 */

type HandlerSet = Set<EventHandler<TaskflowEventType>>;

const handlers = new Map<TaskflowEventType, HandlerSet>();

const errorSinks = new Set<(type: TaskflowEventType, error: unknown) => void>();

/** Registers a handler for one event type. Call the return value to detach. */
export function subscribe<K extends TaskflowEventType>(
  type: K,
  handler: EventHandler<K>,
): Unsubscribe {
  const set = handlers.get(type) ?? new Set();
  set.add(handler as EventHandler<TaskflowEventType>);
  handlers.set(type, set);
  return () => {
    set.delete(handler as EventHandler<TaskflowEventType>);
  };
}

/** Registers a handler that detaches itself after the first delivery. */
export function subscribeOnce<K extends TaskflowEventType>(
  type: K,
  handler: EventHandler<K>,
): Unsubscribe {
  const off = subscribe(type, (payload) => {
    off();
    return handler(payload);
  });
  return off;
}

/**
 * Publishes an event to every subscriber. Resolves once all handlers settle;
 * rejected handlers are reported to the error sinks, never rethrown.
 */
export async function emit<K extends TaskflowEventType>(
  type: K,
  payload: TaskflowEventPayload<K>,
): Promise<void> {
  const set = handlers.get(type);
  if (!set || set.size === 0) return;

  const results = await Promise.allSettled(
    [...set].map(async (handler) => {
      await (handler as EventHandler<K>)(payload);
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      reportHandlerError(type, result.reason);
    }
  }
}

/** Fire-and-forget variant for call sites that must not await delivery. */
export function emitAndForget<K extends TaskflowEventType>(
  type: K,
  payload: TaskflowEventPayload<K>,
): void {
  void emit(type, payload).catch((error: unknown) => {
    reportHandlerError(type, error);
  });
}

export function onHandlerError(
  sink: (type: TaskflowEventType, error: unknown) => void,
): Unsubscribe {
  errorSinks.add(sink);
  return () => {
    errorSinks.delete(sink);
  };
}

function reportHandlerError(type: TaskflowEventType, error: unknown): void {
  for (const sink of errorSinks) {
    try {
      sink(type, error);
    } catch {
      // A failing error sink must never escalate.
    }
  }
}

/** Number of live subscribers for an event; used by tests and diagnostics. */
export function subscriberCount(type: TaskflowEventType): number {
  return handlers.get(type)?.size ?? 0;
}

/** Detaches every handler. Test-only — never call from application code. */
export function resetEventBus(): void {
  handlers.clear();
  errorSinks.clear();
}

export type { TaskflowEventMap, TaskflowEventType, Unsubscribe };
