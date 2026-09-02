"use client";

/**
 * Trigger-anchored action menu.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement, ReactNode } from "react";
export type DropdownItem = { id: string; label: string; icon?: ReactNode; destructive?: boolean; onSelect: () => void };

export type DropdownMenuProps = { trigger: ReactNode; items: readonly DropdownItem[]; align?: 'start' | 'end' };

export function DropdownMenu(props: DropdownMenuProps): ReactElement | null {
  return null;
}
