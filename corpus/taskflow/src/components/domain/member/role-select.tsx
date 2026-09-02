"use client";

/**
 * Role dropdown that never offers a role above the actor's own.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): hasRoleAtLeast
 */
import type { Actor, Role } from "@/types/member";
import type { ReactElement } from "react";
export type RoleSelectProps = { value: Role; actor: Actor; disabled?: boolean; onChange: (role: Role) => void };

export function RoleSelect(props: RoleSelectProps): ReactElement | null {
  return null;
}
