"use client";

/**
 * Ctrl+K overlay shell; the domain layer supplies the groups.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement } from "react";
export type CommandGroup = { heading: string; items: readonly CommandItemSpec[] };

export type CommandItemSpec = { id: string; label: string; hint?: string; shortcut?: string };

export type CommandPaletteProps = { open: boolean; groups: readonly CommandGroup[]; placeholder?: string; onClose: () => void; onSelect: (id: string) => void };

export function CommandPalette(props: CommandPaletteProps): ReactElement | null {
  return null;
}
