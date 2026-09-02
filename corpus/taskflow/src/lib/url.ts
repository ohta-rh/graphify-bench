/**
 * Builds every internal href so route shapes live in one place.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
export function orgPath(orgSlug: string, ...segments: readonly string[]): string {
  throw new Error("stub: src/lib/url.ts");
}

export function projectPath(orgSlug: string, projectSlug: string, ...segments: readonly string[]): string {
  throw new Error("stub: src/lib/url.ts");
}

export function issuePath(orgSlug: string, projectSlug: string, issueNumber: number): string {
  throw new Error("stub: src/lib/url.ts");
}

export function settingsPath(orgSlug: string, section?: string): string {
  throw new Error("stub: src/lib/url.ts");
}

export function withSearchParams(path: string, params: Readonly<Record<string, string | number | undefined>>): string {
  throw new Error("stub: src/lib/url.ts");
}
