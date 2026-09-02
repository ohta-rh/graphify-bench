/**
 * Compact issue summary tile used by lists and the board.
 */
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatRelative, isOverdue } from "@/lib/date";
import { humanizePriority, humanizeStatus } from "@/lib/format";
import type { Issue, IssueLabel, IssuePriority } from "@/types/issue";
import type { User } from "@/types/member";
import type { ReactElement } from "react";
import { PRIORITY_TONE, STATUS_TONE } from "./issue-tone";

export type IssueCardProps = {
  issue: Issue;
  assignee?: User | null;
  labels?: readonly IssueLabel[];
  href: string;
  compact?: boolean;
};

/** Priorities worth shouting about; `none`/`low` stay silent on a card. */
function shouldShowPriority(priority: IssuePriority): boolean {
  return priority !== "none" && priority !== "low";
}

export function IssueCard(props: IssueCardProps): ReactElement | null {
  const { issue, assignee = null, labels = [], href, compact = false } = props;
  const overdue = isOverdue(issue.dueAt);

  return (
    <Card padded={!compact} className="issue-card">
      <div className={cn("flex items-start gap-3", compact && "text-sm")}>
        <div className="min-w-0 flex-1">
          <Link href={href} className="block font-medium hover:underline">
            <span className="mr-2 text-neutral-500">#{issue.number}</span>
            {issue.title}
          </Link>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[issue.status]} size="sm">
              {humanizeStatus(issue.status)}
            </Badge>

            {shouldShowPriority(issue.priority) ? (
              <Badge tone={PRIORITY_TONE[issue.priority]} size="sm">
                {humanizePriority(issue.priority)}
              </Badge>
            ) : null}

            {labels.map((label) => (
              <Badge key={label.id} tone="neutral" size="sm">
                {label.name}
              </Badge>
            ))}

            {issue.dueAt !== null ? (
              <span className={cn("text-xs", overdue && "text-red-600")}>
                {overdue ? "overdue " : "due "}
                {formatRelative(issue.dueAt)}
              </span>
            ) : null}

            {issue.archivedAt !== null ? (
              <Badge tone="warning" size="sm">
                Archived
              </Badge>
            ) : null}
          </div>
        </div>

        {assignee !== null ? (
          <Avatar name={assignee.name} src={assignee.avatarUrl} size="sm" />
        ) : (
          <Badge tone="neutral" size="sm">
            Unassigned
          </Badge>
        )}
      </div>
    </Card>
  );
}
