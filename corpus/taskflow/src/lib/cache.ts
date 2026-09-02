/**
 * Cache tag vocabulary and revalidation helpers. Note Next 16 requires the cache-life profile as the second argument to `revalidateTag`.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IssueId, OrgId, ProjectId } from "@/types/common";
export function orgTag(orgId: OrgId): string {
  throw new Error("stub: src/lib/cache.ts");
}

export function projectTag(projectId: ProjectId): string {
  throw new Error("stub: src/lib/cache.ts");
}

export function issueTag(issueId: IssueId): string {
  throw new Error("stub: src/lib/cache.ts");
}

export function revalidateTagged(tags: readonly string[], profile?: string): void {
  throw new Error("stub: src/lib/cache.ts");
}

export const CACHE_PROFILES: Readonly<Record<'seconds' | 'minutes' | 'hours', string>> = undefined as unknown as Readonly<Record<'seconds' | 'minutes' | 'hours', string>>;
