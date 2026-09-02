"use client";

/**
 * Inbox list with read/unread affordances.
 */
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/date";
import type { NotificationId } from "@/types/common";
import type { Notification } from "@/types/notification";
import type { ReactElement } from "react";

export type NotificationListProps = {
  notifications: readonly Notification[];
  onMarkRead: (id: NotificationId) => void;
  onMarkAllRead: () => void;
};

/** Unread first, then newest first — the inbox ordering people expect. */
export function orderInbox(
  notifications: readonly Notification[],
): readonly Notification[] {
  return [...notifications].sort((a, b) => {
    const byRead = Number(a.readAt !== null) - Number(b.readAt !== null);
    if (byRead !== 0) return byRead;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function NotificationList(
  props: NotificationListProps,
): ReactElement | null {
  const { notifications, onMarkRead, onMarkAllRead } = props;

  if (notifications.length === 0) {
    return (
      <EmptyState
        title="You are all caught up"
        description="Assignments, mentions and status changes land here."
      />
    );
  }

  const ordered = orderInbox(notifications);
  const unread = ordered.filter((n) => n.readAt === null).length;

  return (
    <section className="notification-list space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-neutral-500">{unread} unread</span>
        <Button
          variant="ghost"
          size="sm"
          disabled={unread === 0}
          onClick={onMarkAllRead}
        >
          Mark all read
        </Button>
      </div>

      <ul className="divide-y">
        {ordered.map((notification) => (
          <li
            key={notification.id}
            className={cn(
              "flex items-start justify-between gap-3 py-2",
              notification.readAt === null && "bg-indigo-50/50",
            )}
          >
            <Link href={notification.href} className="min-w-0 flex-1">
              <span className="block text-sm font-medium">
                {notification.title}
              </span>
              <span className="block text-sm text-neutral-600">
                {notification.body}
              </span>
              <span className="block text-xs text-neutral-500">
                {formatRelative(notification.createdAt)}
              </span>
            </Link>

            {notification.readAt === null ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkRead(notification.id)}
              >
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
