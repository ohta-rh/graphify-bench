"use client";

/**
 * Role-aware sidebar: every item is filtered through `can()` and its flag.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";
import type { ReactElement } from "react";
export type AppSidebarProps = { org: Organization; actor: Actor; flags: FeatureFlagSnapshot; projects: readonly Project[]; pathname: string };

export function AppSidebar(props: AppSidebarProps): ReactElement | null {
  return null;
}
