/** Password policy and the confirm-password refinement. */
import { describe, expect, it } from "vitest";
import {
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  registerSchema,
} from "@/schemas/auth";

const VALID_PASSWORD = "Correct1Horse2";

function register(overrides: Record<string, unknown> = {}) {
  return {
    name: "Alice Alvarez",
    email: "Alice@Example.com",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    acceptTerms: true,
    ...overrides,
  };
}

describe("schemas/auth", () => {
  it("lowercases the email on login and defaults rememberMe to false", () => {
    const parsed = loginSchema.parse({ email: "USER@Example.com", password: "x" });
    expect(parsed.email).toBe("user@example.com");
    expect(parsed.rememberMe).toBe(false);
  });

  it("requires a password on login, without applying the strength policy", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "short" }).success).toBe(
      true,
    );
  });

  it("rejects a malformed email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(
      false,
    );
  });

  it("accepts a registration that satisfies the whole policy", () => {
    const parsed = registerSchema.parse(register());
    expect(parsed.email).toBe("alice@example.com");
    expect(parsed.acceptTerms).toBe(true);
  });

  it("enforces length, case and digit in the password policy", () => {
    for (const password of ["Short1aa", "alllowercase1", "ALLUPPERCASE1", "NoDigitsHere"]) {
      const result = registerSchema.safeParse(
        register({ password, confirmPassword: password }),
      );
      expect(result.success, password).toBe(false);
    }
  });

  it("reports the mismatch on the confirmPassword path", () => {
    const result = registerSchema.safeParse(
      register({ confirmPassword: "Different1Pass" }),
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(result.error.issues[0]?.message).toBe("passwords do not match");
  });

  it("requires the terms checkbox to be literally true", () => {
    expect(registerSchema.safeParse(register({ acceptTerms: false })).success).toBe(
      false,
    );
  });

  it("bounds the display name", () => {
    expect(registerSchema.safeParse(register({ name: "" })).success).toBe(false);
    expect(registerSchema.safeParse(register({ name: "a".repeat(81) })).success).toBe(
      false,
    );
  });

  it("accepts only an email for a reset request", () => {
    expect(passwordResetRequestSchema.parse({ email: "a@b.co" })).toEqual({
      email: "a@b.co",
    });
    expect(passwordResetRequestSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("requires a long enough token and matching passwords on reset confirm", () => {
    const token = "t".repeat(16);
    expect(
      passwordResetConfirmSchema.safeParse({
        token,
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      }).success,
    ).toBe(true);

    expect(
      passwordResetConfirmSchema.safeParse({
        token: "tooshort",
        password: VALID_PASSWORD,
        confirmPassword: VALID_PASSWORD,
      }).success,
    ).toBe(false);

    expect(
      passwordResetConfirmSchema.safeParse({
        token,
        password: VALID_PASSWORD,
        confirmPassword: "Mismatch1Pass",
      }).success,
    ).toBe(false);
  });
});
