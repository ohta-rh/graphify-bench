/**
 * Notification panel rendered into the `@panel` slot.
 *
 * Owner D. Matches `/[orgSlug]/notifications`, so opening notifications keeps
 * whatever page is already in the main column instead of navigating away from
 * it — the reason this slot exists at all.
 */

import Link from "next/link";
import { can } from "@/lib/permissions";
import { listNotifications } from "@/server/services/notification-service";
import { loadTenantContext } from "../../_lib/tenant-context";

type PageParams = { orgSlug: string };

export const dynamic = "force-dynamic";

const PANEL_NOTIFICATION_LIMIT = 20;

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
    return null;
  }

  const page = await listNotifications(actor, {
    orgId: org.id,
    recipientId: actor.userId,
    unreadOnly: search.unread === "1",
    limit: PANEL_NOTIFICATION_LIMIT,
  });

  return (
    <section className="p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Notifications
        </h2>
        <Link href={`/${orgSlug}/inbox`} className="text-xs text-indigo-600">
          Open inbox
        </Link>
      </div>

      <ul className="mt-4 space-y-3">
        {page.items.map((notification) => (
          <li key={notification.id}>
            <Link href={notification.href} className="block text-sm">
              <span
                className={
                  notification.readAt === null
                    ? "font-medium text-slate-900"
                    : "text-slate-600"
                }
              >
                {notification.title}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {notification.body}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
