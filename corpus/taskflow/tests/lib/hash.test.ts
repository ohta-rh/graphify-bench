/** scrypt password hashing, token digests and random tokens. */
import { describe, expect, it } from "vitest";
import { hashPassword, hashToken, randomToken, verifyPassword } from "@/lib/hash";

const PASSWORD = "correct horse battery";

describe("lib/hash", () => {
  it("produces a self-describing scrypt hash", async () => {
    const hash = await hashPassword(PASSWORD);
    const [scheme, salt, key] = hash.split(":");
    expect(scheme).toBe("scrypt");
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(key).toMatch(/^[0-9a-f]{128}$/);
  });

  it("salts, so the same password hashes differently each time", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });

  it("never stores the password itself", async () => {
    expect(await hashPassword(PASSWORD)).not.toContain(PASSWORD);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword("wrong password here", hash)).toBe(false);
  });

  it("rejects rather than throws on a malformed stored hash", async () => {
    expect(await verifyPassword(PASSWORD, "")).toBe(false);
    expect(await verifyPassword(PASSWORD, "bcrypt:aa:bb")).toBe(false);
    expect(await verifyPassword(PASSWORD, "scrypt:aa")).toBe(false);
    expect(await verifyPassword(PASSWORD, "scrypt:aa:bb")).toBe(false);
  });

  it("hashes a token deterministically and irreversibly", () => {
    const token = "invitation-token-value";
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).not.toBe(hashToken(`${token}!`));
  });

  it("generates distinct URL-safe tokens long enough for the session schema", () => {
    const token = randomToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(new Set(Array.from({ length: 100 }, () => randomToken())).size).toBe(100);
  });

  it("honours a requested byte width", () => {
    expect(randomToken(8).length).toBeLessThan(randomToken(64).length);
  });
});
