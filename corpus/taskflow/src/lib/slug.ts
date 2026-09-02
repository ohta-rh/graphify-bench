/**
 * Slug generation and validation, shared by organization creation, project
 * creation and the "is this slug free?" checks in both the Zod schemas and the
 * repositories. One implementation so the client preview and the server
 * insertion can never disagree.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MIN_LENGTH = 2;
export const SLUG_MAX_LENGTH = 48;

/** Slugs the router or marketing pages already claim. */
export const RESERVED_SLUGS: readonly string[] = [
  "admin",
  "api",
  "auth",
  "billing",
  "blog",
  "changelog",
  "dashboard",
  "docs",
  "help",
  "login",
  "logout",
  "new",
  "pricing",
  "register",
  "settings",
  "static",
  "support",
  "taskflow",
  "www",
];

/** Lowercases, strips diacritics and punctuation, collapses to `a-z0-9-`. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return (
    value.length >= SLUG_MIN_LENGTH &&
    value.length <= SLUG_MAX_LENGTH &&
    SLUG_PATTERN.test(value)
  );
}

export function isReservedSlug(value: string): boolean {
  return RESERVED_SLUGS.includes(value);
}

export class InvalidSlugError extends Error {
  readonly code = "validation_failed" as const;

  constructor(readonly value: string, readonly reason: string) {
    super(`Invalid slug "${value}": ${reason}`);
    this.name = "InvalidSlugError";
  }
}

export function assertValidSlug(value: string): void {
  if (!isValidSlug(value)) {
    throw new InvalidSlugError(value, "must match ^[a-z0-9]+(-[a-z0-9]+)*$");
  }
  if (isReservedSlug(value)) {
    throw new InvalidSlugError(value, "is reserved");
  }
}

/**
 * Derives a slug from `input` that collides with nothing in `taken`, by
 * appending `-2`, `-3`, … Repositories pass their existing slug set in.
 */
export function uniqueSlug(input: string, taken: Iterable<string>): string {
  const base = slugify(input) || "item";
  const used = new Set(taken);
  if (!used.has(base) && !isReservedSlug(base)) return base;

  for (let suffix = 2; suffix < 1_000; suffix += 1) {
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - 5)}-${suffix}`;
    if (!used.has(candidate) && !isReservedSlug(candidate)) return candidate;
  }
  throw new InvalidSlugError(base, "exhausted unique suffixes");
}

/** Project keys are the short uppercase prefix shown on issue numbers (TF-12). */
export function projectKeyFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length >= 2
      ? words.slice(0, 3).map((w) => w[0] ?? "").join("")
      : (words[0] ?? "task").slice(0, 3);
  return letters.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) || "TASK";
}
