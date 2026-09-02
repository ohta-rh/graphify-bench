/**
 * Primary action button with variant/size/loading states.
 *
 * STUB — owner A. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ReactElement, ReactNode } from "react";
export type ButtonProps = { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; disabled?: boolean; type?: 'button' | 'submit'; onClick?: () => void; className?: string; children?: ReactNode };

export function Button(props: ButtonProps): ReactElement | null {
  return null;
}
