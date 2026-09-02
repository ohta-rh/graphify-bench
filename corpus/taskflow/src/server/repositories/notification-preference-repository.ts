/**
 * Per-user, per-kind delivery matrix consulted before every fan-out.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { UpdateNotificationPreferenceInput } from "@/schemas/notification";
import type { OrgId, UserId } from "@/types/common";
import type { NotificationKind, NotificationPreference } from "@/types/notification";
export async function listPreferences(orgId: OrgId, userId: UserId): Promise<readonly NotificationPreference[]> {
  throw new Error("stub: src/server/repositories/notification-preference-repository.ts");
}

export async function getPreference(orgId: OrgId, userId: UserId, kind: NotificationKind): Promise<NotificationPreference | null> {
  throw new Error("stub: src/server/repositories/notification-preference-repository.ts");
}

export async function upsertPreference(input: UpdateNotificationPreferenceInput): Promise<NotificationPreference> {
  throw new Error("stub: src/server/repositories/notification-preference-repository.ts");
}

export async function listDigestSubscribers(orgId: OrgId): Promise<readonly UserId[]> {
  throw new Error("stub: src/server/repositories/notification-preference-repository.ts");
}
