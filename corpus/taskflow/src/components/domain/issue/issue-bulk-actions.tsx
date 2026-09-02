"use client";

/**
 * Bulk toolbar shown when rows are selected; permission gated.
 *
 * Must call (do not reimplement): can
 */
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { can } from "@/lib/permissions";
import { formatCount } from "@/lib/format";
import type { IssueId, UserId } from "@/types/common";
import type { Actor, MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";

export type IssueBulkActionsProps = {
  selected: readonly IssueId[];
  actor: Actor;
  onArchive: () => void;
  onAssign: (userId: UserId) => void;
  /** Optional assignee choices; without them only archiving is offered. */
  members?: readonly MemberWithUser[];
};

export function IssueBulkActions(
  props: IssueBulkActionsProps,
): ReactElement | null {
  const { selected, actor, onArchive, onAssign, members = [] } = props;
  if (selected.length === 0) return null;

  // A bulk action spans many rows, so ownership escalations cannot be relied
  // on: the toolbar asks for the tenant-wide grant instead, and each row is
  // re-checked by the action on the server.
  const scope = organizationResource(actor.orgId);
  const mayArchive = can(actor, "issue:archive", scope);
  const mayAssign = can(actor, "issue:assign", scope);
  if (!mayArchive && !mayAssign) return null;

  const options: readonly ComboboxOption[] = members.map((member) => ({
    value: member.userId,
    label: member.user.name,
  }));

  return (
    <div className="flex items-center gap-3 rounded border bg-neutral-50 px-3 py-2">
      <span className="text-sm text-neutral-600">
        {formatCount(selected.length)} selected
      </span>

      {mayAssign && options.length > 0 ? (
        <Combobox
          value={null}
          options={options}
          placeholder="Assign to…"
          emptyLabel="No assignable members"
          onChange={(value) => {
            if (value !== null) onAssign(value as UserId);
          }}
        />
      ) : null}

      {mayArchive ? (
        <Button variant="danger" size="sm" onClick={onArchive}>
          Archive
        </Button>
      ) : null}
    </div>
  );
}
