"use client";

/**
 * Fixed-position toast region fed by `useToast`.
 *
 * Owner A — design system. Owns the auto-dismiss timers for the queue: one
 * timer per toast id, started when the id first appears and cleared when it
 * leaves, so re-rendering the list never restarts a countdown. Only the newest
 * `MAX_VISIBLE` toasts render; the rest wait behind them.
 */
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import { Toast } from "./toast";

export type ToastSpec = { id: string; title: string; description?: string; tone?: 'neutral' | 'success' | 'danger' };

export type ToasterProps = { toasts: readonly ToastSpec[]; onDismiss: (id: string) => void };

/** Danger toasts linger: an error the user missed is worse than a stale card. */
export const TOAST_TIMEOUT_MS = { neutral: 4_000, success: 4_000, danger: 8_000 } as const;

const MAX_VISIBLE = 3;

export function Toaster(props: ToasterProps): ReactElement | null {
  const { toasts, onDismiss } = props;

  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  const visible = toasts.slice(-MAX_VISIBLE);

  useEffect(() => {
    const live = new Set(visible.map((toast) => toast.id));

    // Start a timer for every newly visible toast...
    for (const toast of visible) {
      if (timers.current.has(toast.id)) continue;
      const ms = TOAST_TIMEOUT_MS[toast.tone ?? "neutral"];
      const handle = setTimeout(() => {
        timers.current.delete(toast.id);
        dismissRef.current(toast.id);
      }, ms);
      timers.current.set(toast.id, handle);
    }

    // ...and drop the ones whose toast is gone (dismissed by hand, or pushed
    // out of the visible window by newer arrivals).
    for (const [id, handle] of timers.current) {
      if (!live.has(id)) {
        clearTimeout(handle);
        timers.current.delete(id);
      }
    }
  }, [visible]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const handle of pending.values()) clearTimeout(handle);
      pending.clear();
    };
  }, []);

  if (visible.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2"
    >
      {visible.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          tone={toast.tone}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
