/**
 * Virtualised issue list; hides row actions the actor may not perform.
 *
 * Must call (do not reimplement): can
 */
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { isArchived } from "@/lib/soft-delete";
import type { IssueId } from "@/types/common";
import type { IssueWithRelations } from "@/types/issue";
import type { Actor, User } from "@/types/member";
import type { ReactElement } from "react";
import { organizationResource } from "../permission/resources";
import { IssueRow } from "./issue-row";

export type IssueListProps = {
  issues: readonly IssueWithRelations[];
  actor: Actor;
  emptyLabel?: string;
  onArchive?: (issueId: IssueId) => void;
  /** Assignee lookup for the rows; the page joins users once, not per row. */
  users?: Readonly<Record<string, User>>;
};

const COLUMNS: readonly string[] = [
  "#",
  "Title",
  "Status",
  "Priority",
  "Assignee",
  "Due",
  "",
];

export function IssueList(props: IssueListProps): ReactElement | null {
  const { issues, actor, emptyLabel, onArchive, users = {} } = props;

  // One coarse check for the whole list: an actor who cannot read issues at
  // all sees the empty state rather than a table of hidden rows.
  if (!can(actor, "issue:read", organizationResource(actor.orgId))) {
    return (
      <EmptyState
        title="No access"
        description="Your role does not include issue access in this organization."
      />
    );
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        title={emptyLabel ?? "No issues match this filter"}
        description="Adjust the filters or create the first issue."
      />
    );
  }

  // Live rows first; archived ones stay visible but sink to the bottom.
  const ordered = [...issues].sort((a, b) => {
    const archivedDelta =
      Number(isArchived(a.issue)) - Number(isArchived(b.issue));
    if (archivedDelta !== 0) return archivedDelta;
    return b.issue.updatedAt.localeCompare(a.issue.updatedAt);
  });

  return (
    <Table caption="Issues">
      <TableHead>
        <TableRow>
          {COLUMNS.map((column, index) => (
            <TableHeaderCell key={column.length === 0 ? `col-${index}` : column}>
              {column}
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {ordered.map(({ issue }) => (
          <IssueRow
            key={issue.id}
            issue={issue}
            actor={actor}
            assignee={
              issue.assigneeId === null ? null : users[issue.assigneeId] ?? null
            }
            {...(onArchive !== undefined ? { onArchive } : {})}
          />
        ))}
      </TableBody>
    </Table>
  );
}
