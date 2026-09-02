/**
 * Public plan grid built from `PLAN_LIMITS`.
 *
 * Owner D. Every number on this page is read from `@/config/plan-limits` at
 * render time — the marketing copy and the runtime quota can therefore never
 * drift apart, which is the whole reason the limits live in one table.
 *
 * Must call (do not reimplement): getPlanLimits
 */

import { getPlanLimits, UNLIMITED } from "@/config/plan-limits";
import { PLAN_IDS, type PlanId } from "@/types/billing";

/**
 * Marketing-only number formatting. `@/lib/format` is the app-side helper, but
 * this tree is prerendered and intentionally free of runtime dependencies.
 */
function priceLabel(centsPerSeat: number): string {
  if (centsPerSeat === 0) return "Free";
  return `$${(centsPerSeat / 100).toFixed(0)} / seat / month`;
}

function quotaLabel(value: number): string {
  return value === UNLIMITED ? "Unlimited" : value.toLocaleString("en-US");
}

const PLAN_BLURBS: Readonly<Record<PlanId, string>> = {
  free: "Everything you need to track one or two side projects.",
  starter: "For a small team that has outgrown a shared spreadsheet.",
  growth: "Kanban, webhooks and CSV export for a scaling org.",
  enterprise: "Unlimited everything, with the audit trail to match.",
};

export function PricingGrid() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {PLAN_IDS.map((plan) => {
        const limits = getPlanLimits(plan);

        return (
          <section
            key={plan}
            className="flex flex-col rounded-lg border border-slate-200 bg-white p-6"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {plan}
            </h3>
            <p className="mt-2 text-2xl font-semibold">
              {priceLabel(limits.priceCentsPerSeatMonthly)}
            </p>
            <p className="mt-2 text-sm text-slate-600">{PLAN_BLURBS[plan]}</p>

            <dl className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Seats</dt>
                <dd>{quotaLabel(limits.seats)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Projects</dt>
                <dd>{quotaLabel(limits.projects)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Issues / project</dt>
                <dd>{quotaLabel(limits.issuesPerProject)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Storage</dt>
                <dd>{quotaLabel(limits.storageMb)} MB</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Webhooks</dt>
                <dd>{quotaLabel(limits.webhooks)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">History</dt>
                <dd>{quotaLabel(limits.retentionDays)} days</dd>
              </div>
            </dl>

            <ul className="mt-6 space-y-1 text-sm text-slate-600">
              {limits.includedFlags.map((flag) => (
                <li key={flag}>{flag.replaceAll("_", " ")}</li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
