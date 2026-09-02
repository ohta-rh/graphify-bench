/**
 * Per-issue slice of the audit trail.
 *
 * STUB — owner B. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { ActivityEvent } from "@/types/activity";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
export type IssueActivityPanelProps = { events: readonly ActivityEvent[]; actors: Readonly<Record<string, User>> };

export function IssueActivityPanel(props: IssueActivityPanelProps): ReactElement | null {
  return null;
}
