"use client";

/**
 * Header with search trigger, notifications and the user menu.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled
 */
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { ReactElement } from "react";
export type TopBarProps = { org: Organization; actor: Actor; unreadCount: number; flags: FeatureFlagSnapshot };

export function TopBar(props: TopBarProps): ReactElement | null {
  return null;
}
