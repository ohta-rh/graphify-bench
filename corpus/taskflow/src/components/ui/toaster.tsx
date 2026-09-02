"use client";

/**
 * Fixed-position toast region fed by `useToast`.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement } from "react";
export type ToastSpec = { id: string; title: string; description?: string; tone?: 'neutral' | 'success' | 'danger' };

export type ToasterProps = { toasts: readonly ToastSpec[]; onDismiss: (id: string) => void };

export function Toaster(props: ToasterProps): ReactElement | null {
  return null;
}
