/**
 * Client-side notification cache, keyed by organization.
 *
 * The bell in the top bar and the inbox list are rendered in different parts
 * of the tree but must agree on the unread count the instant something is
 * marked read. A per-org external store gives them one copy of the truth
 * between server revalidations; switching tenants simply reads a different
 * key rather than leaking rows across the boundary.
 */
import { toIsoTimestamp } from "@/types/common";
import type { NotificationId, OrgId } from "@/types/common";
import type { Notification } from "@/types/notification";

type Listener = () => void;

const byOrg = new Map<string, readonly Notification[]>();
const listeners = new Set<Listener>();

export const EMPTY_NOTIFICATIONS: readonly Notification[] = [];

function publish(): void {
  for (const listener of listeners) listener();
}

export function subscribeNotifications(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getNotifications(orgId: OrgId): readonly Notification[] {
  return byOrg.get(orgId) ?? EMPTY_NOTIFICATIONS;
}

/** Seeds the store from a server-rendered list. */
export function hydrateNotifications(
  orgId: OrgId,
  notifications: readonly Notification[],
): void {
  byOrg.set(orgId, notifications);
  publish();
}

export function countUnread(notifications: readonly Notification[]): number {
  return notifications.reduce(
    (total, notification) => (notification.readAt === null ? total + 1 : total),
    0,
  );
}

export function markNotificationRead(
  orgId: OrgId,
  notificationId: NotificationId,
): void {
  const current = getNotifications(orgId);
  const readAt = toIsoTimestamp(new Date());
  byOrg.set(
    orgId,
    current.map((notification) =>
      notification.id === notificationId && notification.readAt === null
        ? { ...notification, readAt }
        : notification,
    ),
  );
  publish();
}

export function markAllNotificationsRead(orgId: OrgId): void {
  const current = getNotifications(orgId);
  const readAt = toIsoTimestamp(new Date());
  byOrg.set(
    orgId,
    current.map((notification) =>
      notification.readAt === null ? { ...notification, readAt } : notification,
    ),
  );
  publish();
}

/** Test seam: forgets every cached tenant. */
export function resetNotifications(): void {
  byOrg.clear();
  publish();
}
