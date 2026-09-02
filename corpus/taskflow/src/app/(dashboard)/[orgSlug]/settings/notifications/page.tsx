/**
 * Notification preference matrix.
 *
 * Owner D. One row per `NotificationKind`, three columns (in-app, email,
 * digest). The digest column only means anything while the `digest_email` flag
 * is on, so the flag decides whether it is rendered at all.
 *
 * Must call (do not reimplement): isEnabled
 */

import type { Metadata } from "next";
import { updateNotificationPreferenceAction } from "@/actions/notifications/update-preferences";
import { NotificationPreferencesForm } from "@/components/domain/notification/notification-preferences-form";
import { isEnabled } from "@/lib/feature-flags";
import { listPreferences } from "@/server/repositories/notification-preference-repository";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { loadTenantContext } from "../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notification preferences",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor, flags } = await loadTenantContext(orgSlug);

  const digestEnabled = isEnabled("digest_email", buildFlagContext(actor, org));

  // Preferences are per-user rows with no rule attached; `NotificationService`
  // owns the write path, and the read goes straight to the repository.
  const preferences = await listPreferences(org.id, actor.userId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-slate-600">
          How you want to hear about things happening in {org.name}.
          {digestEnabled
            ? " Anything marked digest-only is bundled into one email a day."
            : " The daily digest is not part of this plan."}
        </p>
      </header>

      <NotificationPreferencesForm
        orgId={org.id}
        userId={actor.userId}
        preferences={preferences}
        flags={flags}
        onSubmit={updateNotificationPreferenceAction}
      />
    </div>
  );
}
