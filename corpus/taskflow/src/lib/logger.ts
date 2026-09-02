/**
 * Structured logger. The only place `console` is allowed.
 *
 * Every line is one JSON object so job output and request output can be
 * grepped the same way. The threshold comes from `TASKFLOW_LOG_LEVEL`, or
 * defaults to `warn` under test so a suite run stays quiet.
 */
import { env } from "@/config/env";

export type LogFields = Readonly<Record<string, string | number | boolean | null>>;

export type Logger = {
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
};

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Readonly<Record<Level, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): Level {
  const raw = (process.env.TASKFLOW_LOG_LEVEL ?? "").trim().toLowerCase();
  if (raw in LEVEL_RANK) return raw as Level;
  if (env.nodeEnv === "test") return "warn";
  return env.nodeEnv === "production" ? "info" : "debug";
}

const threshold = LEVEL_RANK[configuredLevel()];

function write(level: Level, scope: string, message: string, fields?: LogFields): void {
  if (LEVEL_RANK[level] < threshold) return;

  const line = JSON.stringify({
    level,
    scope,
    message,
    time: new Date().toISOString(),
    ...(fields ?? {}),
  });

  // This module is the sanctioned `console` sink; nothing else may call it.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

/**
 * A logger bound to one scope, e.g. `createLogger("issue-service")`. Scopes
 * are module-shaped so a log line always names the code that emitted it.
 */
export function createLogger(scope: string): Logger {
  return {
    debug: (message, fields) => write("debug", scope, message, fields),
    info: (message, fields) => write("info", scope, message, fields),
    warn: (message, fields) => write("warn", scope, message, fields),
    error: (message, fields) => write("error", scope, message, fields),
  };
}
