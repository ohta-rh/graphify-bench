/**
 * Notification inbox.
 *
 * Owner D. The list component receives the two mutations as props rather than
 * importing the actions itself — that keeps `src/components/domain` free of any
 * dependency on the action layer.
 *
 * Must call (do not reimplement): can
 */

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NotificationList } from "@/components/domain/notification/notification-list";
import { markAllNotificationsReadAction } from "@/actions/notifications/mark-all-read";
import { markNotificationReadAction } from "@/actions/notifications/mark-read";
import { can } from "@/lib/permissions";
import { listNotifications } from "@/server/services/notification-service";
import { searchParamsPaginationSchema } from "@/schemas/pagination";
import type { NotificationId } from "@/types/common";
import { loadTenantContext } from "../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inbox",
};

export default async function Page(props: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next.js 16: params and searchParams are Promises and MUST be awaited.
  const { orgSlug } = await props.params;
  const search = await props.searchParams;

  const { org, actor } = await loadTenantContext(orgSlug);

  const allowed = can(actor, "notification:read", {
    kind: "notification",
    orgId: org.id,
    recipientId: actor.userId,
  });
  if (!allowed) {
    notFound();
  }

  const pagination = searchParamsPaginationSchema.parse(search);
  const unreadOnly = search.filter === "unread";

  const page = await listNotifications(actor, {
    orgId: org.id,
    recipientId: actor.userId,
    unreadOnly,
    limit: pagination.perPage,
    cursor: pagination.cursor ?? null,
  });

  async function markRead(notificationId: NotificationId): Promise<void> {
    "use server";
    await markNotificationReadAction({ orgId: org.id, notificationId });
  }

  async function markAllRead(): Promise<void> {
    "use server";
    await markAllNotificationsReadAction({ orgId: org.id });
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="mt-1 text-sm text-slate-600">
          {page.total} {unreadOnly ? "unread" : "total"} notifications
        </p>
      </header>

      <NotificationList
        notifications={page.items}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
      />
    </div>
  );
}
