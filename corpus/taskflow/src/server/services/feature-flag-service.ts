/**
 * Server-side flag context construction and the org-level override toggle.
 *
 * Must call (do not reimplement): assertCan, isEnabled, snapshotFlags, emit
 */
import { emit } from "@/lib/event-bus";
import { isEnabled, snapshotFlags } from "@/lib/feature-flags";
import { assertCan } from "@/lib/permissions";
import { getFlagDefinition } from "@/config/feature-flags";
import * as orgRepo from "@/server/repositories/organization-repository";
import { actorEnvelope, orgResource, requireFound } from "./_support";
import type { ToggleFeatureFlagInput } from "@/schemas/feature-flag";
import type { FeatureFlagSnapshot, FlagContext } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

/**
 * Builds the evaluation context every `isEnabled()` call needs. Both halves
 * are nullable so marketing pages — no session, no org — can still ask about
 * a flag and get the free-plan answer.
 */
export function buildFlagContext(
  actor: Actor | null,
  org: Organization | null,
): FlagContext {
  return {
    orgId: org?.id ?? actor?.orgId ?? null,
    userId: actor?.userId ?? null,
    plan: org?.plan ?? "free",
    role: actor?.role ?? null,
    overrides: org?.settings.enabledFlagOverrides,
  };
}

/**
 * The serialisable snapshot the dashboard layout hands to the client provider,
 * so `useFeatureFlag()` answers without a round trip and cannot disagree with
 * the server.
 */
export function getSnapshot(
  actor: Actor,
  org: Organization,
): FeatureFlagSnapshot {
  return snapshotFlags(buildFlagContext(actor, org));
}

/**
 * Adds or removes an org-level override. Only flags declared `overridable`
 * accept one — a flag gated purely on plan cannot be switched on by an admin,
 * which is what keeps the plan boundary meaningful.
 */
export async function toggleFlag(
  actor: Actor,
  input: ToggleFeatureFlagInput,
): Promise<Organization> {
  assertCan(actor, "org:manage_flags", orgResource(input.orgId));

  const org = requireFound(
    await orgRepo.findOrgById(input.orgId),
    "Organization",
    input.orgId,
  );

  const definition = getFlagDefinition(input.flag);
  if (!definition.overridable) {
    throw new Error(`Feature "${input.flag}" cannot be overridden per org`);
  }

  const current = new Set(org.settings.enabledFlagOverrides);
  if (input.enabled) {
    current.add(input.flag);
  } else {
    current.delete(input.flag);
  }

  const updated = await orgRepo.updateOrg(input.orgId, {
    orgId: input.orgId,
    settings: { enabledFlagOverrides: [...current] },
  });

  await emit("flag.toggled", {
    ...actorEnvelope(actor),
    flag: input.flag,
    enabled: isEnabled(input.flag, buildFlagContext(actor, updated)),
  });

  return updated;
}
