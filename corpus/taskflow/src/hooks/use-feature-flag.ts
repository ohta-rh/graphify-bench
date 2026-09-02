"use client";

/**
 * Reads one flag from the `FeatureFlagProvider` snapshot.
 *
 * Must call (do not reimplement): isEnabled
 */
import { useContext } from "react";
import type { FeatureFlagKey } from "@/types/feature-flag";
import { FlagSnapshotContext, readFlag } from "./flag-context";

export function useFeatureFlag(flag: FeatureFlagKey): boolean {
  const snapshot = useContext(FlagSnapshotContext);
  return readFlag(snapshot, flag);
}
