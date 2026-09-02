"use client";

/**
 * Renders children only when the flag is on for the current context.
 *
 * Must call (do not reimplement): isEnabled
 */
import { useContext } from "react";
import { FlagSnapshotContext, readFlag } from "@/hooks/flag-context";
import type { FeatureFlagKey } from "@/types/feature-flag";
import type { ReactElement, ReactNode } from "react";

export type FeatureGateProps = {
  flag: FeatureFlagKey;
  fallback?: ReactNode;
  children?: ReactNode;
};

/** The flag twin of `PermissionGate`: `readFlag` consults the snapshot the
 *  layout installed and falls back to `isEnabled()` for unknown keys. */
export function FeatureGate(props: FeatureGateProps): ReactElement | null {
  const snapshot = useContext(FlagSnapshotContext);
  if (!readFlag(snapshot, props.flag)) {
    return props.fallback === undefined ? null : <>{props.fallback}</>;
  }
  return <>{props.children}</>;
}
