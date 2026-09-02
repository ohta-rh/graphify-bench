/**
 * Native-backed single select.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement } from "react";
export type SelectOption = { value: string; label: string; disabled?: boolean };

export type SelectProps = { name: string; value?: string; options: readonly SelectOption[]; placeholder?: string; disabled?: boolean; onChange?: (value: string) => void; className?: string };

export function Select(props: SelectProps): ReactElement | null {
  return null;
}
