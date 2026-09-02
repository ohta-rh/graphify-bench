/**
 * ULID generation and validation. Every branded id in the app is produced
 * here, so ids sort lexicographically by creation time and the repositories
 * can use them as pagination cursors without a separate sort column.
 */
/** Crockford base32, minus I, L, O and U. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIME_LENGTH = 10;
const RANDOM_LENGTH = 16;

const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function encodeTime(time: number): string {
  let remaining = time;
  let out = "";
  for (let i = 0; i < TIME_LENGTH; i += 1) {
    const mod = remaining % 32;
    out = ALPHABET[mod] + out;
    remaining = (remaining - mod) / 32;
  }
  return out;
}

function encodeRandom(next: () => number): string {
  let out = "";
  for (let i = 0; i < RANDOM_LENGTH; i += 1) {
    out += ALPHABET[next() % 32];
  }
  return out;
}

/** A fresh, monotonically-sortable ULID. Uses the Web Crypto API so the same
 *  implementation runs on the server, in the browser and on the edge. */
export function newId(): string {
  const bytes = new Uint8Array(RANDOM_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let cursor = 0;
  return encodeTime(Date.now()) + encodeRandom(() => bytes[cursor++] ?? 0);
}

export function isUlid(value: string): boolean {
  return ULID_PATTERN.test(value);
}

/**
 * A deterministic id generator for tests and the seed script: same seed,
 * same sequence of ids. Uses a small xorshift PRNG and a fixed timestamp so
 * fixtures are byte-stable across runs.
 */
export function idFactory(seed: number): () => string {
  let state = (seed | 0) || 0x2545_f491;
  let counter = 0;

  const next = (): number => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return Math.abs(state);
  };

  return () => {
    counter += 1;
    // A fixed epoch keeps seeded ids stable; the counter keeps them ordered.
    return encodeTime(1_700_000_000_000 + counter) + encodeRandom(next);
  };
}
