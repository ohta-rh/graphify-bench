"use client";

/**
 * Members settings table; role and remove controls are permission gated.
 *
 * Must call (do not reimplement): can
 */
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { isLive } from "@/lib/soft-delete";
import type { MemberId } from "@/types/common";
import type { Actor, MemberWithUser, Role } from "@/types/member";
import type { ReactElement } from "react";
import { memberResource } from "../permission/resources";
import { RoleBadge } from "../permission/role-badge";
import { RoleSelect } from "./role-select";

export type MemberTableProps = {
  members: readonly MemberWithUser[];
  actor: Actor;
  onRoleChange: (memberId: MemberId, role: Role) => void;
  onRemove: (memberId: MemberId) => void;
};

export function MemberTable(props: MemberTableProps): ReactElement | null {
  const { members, actor, onRoleChange, onRemove } = props;
  const visible = members.filter(isLive);

  return (
    <Table caption="Organization members">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Member</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Last seen</TableHeaderCell>
          <TableHeaderCell></TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody>
        {visible.map((member) => {
          const resource = memberResource(member);
          const mayChangeRole = can(actor, "member:update_role", resource);
          // Nobody removes themselves from the members table; leaving the org
          // is a separate, deliberate flow.
          const isSelf = member.userId === actor.userId;
          const mayRemove = can(actor, "member:remove", resource) && !isSelf;

          return (
            <TableRow key={member.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Avatar
                    name={member.user.name}
                    src={member.user.avatarUrl}
                    size="sm"
                  />
                  <span>
                    <span className="block font-medium">
                      {member.user.name}
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {member.user.email}
                    </span>
                  </span>
                </span>
              </TableCell>

              <TableCell className="w-44">
                {mayChangeRole ? (
                  <RoleSelect
                    value={member.role}
                    actor={actor}
                    onChange={(role) => onRoleChange(member.id, role)}
                  />
                ) : (
                  <RoleBadge role={member.role} />
                )}
              </TableCell>

              <TableCell className="w-32">
                <Badge
                  tone={member.status === "active" ? "success" : "warning"}
                  size="sm"
                >
                  {member.status}
                </Badge>
              </TableCell>

              <TableCell className="w-36 text-sm text-neutral-500">
                {member.lastSeenAt === null
                  ? "Never"
                  : formatRelative(member.lastSeenAt)}
              </TableCell>

              <TableCell className="w-28 text-right">
                {mayRemove ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onRemove(member.id)}
                  >
                    Remove
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
