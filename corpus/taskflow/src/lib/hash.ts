/**
 * Password and token hashing built on `node:crypto` scrypt. No external
 * dependency — the corpus builds offline, and scrypt is the strongest KDF the
 * platform ships without one.
 *
 * Server-only: never import this from a client component.
 */
import {
  createHash,
  randomBytes,
  scrypt,
  timingSafeEqual,
} from "node:crypto";

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PREFIX = "scrypt";

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/** Returns `scrypt:<saltHex>:<keyHex>` — self-describing, so the verifier
 *  can change parameters later without a migration. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  return `${PREFIX}:${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Constant-time comparison; a malformed stored hash simply fails to verify. */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const [scheme, saltHex, keyHex] = hash.split(":");
  if (scheme !== PREFIX || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const actual = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

/** One-way digest for invitation and session tokens, which are high-entropy
 *  already and so need no salt or work factor. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** URL-safe random token; the default width matches the session schema's
 *  32-character minimum. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
