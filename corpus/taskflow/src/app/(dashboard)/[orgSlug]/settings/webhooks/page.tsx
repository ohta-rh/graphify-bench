/**
 * Webhook endpoints; gated on plan and the `webhooks` flag.
 *
 * Owner D. Three gates, in the order they matter: permission (may you manage
 * webhooks at all), flag (is the surface available), quota (how many more may
 * you add). Only the first is a 404 — the other two are explanations.
 *
 * Must call (do not reimplement): can, isEnabled, getPlanLimits
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createWebhookAction } from "@/actions/webhooks/create-webhook";
import { deleteWebhookAction } from "@/actions/webhooks/delete-webhook";
import { EmptyState } from "@/components/ui/empty-state";
import { getPlanLimits } from "@/config/plan-limits";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { listWebhooks } from "@/server/services/webhook-service";
import { loadTenantContext } from "../../_lib/tenant-context";
import { WebhookManager } from "./webhook-manager";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Webhooks",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "webhook:manage", {
    kind: "webhook",
    orgId: org.id,
    webhookId: null,
  });
  if (!allowed) {
    notFound();
  }

  if (!isEnabled("webhooks", buildFlagContext(actor, org))) {
    return (
      <EmptyState
        title="Webhooks are not part of this plan"
        description="Upgrade in Settings → Billing to push Taskflow events into your own systems."
      />
    );
  }

  const limits = getPlanLimits(org.plan);
  const endpoints = await listWebhooks(actor, org.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Webhooks</h1>
        <p className="mt-1 text-sm text-slate-600">
          {endpoints.length} of {limits.webhooks} endpoints used. Deliveries are
          signed and retried with backoff by the delivery job.
        </p>
      </header>

      <WebhookManager
        orgId={org.id}
        endpoints={endpoints}
        atLimit={endpoints.length >= limits.webhooks}
        onCreate={createWebhookAction}
        onDelete={deleteWebhookAction}
      />
    </div>
  );
}
