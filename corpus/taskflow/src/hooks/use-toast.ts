"use client";

/**
 * Toast queue backing `Toaster`.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { ToastSpec } from "@/components/ui/toaster";
import {
  dismissToast,
  getServerToasts,
  getToasts,
  pushToast,
  subscribeToasts,
} from "./toast-store";

export function useToast(): {
  toasts: readonly ToastSpec[];
  push: (toast: Omit<ToastSpec, "id">) => string;
  dismiss: (id: string) => void;
} {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToasts,
    getServerToasts,
  );

  const push = useCallback(
    (toast: Omit<ToastSpec, "id">) => pushToast(toast),
    [],
  );
  const dismiss = useCallback((id: string) => dismissToast(id), []);

  return { toasts, push, dismiss };
}
