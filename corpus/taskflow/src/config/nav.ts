/**
 * Declarative navigation tree. Each item names the permission and flag that gate it, which is how the sidebar stays role-aware without ad-hoc conditionals.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import type { FeatureFlagKey, FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { PermissionAction } from "@/types/permission";
export const SIDEBAR_NAV: readonly NavItem[] = undefined as unknown as readonly NavItem[];

export const SETTINGS_NAV: readonly NavItem[] = undefined as unknown as readonly NavItem[];

export function visibleNav(items: readonly NavItem[], actor: Actor, flags: FeatureFlagSnapshot): readonly NavItem[] {
  throw new Error("stub: src/config/nav.ts");
}

export type NavItem = { key: string; label: string; segment: string; icon?: string; action?: PermissionAction; flag?: FeatureFlagKey; children?: readonly NavItem[] };
