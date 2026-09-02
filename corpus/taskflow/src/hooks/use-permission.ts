"use client";

/**
 * Client-side `can()` for the current actor. Never re-implements the matrix.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can
 */
import type { PermissionAction, PermissionResource } from "@/types/permission";
export function usePermission(action: PermissionAction, resource: PermissionResource): boolean {
  throw new Error("stub: src/hooks/use-permission.ts");
}
