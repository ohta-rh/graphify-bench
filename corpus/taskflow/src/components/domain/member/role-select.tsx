"use client";

/**
 * Role dropdown that never offers a role above the actor's own.
 *
 * Must call (do not reimplement): hasRoleAtLeast
 */
import { Select, type SelectOption } from "@/components/ui/select";
import { humanizeRole } from "@/lib/format";
import { ROLES, hasRoleAtLeast, type Actor, type Role } from "@/types/member";
import type { ReactElement } from "react";

export type RoleSelectProps = {
  value: Role;
  actor: Actor;
  disabled?: boolean;
  onChange: (role: Role) => void;
};

/**
 * Privilege escalation guard for the UI: an admin must not be able to hand out
 * `owner`. `hasRoleAtLeast` is the only place role rank is compared — never
 * `role === "owner"`.
 */
export function assignableRoles(actor: Actor): readonly Role[] {
  if (actor.isPlatformStaff === true) return ROLES;
  return ROLES.filter((role) => hasRoleAtLeast(actor.role, role));
}

export function RoleSelect(props: RoleSelectProps): ReactElement | null {
  const { value, actor, disabled = false, onChange } = props;
  const allowed = assignableRoles(actor);

  const options: readonly SelectOption[] = ROLES.map((role) => ({
    value: role,
    label: humanizeRole(role),
    // The member's current role stays visible even when the actor could not
    // grant it; it is simply not selectable.
    disabled: !allowed.includes(role),
  }));

  return (
    <Select
      name="role"
      value={value}
      options={options}
      disabled={disabled}
      onChange={(next) => onChange(next as Role)}
    />
  );
}
