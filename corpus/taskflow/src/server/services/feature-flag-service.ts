/**
 * Server-side flag context construction and the org-level override toggle.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, isEnabled, snapshotFlags, emit
 */
import type { ToggleFeatureFlagInput } from "@/schemas/feature-flag";
import type { FeatureFlagSnapshot, FlagContext } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
export function buildFlagContext(actor: Actor | null, org: Organization | null): FlagContext {
  throw new Error("stub: src/server/services/feature-flag-service.ts");
}

export function getSnapshot(actor: Actor, org: Organization): FeatureFlagSnapshot {
  throw new Error("stub: src/server/services/feature-flag-service.ts");
}

export async function toggleFlag(actor: Actor, input: ToggleFeatureFlagInput): Promise<Organization> {
  throw new Error("stub: src/server/services/feature-flag-service.ts");
}
