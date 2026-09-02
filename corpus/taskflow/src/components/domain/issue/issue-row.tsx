/**
 * One row of `IssueList`; renders the archive control only when permitted.
 *
 * Must call (do not reimplement): can
 */
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/cn";
import { formatRelative, isOverdue } from "@/lib/date";
import { humanizePriority, humanizeStatus } from "@/lib/format";
import { can } from "@/lib/permissions";
import type { IssueId } from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { issueResource } from "../permission/resources";
import { PRIORITY_TONE, STATUS_TONE } from "./issue-tone";

export type IssueRowProps = {
  issue: Issue;
  actor: Actor;
  assignee: User | null;
  onSelect?: (issueId: IssueId) => void;
  /** Optional: when provided the archive control is offered to actors who
   *  pass `issue:archive` for this row. */
  onArchive?: (issueId: IssueId) => void;
};

export function IssueRow(props: IssueRowProps): ReactElement | null {
  const { issue, actor, assignee, onSelect, onArchive } = props;
  const resource = issueResource(issue);
  // Ownership escalations mean the author or assignee may archive their own
  // issue even below the matrix rank — `can()` already knows that.
  const mayArchive = can(actor, "issue:archive", resource);
  const overdue = isOverdue(issue.dueAt);

  return (
    <TableRow className={cn(issue.archivedAt !== null && "opacity-60")}>
      <TableCell className="w-16 text-neutral-500">#{issue.number}</TableCell>

      <TableCell>
        <button
          type="button"
          className="text-left font-medium hover:underline"
          onClick={() => onSelect?.(issue.id)}
        >
          {issue.title}
        </button>
      </TableCell>

      <TableCell className="w-32">
        <Badge tone={STATUS_TONE[issue.status]} size="sm">
          {humanizeStatus(issue.status)}
        </Badge>
      </TableCell>

      <TableCell className="w-28">
        <Badge tone={PRIORITY_TONE[issue.priority]} size="sm">
          {humanizePriority(issue.priority)}
        </Badge>
      </TableCell>

      <TableCell className="w-40">
        {assignee !== null ? (
          <span className="flex items-center gap-2">
            <Avatar name={assignee.name} src={assignee.avatarUrl} size="xs" />
            {assignee.name}
          </span>
        ) : (
          <span className="text-neutral-500">Unassigned</span>
        )}
      </TableCell>

      <TableCell className={cn("w-32 text-sm", overdue && "text-red-600")}>
        {issue.dueAt === null ? "—" : formatRelative(issue.dueAt)}
      </TableCell>

      <TableCell className="w-24 text-right">
        {mayArchive && onArchive !== undefined && issue.archivedAt === null ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onArchive(issue.id)}
          >
            Archive
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
