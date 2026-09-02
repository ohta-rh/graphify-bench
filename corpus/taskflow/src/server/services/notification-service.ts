/**
 * The fan-out hub: one domain event becomes in-app rows, an email draft and/or a digest entry, filtered by each recipient's preferences.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, isEnabled, subscribe
 */
import type { ListNotificationsInput, MarkNotificationReadInput, UpdateNotificationPreferenceInput } from "@/schemas/notification";
import type { OrgId, Page, UserId } from "@/types/common";
import type { FlagContext } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type { Notification, NotificationChannel, NotificationKind, NotificationPreference } from "@/types/notification";
export async function notify(orgId: OrgId, kind: NotificationKind, recipients: readonly UserId[], payload: NotificationPayload): Promise<readonly Notification[]> {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export async function listNotifications(actor: Actor, input: ListNotificationsInput): Promise<Page<Notification>> {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export async function markRead(actor: Actor, input: MarkNotificationReadInput): Promise<Notification> {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export async function markAllRead(actor: Actor, orgId: OrgId): Promise<number> {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export async function updatePreference(actor: Actor, input: UpdateNotificationPreferenceInput): Promise<NotificationPreference> {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export function resolveChannels(preference: NotificationPreference | null, flags: FlagContext): readonly NotificationChannel[] {
  throw new Error("stub: src/server/services/notification-service.ts");
}

export type NotificationPayload = { title: string; body: string; href: string; actorId: UserId | null };
