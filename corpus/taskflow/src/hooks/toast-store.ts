/**
 * Module-level toast queue.
 *
 * The `Toaster` lives once at the root of the dashboard shell while `push()`
 * is called from forms scattered all over the tree, so the queue cannot be
 * component state. It is a tiny external store read through
 * `useSyncExternalStore` — no provider to forget to mount, and the same queue
 * whether the caller is a dialog, a table row or a server-action callback.
 */
import type { ToastSpec } from "@/components/ui/toaster";

export const TOAST_DISMISS_MS = 5_000;
export const TOAST_MAX_VISIBLE = 4;

type Listener = () => void;

let queue: readonly ToastSpec[] = [];
let counter = 0;
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function publish(next: readonly ToastSpec[]): void {
  queue = next;
  for (const listener of listeners) listener();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): readonly ToastSpec[] {
  return queue;
}

/** Server render has no queue; a stable empty array keeps hydration quiet. */
export function getServerToasts(): readonly ToastSpec[] {
  return EMPTY_TOASTS;
}

const EMPTY_TOASTS: readonly ToastSpec[] = [];

export function pushToast(
  toast: Omit<ToastSpec, "id">,
  autoDismissMs: number = TOAST_DISMISS_MS,
): string {
  counter += 1;
  const id = `toast-${counter}`;
  const next = [...queue, { ...toast, id }];
  publish(next.slice(Math.max(0, next.length - TOAST_MAX_VISIBLE)));

  if (autoDismissMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), autoDismissMs),
    );
  }
  return id;
}

export function dismissToast(id: string): void {
  const timer = timers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    timers.delete(id);
  }
  publish(queue.filter((toast) => toast.id !== id));
}

/** Test seam: drops every queued toast and its pending timer. */
export function resetToasts(): void {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  counter = 0;
  publish(EMPTY_TOASTS);
}
