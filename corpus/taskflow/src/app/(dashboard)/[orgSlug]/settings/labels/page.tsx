/**
 * Label management.
 *
 * Owner D. Labels are organization-wide, so this is the only place they can be
 * created or deleted — a project cannot own one.
 *
 * Must call (do not reimplement): can
 */

import type { Metadata } from "next";
import { createLabelAction } from "@/actions/labels/create-label";
import { deleteLabelAction } from "@/actions/labels/delete-label";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { listLabels } from "@/server/services/label-service";
import { loadTenantContext } from "../../_lib/tenant-context";
import { LabelManager } from "./label-manager";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Labels",
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

  const labels = await listLabels(actor, org.id);

  return (
    <div className="max-w-xl space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Labels</h1>
        <p className="mt-1 text-sm text-slate-600">
          Shared across every project in {org.name}. Deleting one detaches it
          from the issues that carry it.
        </p>
      </header>

      {labels.length === 0 && !mayEdit ? (
        <EmptyState
          title="No labels yet"
          description="An admin can create the first one."
        />
      ) : (
        <LabelManager
          orgId={org.id}
          labels={labels}
          editable={mayEdit}
          onCreate={createLabelAction}
          onDelete={deleteLabelAction}
        />
      )}
    </div>
  );
}
