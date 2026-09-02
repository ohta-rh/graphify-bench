"use client";

/**
 * The per-request tenant context the dashboard layout installs.
 *
 * Everything below `[orgSlug]` needs the same three values — the organization,
 * the resolved `Actor` and the evaluated flag snapshot — plus the quota checks
 * the billing service already computed for the shell. Passing those down by
 * props through every component would be noise, so the layout renders one
 * `OrgProvider` and `useOrg()` / `usePermission()` / `usePlanLimits()` read it.
 */
import { createContext, type ReactElement, type ReactNode } from "react";
import type { LimitCheck } from "@/types/billing";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

export interface OrgContextValue {
  readonly org: Organization;
  readonly actor: Actor;
  readonly flags: FeatureFlagSnapshot;
  /** Quota checks for the current billing period, or `[]` when not loaded. */
  readonly limitChecks: readonly LimitCheck[];
}

export const OrgContext = createContext<OrgContextValue | null>(null);

export interface OrgProviderProps {
  readonly value: OrgContextValue;
  readonly children?: ReactNode;
}

export function OrgProvider(props: OrgProviderProps): ReactElement {
  return (
    <OrgContext.Provider value={props.value}>
      {props.children}
    </OrgContext.Provider>
  );
}
