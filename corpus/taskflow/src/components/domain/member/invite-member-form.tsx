"use client";

/**
 * Invite form that disables submit once the seat quota is reached.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): inviteMemberSchema, can, getPlanLimits
 */
import type { InviteMemberInput } from "@/schemas/member";
import type { ActionResult } from "@/types/api";
import type { LimitCheck } from "@/types/billing";
import type { OrgId } from "@/types/common";
import type { Actor, Invitation } from "@/types/member";
import type { ReactElement } from "react";
export type InviteMemberFormProps = { orgId: OrgId; actor: Actor; seatCheck: LimitCheck; onSubmit: (input: InviteMemberInput) => Promise<ActionResult<Invitation>> };

export function InviteMemberForm(props: InviteMemberFormProps): ReactElement | null {
  return null;
}
