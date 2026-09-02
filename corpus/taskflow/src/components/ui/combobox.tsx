"use client";

/**
 * Filterable single-select with keyboard navigation.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement } from "react";
export type ComboboxOption = { value: string; label: string; description?: string };

export type ComboboxProps = { value: string | null; options: readonly ComboboxOption[]; placeholder?: string; emptyLabel?: string; onChange: (value: string | null) => void; className?: string };

export function Combobox(props: ComboboxProps): ReactElement | null {
  return null;
}
