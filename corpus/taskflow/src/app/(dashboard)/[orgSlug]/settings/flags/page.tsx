/**
 * Per-org feature flag overrides.
 *
 * Owner D. Each row shows three separate facts that are easy to conflate: what
 * the definition's rollout strategy says, whether the org has an override, and
 * what `isEnabled()` actually returns right now. Only `overridable` flags can be
 * changed here.
 *
 * Must call (do not reimplement): can, isEnabled
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { toggleFeatureFlagAction } from "@/actions/flags/toggle-flag";
import { FEATURE_FLAG_DEFINITIONS } from "@/config/feature-flags";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import type { FeatureFlagKey } from "@/types/feature-flag";
import { loadTenantContext } from "../../_lib/tenant-context";
import { FlagToggleList, type FlagRow } from "./flag-toggle-list";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feature flags",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "org:manage_flags", {
    kind: "organization",
    orgId: org.id,
  });
  if (!allowed) {
    notFound();
  }

  const context = buildFlagContext(actor, org);
  const overrides = new Set(org.settings.enabledFlagOverrides);

  const rows: readonly FlagRow[] = Object.values(FEATURE_FLAG_DEFINITIONS).map(
    (definition) => ({
      key: definition.key,
      label: definition.label,
      description: definition.description,
      strategy: describeStrategy(definition.strategy.kind),
      overridable: definition.overridable,
      overridden: overrides.has(definition.key),
      enabled: isEnabled(definition.key, context),
    }),
  );

  async function toggle(flag: FeatureFlagKey, enabled: boolean): Promise<void> {
    "use server";
    await toggleFeatureFlagAction({ orgId: org.id, flag, enabled });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Feature flags</h1>
        <p className="mt-1 text-sm text-slate-600">
          Flags gated on your plan turn on automatically. Overridable ones can be
          switched here for {org.name} only.
        </p>
      </header>

      <FlagToggleList rows={rows} onToggle={toggle} />
    </div>
  );
}

function describeStrategy(kind: string): string {
  switch (kind) {
    case "on":
      return "Always on";
    case "off":
      return "Off by default";
    case "plan":
      return "Included from a certain plan";
    case "role":
      return "Limited by role";
    case "percentage":
      return "Percentage rollout";
    default:
      return kind;
  }
}
