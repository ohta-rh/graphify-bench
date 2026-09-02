"use client";

/**
 * Tenant switcher; navigating changes the whole `[orgSlug]` subtree.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { Organization } from "@/types/organization";
import type { ReactElement } from "react";
export type OrgSwitcherProps = { organizations: readonly Organization[]; currentSlug: string };

export function OrgSwitcher(props: OrgSwitcherProps): ReactElement | null {
  return null;
}
