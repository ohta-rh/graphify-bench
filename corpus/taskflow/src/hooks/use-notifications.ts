"use client";

/**
 * Client-side notification list state for the bell and inbox.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { NotificationId, OrgId } from "@/types/common";
import type { Notification } from "@/types/notification";
import {
  EMPTY_NOTIFICATIONS,
  countUnread,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
} from "./notification-store";

export function useNotifications(orgId: OrgId): {
  notifications: readonly Notification[];
  unreadCount: number;
  markRead: (id: NotificationId) => void;
  markAllRead: () => void;
} {
  const read = useCallback(() => getNotifications(orgId), [orgId]);
  const notifications = useSyncExternalStore(
    subscribeNotifications,
    read,
    () => EMPTY_NOTIFICATIONS,
  );

  const unreadCount = useMemo(
    () => countUnread(notifications),
    [notifications],
  );

  const markRead = useCallback(
    (id: NotificationId) => markNotificationRead(orgId, id),
    [orgId],
  );
  const markAllRead = useCallback(
    () => markAllNotificationsRead(orgId),
    [orgId],
  );

  return { notifications, unreadCount, markRead, markAllRead };
}
