"use client";

/**
 * Inbox list with read/unread affordances.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { NotificationId } from "@/types/common";
import type { Notification } from "@/types/notification";
import type { ReactElement } from "react";
export type NotificationListProps = { notifications: readonly Notification[]; onMarkRead: (id: NotificationId) => void; onMarkAllRead: () => void };

export function NotificationList(props: NotificationListProps): ReactElement | null {
  return null;
}
