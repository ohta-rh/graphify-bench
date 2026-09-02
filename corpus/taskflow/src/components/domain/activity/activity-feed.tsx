/**
 * Grouped audit trail; the export button needs `activity:export`.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import type { ActivityGroup } from "@/types/activity";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
export type ActivityFeedProps = { groups: readonly ActivityGroup[]; actors: Readonly<Record<string, User>>; actor: Actor };

export function ActivityFeed(props: ActivityFeedProps): ReactElement | null {
  return null;
}
