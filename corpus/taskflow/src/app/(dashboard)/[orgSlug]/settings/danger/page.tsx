/**
 * Destructive actions: transfer ownership, delete organization.
 *
 * Owner D. `org:delete` is owner-only in `ROLE_MATRIX`, so even an admin never
 * sees this page — the sub-nav filters it out and the page 404s if it is
 * reached directly.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { can } from "@/lib/permissions";
import { loadTenantContext } from "../../_lib/tenant-context";
import { DeleteOrganizationForm } from "./delete-organization-form";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danger zone",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "org:delete", {
    kind: "organization",
    orgId: org.id,
  });
  if (!allowed) {
    notFound();
  }

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Danger zone</h1>
        <p className="mt-1 text-sm text-slate-600">
          Only owners can see this page.
        </p>
      </header>

      <section className="rounded-md border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-sm font-semibold text-rose-900">
          Delete this organization
        </h2>
        <p className="mt-2 text-sm text-rose-800">
          The organization is archived rather than erased — projects, issues and
          comments stop being reachable immediately, and the cleanup job removes
          them once the retention window expires. Everyone loses access at once.
        </p>

        <div className="mt-6">
          <DeleteOrganizationForm orgId={org.id} slug={org.slug} />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold">Transfer ownership</h2>
        <p className="mt-2 text-sm text-slate-600">
          Promote another member to owner from Settings → Members, then ask them
          to demote you. An organization must keep at least one owner at all
          times, which is why there is no one-click transfer here.
        </p>
      </section>
    </div>
  );
}
