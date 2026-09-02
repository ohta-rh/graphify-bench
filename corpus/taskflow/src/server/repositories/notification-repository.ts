/**
 * In-app notification rows and unread counters.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ListNotificationsInput } from "@/schemas/notification";
import type { IsoTimestamp, NotificationId, OrgId, Page, UserId } from "@/types/common";
import type { Notification } from "@/types/notification";
export async function listNotifications(input: ListNotificationsInput): Promise<Page<Notification>> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function countUnread(orgId: OrgId, recipientId: UserId): Promise<number> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function insertNotification(orgId: OrgId, input: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>): Promise<Notification> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function insertNotifications(orgId: OrgId, inputs: readonly Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>[]): Promise<readonly Notification[]> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function markRead(orgId: OrgId, notificationId: NotificationId, at: IsoTimestamp): Promise<Notification> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function markAllRead(orgId: OrgId, recipientId: UserId, at: IsoTimestamp): Promise<number> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}

export async function listUnreadSince(orgId: OrgId, recipientId: UserId, since: IsoTimestamp): Promise<readonly Notification[]> {
  throw new Error("stub: src/server/repositories/notification-repository.ts");
}
