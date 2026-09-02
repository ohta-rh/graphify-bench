/**
 * Credential login, registration and password reset. No third-party provider.
 *
 * STUB — owner C. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): hashPassword, verifyPassword, consumeRateLimit, emit
 */
import type { LoginInput, PasswordResetConfirmInput, PasswordResetRequestInput, RegisterInput } from "@/schemas/auth";
import type { SessionId } from "@/types/common";
import type { User } from "@/types/member";
import type { Organization } from "@/types/organization";
export async function register(input: RegisterInput): Promise<{ user: User; org: Organization }> {
  throw new Error("stub: src/server/services/auth-service.ts");
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  throw new Error("stub: src/server/services/auth-service.ts");
}

export async function logout(sessionId: SessionId): Promise<void> {
  throw new Error("stub: src/server/services/auth-service.ts");
}

export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
  throw new Error("stub: src/server/services/auth-service.ts");
}

export async function confirmPasswordReset(input: PasswordResetConfirmInput): Promise<User> {
  throw new Error("stub: src/server/services/auth-service.ts");
}
