/**
 * Declarative wrapper around `can()` for conditional UI.
 *
 * Must call (do not reimplement): can
 */
import { can } from "@/lib/permissions";
import type { Actor } from "@/types/member";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import type { ReactElement, ReactNode } from "react";

export type PermissionGateProps = {
  actor: Actor;
  action: PermissionAction;
  resource: PermissionResource;
  fallback?: ReactNode;
  children?: ReactNode;
};

/**
 * Renders `children` only when the actor is allowed to perform `action` on
 * `resource`. Hiding a control is a courtesy, not a security boundary — the
 * server action behind it calls `assertCan()` for the same pair.
 */
export function PermissionGate(props: PermissionGateProps): ReactElement | null {
  const allowed = can(props.actor, props.action, props.resource);
  if (!allowed) {
    return props.fallback === undefined ? null : <>{props.fallback}</>;
  }
  return <>{props.children}</>;
}
