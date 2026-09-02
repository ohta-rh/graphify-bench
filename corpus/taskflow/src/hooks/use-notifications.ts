"use client";

/**
 * Client-side notification list state for the bell and inbox.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { NotificationId, OrgId } from "@/types/common";
import type { Notification } from "@/types/notification";
export function useNotifications(orgId: OrgId): { notifications: readonly Notification[]; unreadCount: number; markRead: (id: NotificationId) => void; markAllRead: () => void } {
  throw new Error("stub: src/hooks/use-notifications.ts");
}
