/**
 * Password-reset tokens.
 *
 * Private to the repository layer and absent from `corpus-manifest.json`: the
 * `password_reset_tokens` table exists in the frozen schema but no manifest
 * entry owns it, and `AuthService` cannot implement a real reset flow without
 * somewhere to keep the single-use token.
 */
import { and, eq, gt, isNull } from "drizzle-orm";
import { newId } from "@/lib/id";
import { getDb, passwordResetTokens } from "@/server/db";
import { toIsoTimestamp } from "@/types/common";
import { brandId } from "./_mappers";
import type { IsoTimestamp, UserId } from "@/types/common";

export interface ResetToken {
  readonly id: string;
  readonly userId: UserId;
  readonly expiresAt: IsoTimestamp;
}

export async function issueResetToken(
  userId: UserId,
  tokenHash: string,
  expiresAt: IsoTimestamp,
): Promise<ResetToken> {
  const stamp = toIsoTimestamp(new Date());
  const row = getDb()
    .insert(passwordResetTokens)
    .values({
      id: newId(),
      userId,
      tokenHash,
      expiresAt,
      usedAt: null,
      createdAt: stamp,
      updatedAt: stamp,
    })
    .returning()
    .get();

  return {
    id: row.id,
    userId: brandId<UserId>(row.userId),
    expiresAt: toIsoTimestamp(row.expiresAt),
  };
}

/** Returns the token only while it is unused and unexpired. */
export async function findLiveResetToken(
  tokenHash: string,
): Promise<ResetToken | null> {
  const row = getDb()
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date().toISOString()),
      ),
    )
    .get();

  if (!row) return null;

  return {
    id: row.id,
    userId: brandId<UserId>(row.userId),
    expiresAt: toIsoTimestamp(row.expiresAt),
  };
}

/** Single use: consuming a token is what stops a reset link being replayed. */
export async function consumeResetToken(id: string): Promise<void> {
  const stamp = toIsoTimestamp(new Date());
  getDb()
    .update(passwordResetTokens)
    .set({ usedAt: stamp, updatedAt: stamp })
    .where(eq(passwordResetTokens.id, id))
    .run();
}
