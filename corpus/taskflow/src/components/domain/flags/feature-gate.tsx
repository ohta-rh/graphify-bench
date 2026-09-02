"use client";

/**
 * Renders children only when the flag is on for the current context.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): isEnabled
 */
import type { FeatureFlagKey } from "@/types/feature-flag";
import type { ReactElement, ReactNode } from "react";
export type FeatureGateProps = { flag: FeatureFlagKey; fallback?: ReactNode; children?: ReactNode };

export function FeatureGate(props: FeatureGateProps): ReactElement | null {
  return null;
}
