"use client";

/**
 * Client context carrying the server-evaluated flag snapshot.
 *
 * Must call (do not reimplement): snapshotFlags
 */
import { useMemo } from "react";
import { snapshotFlags } from "@/lib/feature-flags";
import { ANONYMOUS_FLAG_CONTEXT, FlagSnapshotContext } from "@/hooks/flag-context";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { ReactElement, ReactNode } from "react";

export type FeatureFlagProviderProps = {
  snapshot: FeatureFlagSnapshot;
  children?: ReactNode;
};

export function FeatureFlagProvider(
  props: FeatureFlagProviderProps,
): ReactElement | null {
  const value = useMemo<FeatureFlagSnapshot>(
    () => ({
      // A snapshot serialised before a newly shipped flag existed would be
      // missing that key; backfilling from a baseline evaluation keeps the
      // client from reading `undefined` and rendering a gate open.
      ...snapshotFlags(ANONYMOUS_FLAG_CONTEXT),
      ...props.snapshot,
    }),
    [props.snapshot],
  );

  return (
    <FlagSnapshotContext.Provider value={value}>
      {props.children}
    </FlagSnapshotContext.Provider>
  );
}
