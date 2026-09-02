"use client";

/**
 * Client context provider seeded with the org, actor, flag snapshot and the
 * quota checks the layout already computed.
 *
 * Owner D. This file is a thin adapter over the single context definition in
 * `@/hooks/org-context` — it exists only so the layout can spread the four
 * values as props instead of building the context object itself. There is
 * deliberately no second `createContext()` here: `useOrg`, `usePermission`
 * and `usePlanLimits` read the context this renders, and two providers would
 * mean the hooks silently saw `null`.
 */

import type { ReactElement, ReactNode } from "react";
import {
  OrgProvider as OrgContextProvider,
  type OrgContextValue,
} from "@/hooks/org-context";

export { OrgContext, type OrgContextValue } from "@/hooks/org-context";

export type OrgProviderProps = Omit<OrgContextValue, "limitChecks"> &
  Partial<Pick<OrgContextValue, "limitChecks">> & {
    children?: ReactNode;
  };

export function OrgProvider(props: OrgProviderProps): ReactElement {
  const { org, actor, flags, limitChecks = [], children } = props;

  return (
    <OrgContextProvider value={{ org, actor, flags, limitChecks }}>
      {children}
    </OrgContextProvider>
  );
}
