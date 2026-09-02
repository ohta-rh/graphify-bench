/**
 * Global user rows. The only repository that is NOT tenant scoped — users exist across organizations.
 */
import { eq, inArray } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, users } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { toUser } from "./_mappers";
import type { UpdateProfileInput } from "@/schemas/member";
import type { UserId } from "@/types/common";
import type { User } from "@/types/member";

export async function findUserById(userId: UserId): Promise<User | null> {
  const rows = getDb().select().from(users).where(eq(users.id, userId)).all();
  const row = rows.at(0);
  return row ? toUser(row) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = getDb()
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .all();
  const row = rows.at(0);
  return row ? toUser(row) : null;
}

export async function insertUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<User> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(users)
    .values({
      id: newId(),
      email: input.email.toLowerCase(),
      name: input.name,
      passwordHash: input.passwordHash,
      avatarUrl: null,
      timezone: "UTC",
      emailVerifiedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return toUser(row);
}

export async function updateUser(
  userId: UserId,
  patch: UpdateProfileInput,
): Promise<User> {
  const row = getDb()
    .update(users)
    .set({
      ...(patch.name === undefined ? {} : { name: patch.name }),
      ...(patch.avatarUrl === undefined ? {} : { avatarUrl: patch.avatarUrl }),
      ...(patch.timezone === undefined ? {} : { timezone: patch.timezone }),
      updatedAt: toIsoTimestamp(new Date()),
    })
    .where(eq(users.id, userId))
    .returning()
    .get();

  if (!row) throw new Error(`User ${userId} not found`);
  return toUser(row);
}

/**
 * The password hash never travels on the `User` domain type — nothing outside
 * `AuthService` may see it — so login reads it through this narrow accessor.
 *
 * Not in the manifest: added because `User` deliberately omits the column and
 * credential login has no other way to reach it.
 */
export async function findPasswordHash(
  userId: UserId,
): Promise<string | null> {
  const row = getDb()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return row?.passwordHash ?? null;
}

/** Counterpart of `findPasswordHash`, used by the password-reset flow. */
export async function updatePasswordHash(
  userId: UserId,
  passwordHash: string,
): Promise<void> {
  getDb()
    .update(users)
    .set({ passwordHash, updatedAt: toIsoTimestamp(new Date()) })
    .where(eq(users.id, userId))
    .run();
}

/** Batch fetch used by every list view that decorates rows with their author. */
export async function findUsersByIds(
  userIds: readonly UserId[],
): Promise<readonly User[]> {
  if (userIds.length === 0) return [];
  const rows = getDb()
    .select()
    .from(users)
    .where(inArray(users.id, [...userIds]))
    .all();
  return rows.map(toUser);
}
