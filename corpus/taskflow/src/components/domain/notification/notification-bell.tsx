"use client";

/**
 * Header bell with an unread badge.
 */
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { orgPath } from "@/lib/url";
import type { ReactElement } from "react";

export type NotificationBellProps = {
  unreadCount: number;
  orgSlug: string;
};

/** Past this the badge stops being a number and starts being a mood. */
export const UNREAD_BADGE_CAP = 99;

export function formatUnreadBadge(count: number): string {
  return count > UNREAD_BADGE_CAP ? `${UNREAD_BADGE_CAP}+` : String(count);
}

export function NotificationBell(
  props: NotificationBellProps,
): ReactElement | null {
  const { unreadCount, orgSlug } = props;
  const hasUnread = unreadCount > 0;

  return (
    <Link
      href={orgPath(orgSlug, "notifications")}
      aria-label={
        hasUnread ? `${unreadCount} unread notifications` : "Notifications"
      }
      className="relative inline-flex items-center rounded p-1 hover:bg-neutral-100"
    >
      <span aria-hidden="true">🔔</span>
      {hasUnread ? (
        <span className="absolute -right-1 -top-1">
          <Badge tone="danger" size="sm">
            {formatUnreadBadge(unreadCount)}
          </Badge>
        </span>
      ) : null}
    </Link>
  );
}
