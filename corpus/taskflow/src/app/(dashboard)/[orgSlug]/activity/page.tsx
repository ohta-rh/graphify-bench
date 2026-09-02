/**
 * Organization activity feed; requires `activity:read` and the `activity_feed`
 * flag.
 *
 * Owner D. Two gates that fail differently on purpose: a missing permission is
 * a 404 (the page should not exist for you), a disabled flag is an explanation
 * (the page exists, your plan does not include it).
 *
 * Must call (do not reimplement): can, isEnabled
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ActivityFeed } from "@/components/domain/activity/activity-feed";
import { EmptyState } from "@/components/ui/empty-state";
import { isEnabled } from "@/lib/feature-flags";
import { can } from "@/lib/permissions";
import { groupByDay, listActivity } from "@/server/services/activity-service";
import { buildFlagContext } from "@/server/services/feature-flag-service";
import { listMembers } from "@/server/services/member-service";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import type { User } from "@/types/member";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
};

const MEMBER_LOOKUP_LIMIT = 100;

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  if (!can(actor, "activity:read", { kind: "activity", orgId: org.id })) {
    notFound();
  }

  if (!isEnabled("activity_feed", buildFlagContext(actor, org))) {
    return (
      <EmptyState
        title="The activity feed is not part of this plan"
        description="Upgrade in Settings → Billing to keep an audit trail of every change."
      />
    );
  }

  const pagination = searchParamsPaginationSchema.parse(search);

  const [page, members] = await Promise.all([
    listActivity(actor, {
      orgId: org.id,
      limit: pagination.perPage,
      cursor: pagination.cursor ?? null,
    }),
    listMembers(actor, { orgId: org.id, limit: MEMBER_LOOKUP_LIMIT }),
  ]);

  const actors: Record<string, User> = {};
  for (const member of members.items) {
    actors[member.userId] = member.user;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every change made in {org.name}, newest first.
        </p>
      </header>

      <ActivityFeed groups={groupByDay(page.items)} actors={actors} actor={actor} />
    </div>
  );
}
