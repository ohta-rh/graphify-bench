/**
 * Test double for `@/lib/id` (owner E).
 *
 * The server suite needs ids that are valid ULIDs *and* reproducible, so a
 * failing assertion names the same row on every run. Counter-based rather than
 * random for exactly that reason.
 */
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ULID_LENGTH = 26;

let counter = 0;

export function newId(): string {
  counter += 1;
  return encode(counter);
}

export function isUlid(value: string): boolean {
  return (
    value.length === ULID_LENGTH &&
    [...value].every((char) => ULID_ALPHABET.includes(char.toUpperCase()))
  );
}

export function idFactory(seed: number): () => string {
  let local = seed;
  return () => {
    local += 1;
    return encode(local);
  };
}

/** Test-only: rewinds the counter so each file starts from the same ids. */
export function resetIds(): void {
  counter = 0;
}

function encode(value: number): string {
  let remaining = value;
  let out = "";

  while (out.length < ULID_LENGTH) {
    out = `${ULID_ALPHABET[remaining % 32] ?? "0"}${out}`;
    remaining = Math.floor(remaining / 32);
  }

  return out.slice(-ULID_LENGTH);
}
