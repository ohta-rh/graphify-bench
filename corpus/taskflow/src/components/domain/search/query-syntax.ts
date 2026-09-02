/**
 * The `advanced_search` query language.
 *
 * A plain query is just terms. With the flag on, `kind:` and `project:`
 * prefixes narrow the search before it reaches the index, which is why the
 * parser lives on the client too: the dialog has to show the user what it
 * understood before it spends a round trip.
 */
import type { ProjectId } from "@/types/common";

export type SearchSubjectKind = "issue" | "comment" | "project";

const KINDS: readonly SearchSubjectKind[] = ["issue", "comment", "project"];

export interface ParsedSearchQuery {
  /** The free-text remainder, with every recognised token removed. */
  readonly text: string;
  readonly kinds: readonly SearchSubjectKind[];
  readonly projectId: ProjectId | null;
  /** Tokens that looked like syntax but named nothing we know. */
  readonly unknownTokens: readonly string[];
}

export const DEFAULT_SEARCH_KINDS: readonly SearchSubjectKind[] = ["issue"];

/**
 * @param raw      what the user typed
 * @param advanced whether the `advanced_search` flag is on for this org; when
 *                 false the whole string is treated as free text so a colon in
 *                 a title still finds the title.
 */
export function parseSearchQuery(
  raw: string,
  advanced: boolean,
): ParsedSearchQuery {
  if (!advanced) {
    return {
      text: raw.trim(),
      kinds: DEFAULT_SEARCH_KINDS,
      projectId: null,
      unknownTokens: [],
    };
  }

  const terms: string[] = [];
  const kinds: SearchSubjectKind[] = [];
  const unknown: string[] = [];
  let projectId: ProjectId | null = null;

  for (const token of raw.split(/\s+/).filter((part) => part.length > 0)) {
    const separator = token.indexOf(":");
    if (separator <= 0) {
      terms.push(token);
      continue;
    }

    const field = token.slice(0, separator).toLowerCase();
    const value = token.slice(separator + 1);
    if (value.length === 0) {
      unknown.push(token);
      continue;
    }

    if (field === "kind" || field === "in") {
      const kind = value.toLowerCase().replace(/s$/, "") as SearchSubjectKind;
      if (KINDS.includes(kind)) kinds.push(kind);
      else unknown.push(token);
    } else if (field === "project") {
      projectId = value as ProjectId;
    } else {
      unknown.push(token);
    }
  }

  return {
    text: terms.join(" "),
    kinds: kinds.length > 0 ? kinds : DEFAULT_SEARCH_KINDS,
    projectId,
    unknownTokens: unknown,
  };
}

/** A one-line explanation of what the parser understood, for the dialog. */
export function describeQuery(parsed: ParsedSearchQuery): string {
  const parts = [`searching ${parsed.kinds.join(", ")}`];
  if (parsed.projectId !== null) parts.push(`in project ${parsed.projectId}`);
  if (parsed.unknownTokens.length > 0) {
    parts.push(`ignoring ${parsed.unknownTokens.join(", ")}`);
  }
  return parts.join(" · ");
}
