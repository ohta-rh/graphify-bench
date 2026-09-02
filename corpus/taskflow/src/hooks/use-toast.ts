"use client";

/**
 * Toast queue backing `Toaster`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ToastSpec } from "@/components/ui/toaster";
export function useToast(): { toasts: readonly ToastSpec[]; push: (toast: Omit<ToastSpec, 'id'>) => string; dismiss: (id: string) => void } {
  throw new Error("stub: src/hooks/use-toast.ts");
}
