/**
 * Default content of the side panel slot.
 *
 * Owner D. Matches `/[orgSlug]`, so the overview page gets an activity rail
 * alongside it. The feed is a separate render tree from the main page, which is
 * the point of the parallel route: a slow activity query cannot hold up the
 * overview.
 *
 * The panel is `activity_feed`-gated; when the flag is off it renders nothing
 * and the aside collapses.
 */

import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { groupByDay, listActivity } from "@/server/services/activity-service";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

const PANEL_ACTIVITY_LIMIT = 15;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  if (!isEnabled("activity_feed", buildFlagContext(actor, org))) {
    return null;
  }
  if (!can(actor, "activity:read", { kind: "activity", orgId: org.id })) {
    return null;
  }

  const page = await listActivity(actor, {
    orgId: org.id,
    limit: PANEL_ACTIVITY_LIMIT,
  });
  const groups = groupByDay(page.items);

  return (
    <section className="p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Recent activity
      </h2>

      <div className="mt-4 space-y-6">
        {groups.map((group) => (
          <div key={group.day}>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {group.day}
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              {group.events.map((event) => (
                <li key={event.id}>{event.summary}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
