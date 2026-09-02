"use client";

/**
 * Client-side `can()` for the current actor. Never re-implements the matrix.
 *
 * Must call (do not reimplement): can
 */
import { useMemo } from "react";
import { can } from "@/lib/permissions";
import type { PermissionAction, PermissionResource } from "@/types/permission";
import { useOrg } from "./use-org";

export function usePermission(
  action: PermissionAction,
  resource: PermissionResource,
): boolean {
  const { actor } = useOrg();
  return useMemo(
    () => can(actor, action, resource),
    [actor, action, resource],
  );
}
