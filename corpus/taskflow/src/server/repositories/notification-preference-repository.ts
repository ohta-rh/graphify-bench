/**
 * Per-user, per-kind delivery matrix consulted before every fan-out.
 */
import { and, eq } from "drizzle-orm";
import { getDb, notificationPreferences } from "@/server/db";
import { orgPredicate } from "./base-repository";
import { brandId, toPreference } from "./_mappers";
import type { UpdateNotificationPreferenceInput } from "@/schemas/notification";
import type { OrgId, UserId } from "@/types/common";
import type {
  NotificationKind,
  NotificationPreference,
} from "@/types/notification";

export async function listPreferences(
  orgId: OrgId,
  userId: UserId,
): Promise<readonly NotificationPreference[]> {
  const rows = getDb()
    .select()
    .from(notificationPreferences)
    .where(
      and(
        orgPredicate(notificationPreferences.orgId, orgId),
        eq(notificationPreferences.userId, userId),
      ),
    )
    .all();
  return rows.map(toPreference);
}

/**
 * `null` means "no explicit row" — the fan-out then falls back to the default
 * channel set rather than treating the absence as "everything off".
 */
export async function getPreference(
  orgId: OrgId,
  userId: UserId,
  kind: NotificationKind,
): Promise<NotificationPreference | null> {
  const row = getDb()
    .select()
    .from(notificationPreferences)
    .where(
      and(
        orgPredicate(notificationPreferences.orgId, orgId),
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.kind, kind),
      ),
    )
    .get();
  return row ? toPreference(row) : null;
}

export async function upsertPreference(
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  const row = getDb()
    .insert(notificationPreferences)
    .values({
      orgId: input.orgId,
      userId: input.userId,
      kind: input.kind,
      inApp: input.inApp,
      email: input.email,
      digestOnly: input.digestOnly,
    })
    .onConflictDoUpdate({
      target: [
        notificationPreferences.orgId,
        notificationPreferences.userId,
        notificationPreferences.kind,
      ],
      set: {
        inApp: input.inApp,
        email: input.email,
        digestOnly: input.digestOnly,
      },
    })
    .returning()
    .get();

  return toPreference(row);
}

/** Distinct users with at least one `digestOnly` preference in this org. */
export async function listDigestSubscribers(
  orgId: OrgId,
): Promise<readonly UserId[]> {
  const rows = getDb()
    .selectDistinct({ userId: notificationPreferences.userId })
    .from(notificationPreferences)
    .where(
      and(
        orgPredicate(notificationPreferences.orgId, orgId),
        eq(notificationPreferences.digestOnly, true),
      ),
    )
    .all();

  return rows.map((row) => brandId<UserId>(row.userId));
}
