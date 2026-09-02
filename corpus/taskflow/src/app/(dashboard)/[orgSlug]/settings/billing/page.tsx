/**
 * Plan, seats and usage meters.
 *
 * Owner D. The plan cards are rendered from `PLAN_LIMITS` and the meters from
 * the live `BillingSummary`, so what the page promises and what the quota
 * guards enforce come from the same table.
 *
 * Must call (do not reimplement): can, getPlanLimits
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { BillingPlanCard } from "@/components/domain/billing/billing-plan-card";
import { UsagePanel } from "@/components/domain/billing/usage-panel";
import { getPlanLimits } from "@/config/plan-limits";
import { can } from "@/lib/permissions";
import { getBillingSummary } from "@/server/services/billing-service";
import { changePlanAction } from "@/actions/billing/change-plan";
import { PLAN_IDS, type PlanId } from "@/types/billing";
import { loadTenantContext } from "../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing",
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

  const summary = await getBillingSummary(actor, org.id);

  async function selectPlan(plan: PlanId): Promise<void> {
    "use server";
    await changePlanAction({ orgId: org.id, plan, interval: "monthly" });
  }

  return (
    <div className="space-y-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-slate-600">
            {summary.subscription.seats} seats on the {org.plan} plan,{" "}
            {summary.subscription.status}.
          </p>
        </div>
        <Link
          href={`/${orgSlug}/settings/billing/invoices`}
          className="text-sm text-indigo-600"
        >
          Invoices
        </Link>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Usage
        </h2>
        <UsagePanel summary={summary} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Plans
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PLAN_IDS.map((plan) => (
            <BillingPlanCard
              key={plan}
              plan={plan}
              limits={getPlanLimits(plan)}
              current={plan === org.plan}
              actor={actor}
              onSelect={selectPlan}
            />
          ))}
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Downgrading is refused while usage still exceeds the target plan —
          free up seats or projects first.
        </p>
      </section>
    </div>
  );
}
