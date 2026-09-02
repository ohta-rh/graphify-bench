/**
 * Loads the three things every page under `[orgSlug]` needs: the organization,
 * the caller's `Actor` inside it, and the feature-flag snapshot.
 *
 * Owner D. Private to the tenant subtree. It exists so that no page has to
 * remember the order of operations — resolve the org, resolve the actor, assert
 * they agree, only then evaluate flags. Getting that order wrong is how a page
 * ends up evaluating flags against somebody else's plan.
 */

import { notFound } from "next/navigation";
import { getActor } from "@/lib/actor";
import { snapshotFlags } from "@/lib/feature-flags";
import { assertOrgScope } from "@/lib/tenant";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { resolveOrgBySlug } from "@/server/services/organization-service";
import type { FeatureFlagSnapshot } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";

export type TenantContext = {
  readonly org: Organization;
  readonly actor: Actor;
  readonly flags: FeatureFlagSnapshot;
};

/**
 * A missing organization and an organization the caller cannot reach are the
 * same 404 on purpose: distinguishing them would leak which slugs exist.
 */
export async function loadTenantContext(orgSlug: string): Promise<TenantContext> {
  const org = await resolveOrgBySlug(orgSlug);
  if (org === null) {
    notFound();
  }

  const actor = await getActor(orgSlug);
  assertOrgScope(actor, org.id);

  const flags = snapshotFlags(buildFlagContext(actor, org));
  return { org, actor, flags };
}
