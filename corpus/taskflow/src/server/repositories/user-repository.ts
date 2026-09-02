/**
 * Global user rows. The only repository that is NOT tenant scoped — users exist across organizations.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { UpdateProfileInput } from "@/schemas/member";
import type { UserId } from "@/types/common";
import type { User } from "@/types/member";
export async function findUserById(userId: UserId): Promise<User | null> {
  throw new Error("stub: src/server/repositories/user-repository.ts");
}

export async function findUserByEmail(email: string): Promise<User | null> {
  throw new Error("stub: src/server/repositories/user-repository.ts");
}

export async function insertUser(input: { email: string; name: string; passwordHash: string }): Promise<User> {
  throw new Error("stub: src/server/repositories/user-repository.ts");
}

export async function updateUser(userId: UserId, patch: UpdateProfileInput): Promise<User> {
  throw new Error("stub: src/server/repositories/user-repository.ts");
}

export async function findUsersByIds(userIds: readonly UserId[]): Promise<readonly User[]> {
  throw new Error("stub: src/server/repositories/user-repository.ts");
}
