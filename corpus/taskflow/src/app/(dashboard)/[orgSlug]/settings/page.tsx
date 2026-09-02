/**
 * General organization settings.
 *
 * Owner D. Name, logo and the `OrganizationSettings` block. Read access is
 * `org:read` (everyone), write access is `org:update` (admin and above), so the
 * page renders for a viewer with the form disabled rather than 404ing.
 *
 * Must call (do not reimplement): can
 */

import type { Metadata } from "next";
import { can } from "@/lib/permissions";
import { loadTenantContext } from "../_lib/tenant-context";
import { OrganizationSettingsForm } from "./organization-settings-form";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "General settings",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const mayEdit = can(actor, "org:update", {
    kind: "organization",
    orgId: org.id,
  });

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">General</h1>
        <p className="mt-1 text-sm text-slate-600">
          The name and defaults everybody in {org.name} sees.
        </p>
      </header>

      <OrganizationSettingsForm org={org} disabled={!mayEdit} />

      {!mayEdit ? (
        <p className="text-xs text-slate-500">
          Only admins and owners can change these settings.
        </p>
      ) : null}
    </div>
  );
}
