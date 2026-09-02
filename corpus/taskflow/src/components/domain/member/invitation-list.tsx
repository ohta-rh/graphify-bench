/**
 * Pending invitations with resend/revoke.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { InvitationId } from "@/types/common";
import type { Actor, Invitation } from "@/types/member";
import type { ReactElement } from "react";
export type InvitationListProps = { invitations: readonly Invitation[]; actor: Actor; onRevoke: (invitationId: InvitationId) => void };

export function InvitationList(props: InvitationListProps): ReactElement | null {
  return null;
}
