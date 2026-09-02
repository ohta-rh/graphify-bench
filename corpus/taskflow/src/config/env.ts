/**
 * Validated environment access. Nothing else reads `process.env`.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export const env: AppEnv = undefined as unknown as AppEnv;

export type AppEnv = { nodeEnv: 'development' | 'test' | 'production'; databasePath: string; appUrl: string; digestEnabled: boolean };

export function loadEnv(source?: NodeJS.ProcessEnv): AppEnv {
  throw new Error("stub: src/config/env.ts");
}
