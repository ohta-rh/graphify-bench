/**
 * Password and token hashing built on `node:crypto` scrypt. No external dependency.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export async function hashPassword(password: string): Promise<string> {
  throw new Error("stub: src/lib/hash.ts");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  throw new Error("stub: src/lib/hash.ts");
}

export function hashToken(token: string): string {
  throw new Error("stub: src/lib/hash.ts");
}

export function randomToken(bytes?: number): string {
  throw new Error("stub: src/lib/hash.ts");
}
