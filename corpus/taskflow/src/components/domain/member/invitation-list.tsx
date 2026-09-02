/**
 * Pending invitations with resend/revoke.
 *
 * Must call (do not reimplement): can
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { formatRelative } from "@/lib/date";
import { can } from "@/lib/permissions";
import type { InvitationId } from "@/types/common";
import type { Actor, Invitation } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { RoleBadge } from "../permission/role-badge";

export type InvitationListProps = {
  invitations: readonly Invitation[];
  actor: Actor;
  onRevoke: (invitationId: InvitationId) => void;
  onResend?: (invitationId: InvitationId) => void;
};

/** Neither accepted nor revoked, and not past its expiry. */
export function isPending(invitation: Invitation, now = new Date()): boolean {
  return (
    invitation.acceptedAt === null &&
    invitation.revokedAt === null &&
    new Date(invitation.expiresAt).getTime() > now.getTime()
  );
}

export function InvitationList(
  props: InvitationListProps,
): ReactElement | null {
  const { invitations, actor, onRevoke, onResend } = props;

  // Revoking an invitation is the same grant as issuing one.
  const mayManage = can(
    actor,
    "member:invite",
    organizationResource(actor.orgId),
  );

  const pending = invitations.filter((invitation) => isPending(invitation));
  if (pending.length === 0) {
    return (
      <EmptyState
        title="No pending invitations"
        description="Invitations you send appear here until they are accepted."
      />
    );
  }

  return (
    <Table caption="Pending invitations">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Email</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Expires</TableHeaderCell>
          <TableHeaderCell></TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pending.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>{invitation.email}</TableCell>
            <TableCell className="w-32">
              <RoleBadge role={invitation.role} />
            </TableCell>
            <TableCell className="w-40 text-sm text-neutral-500">
              <Badge tone="neutral" size="sm">
                {formatRelative(invitation.expiresAt)}
              </Badge>
            </TableCell>
            <TableCell className="w-52 text-right">
              {mayManage ? (
                <span className="flex justify-end gap-1">
                  {onResend !== undefined ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResend(invitation.id)}
                    >
                      Resend
                    </Button>
                  ) : null}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRevoke(invitation.id)}
                  >
                    Revoke
                  </Button>
                </span>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
