"use client";

/**
 * Removal confirmation.
 */
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
import { RoleBadge } from "../permission/role-badge";

export type RemoveMemberDialogProps = {
  open: boolean;
  member: MemberWithUser;
  onConfirm: () => void;
  onClose: () => void;
};

export function RemoveMemberDialog(
  props: RemoveMemberDialogProps,
): ReactElement | null {
  const { open, member, onConfirm, onClose } = props;
  if (!open) return null;

  return (
    <Dialog
      open={open}
      title={`Remove ${member.user.name}?`}
      description="They lose access immediately. Issues and comments they authored stay, attributed to them."
      onClose={onClose}
      footer={
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Remove member
          </Button>
        </DialogFooter>
      }
    >
      <p className="text-sm">
        {member.user.email} is currently a <RoleBadge role={member.role} /> in
        this organization. Removing them frees one seat.
      </p>
    </Dialog>
  );
}
