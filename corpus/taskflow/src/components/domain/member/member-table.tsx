"use client";

/**
 * Members settings table; role and remove controls are permission gated.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { MemberId } from "@/types/common";
import type { Actor, MemberWithUser, Role } from "@/types/member";
import type { ReactElement } from "react";
export type MemberTableProps = { members: readonly MemberWithUser[]; actor: Actor; onRoleChange: (memberId: MemberId, role: Role) => void; onRemove: (memberId: MemberId) => void };

export function MemberTable(props: MemberTableProps): ReactElement | null {
  return null;
}
