/**
 * Organization invitation with the accept link.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
import type { Role } from "@/types/member";
import type { ReactElement } from "react";
export type InviteEmailProps = { inviterName: string; orgName: string; role: Role; acceptUrl: string; expiresAt: IsoTimestamp };

export function InviteEmail(props: InviteEmailProps): ReactElement | null {
  return null;
}
