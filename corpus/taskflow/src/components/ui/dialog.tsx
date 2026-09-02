"use client";

/**
 * Modal dialog with focus trap.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement, ReactNode } from "react";
export type DialogProps = { open: boolean; title: string; description?: string; onClose: () => void; footer?: ReactNode; children?: ReactNode };

export function Dialog(props: DialogProps): ReactElement | null {
  return null;
}

export function DialogFooter(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}

export function DialogHeader(props: { className?: string; children?: ReactNode }): ReactElement | null {
  return null;
}
