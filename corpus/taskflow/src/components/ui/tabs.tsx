"use client";

/**
 * Horizontal tab bar.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement } from "react";
export type TabSpec = { value: string; label: string; count?: number };

export type TabsProps = { value: string; tabs: readonly TabSpec[]; onChange: (value: string) => void; className?: string };

export function Tabs(props: TabsProps): ReactElement | null {
  return null;
}
