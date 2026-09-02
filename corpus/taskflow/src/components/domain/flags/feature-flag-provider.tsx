"use client";

/**
 * Client context carrying the server-evaluated flag snapshot.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): snapshotFlags
 */
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { ReactElement, ReactNode } from "react";
export type FeatureFlagProviderProps = { snapshot: FeatureFlagSnapshot; children?: ReactNode };

export function FeatureFlagProvider(props: FeatureFlagProviderProps): ReactElement | null {
  return null;
}
