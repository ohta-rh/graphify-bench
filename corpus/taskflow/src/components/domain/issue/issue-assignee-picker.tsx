"use client";

/**
 * Assignee combobox restricted to active members.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { ReactElement } from "react";
export type IssueAssigneePickerProps = { value: UserId | null; members: readonly MemberWithUser[]; disabled?: boolean; onChange: (userId: UserId | null) => void };

export function IssueAssigneePicker(props: IssueAssigneePickerProps): ReactElement | null {
  return null;
}
