/**
 * The status/priority → badge tone mapping.
 *
 * The list, the row, the card, the board column header and the detail rail all
 * colour the same status, so the table lives in one place; drifting colours
 * between the board and the list is the kind of bug nobody files but everybody
 * notices.
 */
import type { BadgeProps } from "@/components/ui/badge";
import type { IssuePriority, IssueStatus } from "@/types/issue";

type Tone = NonNullable<BadgeProps["tone"]>;

export const STATUS_TONE: Readonly<Record<IssueStatus, Tone>> = {
  backlog: "neutral",
  todo: "neutral",
  in_progress: "brand",
  in_review: "warning",
  done: "success",
  canceled: "danger",
};

export const PRIORITY_TONE: Readonly<Record<IssuePriority, Tone>> = {
  none: "neutral",
  low: "neutral",
  medium: "brand",
  high: "warning",
  urgent: "danger",
};

/** Board column order: the workflow left-to-right, not the enum order. */
export const BOARD_STATUS_ORDER: readonly IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
];
