"use client";

/**
 * Assignee combobox restricted to active members.
 */
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { isLive } from "@/lib/soft-delete";
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";

export type IssueAssigneePickerProps = {
  value: UserId | null;
  members: readonly MemberWithUser[];
  disabled?: boolean;
  onChange: (userId: UserId | null) => void;
};

/**
 * Only members who can actually act in the org are offered: an invited member
 * has not accepted yet and a suspended one must not receive new work. Removed
 * members are soft-deleted, so `isLive()` decides that part.
 */
export function assignableMembers(
  members: readonly MemberWithUser[],
): readonly MemberWithUser[] {
  return members.filter(
    (member) => member.status === "active" && isLive(member),
  );
}

export function IssueAssigneePicker(
  props: IssueAssigneePickerProps,
): ReactElement | null {
  const options: readonly ComboboxOption[] = assignableMembers(
    props.members,
  ).map((member) => ({
    value: member.userId,
    label: member.user.name,
    description: member.user.email,
  }));

  return (
    <Combobox
      value={props.value}
      options={options}
      placeholder={props.disabled === true ? "Assignee locked" : "Unassigned"}
      emptyLabel="No assignable members"
      onChange={(value) => props.onChange(value as UserId | null)}
    />
  );
}
