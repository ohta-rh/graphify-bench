/**
 * Validated environment access. Nothing else in Taskflow reads `process.env`
 * — call sites import `env` (or `loadEnv()` when they need to validate a
 * different source, as the tests do) so a missing or malformed variable fails
 * once, loudly, instead of surfacing as `undefined` deep in a request.
 */
import { SITE_CONFIG } from "./site";

export type AppEnv = {
  nodeEnv: "development" | "test" | "production";
  databasePath: string;
  appUrl: string;
  digestEnabled: boolean;
};

const NODE_ENVS = ["development", "test", "production"] as const;

type NodeEnvValue = (typeof NODE_ENVS)[number];

function readNodeEnv(raw: string | undefined): NodeEnvValue {
  const value = (raw ?? "development").trim();
  const match = NODE_ENVS.find((candidate) => candidate === value);
  return match ?? "development";
}

/** Accepts `1`/`true`/`yes`/`on` (case-insensitive) as true; anything else false. */
function readBoolean(raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(value)) return true;
  if (["0", "false", "no", "off"].includes(value)) return false;
  throw new Error(`Invalid boolean environment value: "${raw}"`);
}

function readUrl(raw: string | undefined, fallback: string): string {
  const value = (raw ?? "").trim() || fallback;
  try {
    // Normalises away a trailing slash so `${appUrl}${path}` never doubles up.
    const parsed = new URL(value);
    return parsed.origin + parsed.pathname.replace(/\/$/, "");
  } catch {
    throw new Error(`Invalid TASKFLOW_APP_URL: "${value}"`);
  }
}

/**
 * Reads and validates the environment. Defaults are chosen so a fresh
 * checkout runs with no `.env` at all — the corpus must build offline.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const nodeEnv = readNodeEnv(source.NODE_ENV);
  const databasePath =
    (source.TASKFLOW_DB_PATH ?? "").trim() ||
    (nodeEnv === "test" ? ":memory:" : "./data/taskflow.db");

  return {
    nodeEnv,
    databasePath,
    appUrl: readUrl(source.TASKFLOW_APP_URL, SITE_CONFIG.url),
    digestEnabled: readBoolean(source.TASKFLOW_DIGEST_ENABLED, nodeEnv !== "test"),
  };
}

export const env: AppEnv = loadEnv();
