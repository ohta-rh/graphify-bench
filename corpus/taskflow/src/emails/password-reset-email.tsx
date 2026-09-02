/**
 * Password reset link.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
import type { ReactElement } from "react";
export type PasswordResetEmailProps = { userName: string; resetUrl: string; expiresAt: IsoTimestamp };

export function PasswordResetEmail(props: PasswordResetEmailProps): ReactElement | null {
  return null;
}
