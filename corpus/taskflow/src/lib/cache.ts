/**
 * Cache tag vocabulary and revalidation helpers.
 *
 * Next 16 requires a cache-life profile as the second argument to
 * `revalidateTag`, which is exactly the kind of API change that rots when it
 * is spelled out at forty call sites. Server Actions call
 * `revalidateTagged([...])` and never import `next/cache` themselves.
 */
import { revalidateTag } from "next/cache";
import type { IssueId, OrgId, ProjectId } from "@/types/common";

/** The cache-life profiles this app uses, by how stale a read may be. */
export const CACHE_PROFILES: Readonly<
  Record<"seconds" | "minutes" | "hours", string>
> = {
  seconds: "seconds",
  minutes: "minutes",
  hours: "hours",
};

export function orgTag(orgId: OrgId): string {
  return `org:${orgId}`;
}

export function projectTag(projectId: ProjectId): string {
  return `project:${projectId}`;
}

export function issueTag(issueId: IssueId): string {
  return `issue:${issueId}`;
}

/**
 * Invalidates every supplied tag under one profile, de-duplicating first so a
 * caller can splice together tag lists without worrying about repeats.
 */
export function revalidateTagged(
  tags: readonly string[],
  profile: string = CACHE_PROFILES.minutes,
): void {
  for (const tag of new Set(tags)) {
    if (tag === "") continue;
    revalidateTag(tag, profile);
  }
}
