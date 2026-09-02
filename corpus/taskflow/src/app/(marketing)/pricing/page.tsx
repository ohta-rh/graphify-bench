/**
 * Public pricing page rendered from `PLAN_LIMITS`.
 *
 * Owner D. Static. The table is generated from the same constants the runtime
 * quota guards read, so a limit change ships to both at once.
 *
 * Must call (do not reimplement): getPlanLimits
 */

import type { Metadata } from "next";
import { getPlanLimits } from "@/config/plan-limits";
import { PricingGrid } from "../_components/pricing-grid";

type PageParams = Record<string, never>;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Per-seat pricing for Taskflow, from free to enterprise.",
};

export default async function Page(props: { params: Promise<PageParams> }) {
  // Next.js 16: params is a Promise and MUST be awaited. `searchParams` is not
  // accepted, so the whole marketing tree stays prerendered.
  await props.params;

  const enterprise = getPlanLimits("enterprise");

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <header className="mb-12 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          Pay for the seats you use
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Every plan includes the full issue tracker. Higher plans lift quotas
          and unlock the optional surfaces — the board, webhooks, CSV export.
          Enterprise keeps {enterprise.retentionDays} days of history.
        </p>
      </header>

      <PricingGrid />
    </main>
  );
}
