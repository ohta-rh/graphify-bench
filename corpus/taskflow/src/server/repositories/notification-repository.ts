/**
 * In-app notification rows and unread counters.
 */
import { and, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, notifications } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { orgPredicate } from "./base-repository";
import { compact, keysetPredicate, probeLimit, toPage } from "./_paging";
import { toNotification } from "./_mappers";
import type { ListNotificationsInput } from "@/schemas/notification";
import type {
  IsoTimestamp,
  NotificationId,
  OrgId,
  Page,
  UserId,
} from "@/types/common";
import type { Notification } from "@/types/notification";

type NewNotification = Omit<
  Notification,
  "id" | "createdAt" | "updatedAt" | "readAt"
>;

export async function listNotifications(
  input: ListNotificationsInput,
): Promise<Page<Notification>> {
  const db = getDb();
  const sort = { sortColumn: notifications.createdAt, idColumn: notifications.id };

  const filters = compact(
    orgPredicate(notifications.orgId, input.orgId),
    eq(notifications.recipientId, input.recipientId),
    input.unreadOnly ? isNull(notifications.readAt) : undefined,
    input.kind === undefined || input.kind.length === 0
      ? undefined
      : inArray(notifications.kind, [...input.kind]),
  );

  const total = db
    .select({ value: count() })
    .from(notifications)
    .where(and(...filters))
    .get();

  const rows = db
    .select()
    .from(notifications)
    .where(and(...filters, ...compact(keysetPredicate(sort, input.cursor))))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(probeLimit(input.limit))
    .all();

  return toPage(rows, input.limit, total?.value ?? 0, toNotification, (row) => ({
    id: row.id,
    sortValue: row.createdAt,
  }));
}

/** Powers the bell badge, so it stays a single indexed count query. */
export async function countUnread(
  orgId: OrgId,
  recipientId: UserId,
): Promise<number> {
  const row = getDb()
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        orgPredicate(notifications.orgId, orgId),
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
      ),
    )
    .get();
  return row?.value ?? 0;
}

export async function insertNotification(
  orgId: OrgId,
  input: NewNotification,
): Promise<Notification> {
  const inserted = await insertNotifications(orgId, [input]);
  const row = inserted.at(0);
  if (!row) throw new Error("Notification insert produced no row");
  return row;
}

/** Bulk insert used by the fan-out; one statement per recipient batch. */
export async function insertNotifications(
  orgId: OrgId,
  inputs: readonly NewNotification[],
): Promise<readonly Notification[]> {
  if (inputs.length === 0) return [];

  const stamp = toIsoTimestamp(new Date());
  const rows = getDb()
    .insert(notifications)
    .values(
      inputs.map((input) => ({
        id: newId(),
        orgId,
        recipientId: input.recipientId,
        kind: input.kind,
        title: input.title,
        body: input.body,
        href: input.href,
        actorId: input.actorId,
        readAt: null,
        channels: JSON.stringify(input.channels),
        createdAt: stamp,
        updatedAt: stamp,
      })),
    )
    .returning()
    .all();

  return rows.map(toNotification);
}

export async function markRead(
  orgId: OrgId,
  notificationId: NotificationId,
  at: IsoTimestamp,
): Promise<Notification> {
  const row = getDb()
    .update(notifications)
    .set({ readAt: at, updatedAt: at })
    .where(
      and(
        orgPredicate(notifications.orgId, orgId),
        eq(notifications.id, notificationId),
      ),
    )
    .returning()
    .get();

  if (!row) throw new Error(`Notification ${notificationId} not found`);
  return toNotification(row);
}

export async function markAllRead(
  orgId: OrgId,
  recipientId: UserId,
  at: IsoTimestamp,
): Promise<number> {
  const rows = getDb()
    .update(notifications)
    .set({ readAt: at, updatedAt: at })
    .where(
      and(
        orgPredicate(notifications.orgId, orgId),
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
      ),
    )
    .returning({ id: notifications.id })
    .all();

  return rows.length;
}

/** The digest window query: everything still unread since `since`. */
export async function listUnreadSince(
  orgId: OrgId,
  recipientId: UserId,
  since: IsoTimestamp,
): Promise<readonly Notification[]> {
  const rows = getDb()
    .select()
    .from(notifications)
    .where(
      and(
        orgPredicate(notifications.orgId, orgId),
        eq(notifications.recipientId, recipientId),
        isNull(notifications.readAt),
        gte(notifications.createdAt, since),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .all();

  return rows.map(toNotification);
}
