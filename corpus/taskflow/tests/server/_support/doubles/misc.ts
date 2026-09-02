/**
 * Test doubles for the `src/lib` helpers owned by E.
 *
 * The server layer legitimately depends on them, but they are still stubs at
 * the time this suite runs, so each is replaced with the smallest faithful
 * implementation the assertions need. Swap-in only — no server code is mocked.
 */
import type { UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";
import type { IsoTimestamp, OrgId } from "@/types/common";

/* -------------------------------------------------------------- @/lib/hash */

export const hashModule = {
  hashPassword: async (password: string): Promise<string> =>
    `scrypt$${password.length}$${simpleHash(password)}`,
  verifyPassword: async (password: string, hash: string): Promise<boolean> =>
    (await hashModule.hashPassword(password)) === hash,
  hashToken: (token: string): string => `sha256$${simpleHash(token)}`,
  randomToken: (bytes = 32): string =>
    `t${simpleHash(String(tokenCounter++))}`.padEnd(bytes, "x"),
};

let tokenCounter = 1;

/* -------------------------------------------------------- @/lib/rate-limit */

/** Verdicts the suite can steer: the default is "always allowed". */
export const rateLimitState = { allowed: true, remaining: 100 };

export const rateLimitModule = {
  consumeRateLimit: async (
    _orgId: OrgId,
    _bucketKey: string,
    cost = 1,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: IsoTimestamp;
  }> => ({
    allowed: rateLimitState.allowed,
    remaining: Math.max(0, rateLimitState.remaining - cost),
    resetAt: new Date(Date.now() + 60_000).toISOString() as IsoTimestamp,
  }),
  getBucketConfig: () => ({ capacity: 100, refillPerMinute: 100 }),
  RATE_LIMIT_BUCKETS: {} as Readonly<
    Record<string, { capacity: number; refillPerMinute: number }>
  >,
};

/* ---------------------------------------------------------- @/lib/mentions */

export const mentionsModule = {
  extractMentions: (body: string): readonly string[] =>
    [...body.matchAll(/@([\w.-]+)/g)].map((match) => match[1] ?? ""),
  resolveMentions: (
    body: string,
    members: readonly MemberWithUser[],
  ): readonly UserId[] => {
    const handles = new Set(
      mentionsModule.extractMentions(body).map((handle) => handle.toLowerCase()),
    );
    return members
      .filter(
        (member) =>
          handles.has(member.user.name.toLowerCase()) ||
          handles.has(member.user.email.split("@")[0]?.toLowerCase() ?? ""),
      )
      .map((member) => member.userId);
  },
  highlightMentions: (body: string): string =>
    body.replace(/@([\w.-]+)/g, "<b>@$1</b>"),
};

/* ------------------------------------------------------------ @/lib/logger */

export const loggerModule = {
  createLogger: () => ({
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  }),
};

/* --------------------------------------------------------------- @/lib/csv */

export const csvModule = {
  toCsv: (
    rows: readonly Readonly<
      Record<string, string | number | boolean | null>
    >[],
    columns: readonly string[],
  ): string =>
    [
      columns.join(","),
      ...rows.map((row) =>
        columns.map((column) => csvModule.escapeCsvValue(row[column] ?? null)).join(","),
      ),
    ].join("\n"),
  escapeCsvValue: (value: string | number | boolean | null): string => {
    const text = value === null ? "" : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  },
  csvResponseHeaders: (filename: string) => ({
    "content-type": "text/csv",
    "content-disposition": `attachment; filename="${filename}"`,
  }),
};

function simpleHash(value: string): string {
  let hash = 2_166_136_261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash).toString(36);
}
