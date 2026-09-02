"use client";

/**
 * Client context provider seeded with the org, actor and flag snapshot.
 *
 * Owner D. The tenant layout resolves all three on the server once per
 * navigation and hands them down as plain serialisable values; `useOrg`,
 * `usePermission` and `useFeatureFlag` read them from here. Nothing in the
 * client tree ever re-derives them, which is why a flag can be evaluated in a
 * component without a round trip.
 */

import { createContext, type ReactNode } from "react";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

export type OrgContextValue = {
  readonly org: Organization;
  readonly actor: Actor;
  readonly flags: FeatureFlagSnapshot;
};

/**
 * `null` means "rendered outside the tenant subtree" — the hooks throw on it
 * rather than inventing a default org, because a wrong tenant is worse than a
 * crash.
 */
export const OrgContext = createContext<OrgContextValue | null>(null);

export type OrgProviderProps = OrgContextValue & {
  children?: ReactNode;
};

export function OrgProvider(props: OrgProviderProps) {
  const { org, actor, flags, children } = props;

  return (
    <OrgContext.Provider value={{ org, actor, flags }}>
      {children}
    </OrgContext.Provider>
  );
}
