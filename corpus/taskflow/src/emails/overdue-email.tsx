/**
 * Overdue-issue reminder produced by the overdue job.
 *
 * STUB — owner E. Replace the body, keep every exported
 * signature exactly as declared in corpus-manifest.json.
 */
import type { IsoTimestamp } from "@/types/common";
import type { ReactElement } from "react";
export type OverdueEmailProps = { recipientName: string; issues: readonly { title: string; url: string; dueAt: IsoTimestamp }[] };

export function OverdueEmail(props: OverdueEmailProps): ReactElement | null {
  return null;
}
