/**
 * Invoice history.
 *
 * Owner D. Same `org:manage_billing` gate as the billing page — invoices carry
 * amounts, so they are not something a member should be able to browse.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { InvoiceTable } from "@/components/domain/billing/invoice-table";
import { EmptyState } from "@/components/ui/empty-state";
import { can } from "@/lib/permissions";
import { listInvoices } from "@/server/services/billing-service";
import { loadTenantContext } from "../../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invoices",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "org:manage_billing", {
    kind: "billing",
    orgId: org.id,
  });
  if (!allowed) {
    notFound();
  }

  const invoices = await listInvoices(actor, org.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-slate-600">
          One invoice per billing period, newest first.
        </p>
      </header>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Organizations on the free plan are never invoiced."
        />
      ) : (
        <InvoiceTable invoices={invoices} />
      )}
    </div>
  );
}
