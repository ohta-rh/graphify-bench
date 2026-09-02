"use client";

/**
 * Reads the org/actor/flag context installed by the dashboard layout.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
export function useOrg(): { org: Organization; actor: Actor; flags: FeatureFlagSnapshot } {
  throw new Error("stub: src/hooks/use-org.ts");
}
