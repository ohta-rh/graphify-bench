/**
 * Declarative wrapper around `can()` for conditional UI.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { Actor } from "@/types/member";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import type { ReactElement, ReactNode } from "react";
export type PermissionGateProps = { actor: Actor; action: PermissionAction; resource: PermissionResource; fallback?: ReactNode; children?: ReactNode };

export function PermissionGate(props: PermissionGateProps): ReactElement | null {
  return null;
}
