/**
 * Label + control + hint + error layout used by every form.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement, ReactNode } from "react";
export type FormFieldProps = { name: string; label: string; hint?: string; error?: string | null; required?: boolean; children?: ReactNode };

export function FormField(props: FormFieldProps): ReactElement | null {
  return null;
}
