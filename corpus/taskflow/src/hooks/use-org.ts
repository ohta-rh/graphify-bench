"use client";

/**
 * Reads the org/actor/flag context installed by the dashboard layout.
 */
import { useContext } from "react";
import { OrgContext, type OrgContextValue } from "./org-context";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

/** Throws rather than returning a half-built tenant context — a client
 *  component rendered outside `[orgSlug]` is a routing bug, not a state. */
export function useOrgContext(): OrgContextValue {
  const value = useContext(OrgContext);
  if (value === null) {
    throw new Error(
      "useOrg() must be rendered inside the dashboard <OrgProvider>.",
    );
  }
  return value;
}

export function useOrg(): {
  org: Organization;
  actor: Actor;
  flags: FeatureFlagSnapshot;
} {
  const { org, actor, flags } = useOrgContext();
  return { org, actor, flags };
}
