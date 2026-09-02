/**
 * Structured logger. The only place `console` is allowed.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export function createLogger(scope: string): Logger {
  throw new Error("stub: src/lib/logger.ts");
}

export type Logger = { debug: (message: string, fields?: LogFields) => void; info: (message: string, fields?: LogFields) => void; warn: (message: string, fields?: LogFields) => void; error: (message: string, fields?: LogFields) => void };

export type LogFields = Readonly<Record<string, string | number | boolean | null>>;
