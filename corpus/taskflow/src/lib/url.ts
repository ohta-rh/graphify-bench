/**
 * Builds every internal href so route shapes live in one place. When the App
 * Router directory moves, this module changes and nothing else does — no
 * component or email template concatenates a path by hand.
 */

function encodeSegment(segment: string): string {
  return encodeURIComponent(segment);
}

function join(parts: readonly string[]): string {
  const cleaned = parts.filter((part) => part !== "" && part !== undefined);
  return `/${cleaned.join("/")}`;
}

/** `/acme` or `/acme/issues/…` — the dashboard root for one organization. */
export function orgPath(orgSlug: string, ...segments: readonly string[]): string {
  return join([encodeSegment(orgSlug), ...segments.map(encodeSegment)]);
}

export function projectPath(
  orgSlug: string,
  projectSlug: string,
  ...segments: readonly string[]
): string {
  return orgPath(orgSlug, "projects", projectSlug, ...segments);
}

export function issuePath(
  orgSlug: string,
  projectSlug: string,
  issueNumber: number,
): string {
  return projectPath(orgSlug, projectSlug, "issues", String(issueNumber));
}

export function settingsPath(orgSlug: string, section?: string): string {
  return section === undefined
    ? orgPath(orgSlug, "settings")
    : orgPath(orgSlug, "settings", section);
}

/**
 * Appends query parameters, dropping `undefined` entries so callers can pass
 * an optional filter straight through. Existing parameters on `path` are kept.
 */
export function withSearchParams(
  path: string,
  params: Readonly<Record<string, string | number | undefined>>,
): string {
  const [base, existing = ""] = path.split("?", 2);
  const search = new URLSearchParams(existing);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      search.delete(key);
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  return query === "" ? (base ?? path) : `${base}?${query}`;
}
