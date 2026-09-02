import type {
  AttachmentId,
  IsoTimestamp,
  IssueId,
  LabelId,
  ProjectId,
  SoftDeletable,
  TenantScoped,
  Timestamps,
  UserId,
} from "./common";

export type IssueStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done"
  | "canceled";

export const ISSUE_STATUSES: readonly IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "canceled",
];

/** Statuses that count as closed for stats, digests and overdue checks. */
export const CLOSED_ISSUE_STATUSES: readonly IssueStatus[] = ["done", "canceled"];

export type IssuePriority = "none" | "low" | "medium" | "high" | "urgent";

export const ISSUE_PRIORITIES: readonly IssuePriority[] = [
  "none",
  "low",
  "medium",
  "high",
  "urgent",
];

export interface Issue extends Timestamps, TenantScoped, SoftDeletable {
  readonly id: IssueId;
  readonly projectId: ProjectId;
  readonly number: number;
  readonly title: string;
  readonly description: string | null;
  readonly status: IssueStatus;
  readonly priority: IssuePriority;
  readonly authorId: UserId;
  readonly assigneeId: UserId | null;
  readonly parentId: IssueId | null;
  readonly estimate: number | null;
  readonly dueAt: IsoTimestamp | null;
  readonly startedAt: IsoTimestamp | null;
  readonly completedAt: IsoTimestamp | null;
  readonly labelIds: readonly LabelId[];
}

export interface IssueLabel extends TenantScoped {
  readonly id: LabelId;
  readonly name: string;
  readonly color: string;
  readonly description: string | null;
}

export interface IssueAttachment extends Timestamps, TenantScoped {
  readonly id: AttachmentId;
  readonly issueId: IssueId;
  readonly filename: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly uploadedBy: UserId;
}

/** Filter accepted by the issue repository, service layer and list UI alike. */
export interface IssueFilter {
  readonly projectId?: ProjectId;
  readonly status?: readonly IssueStatus[];
  readonly priority?: readonly IssuePriority[];
  readonly assigneeId?: UserId | null;
  readonly authorId?: UserId;
  readonly labelIds?: readonly LabelId[];
  readonly query?: string;
  readonly dueBefore?: IsoTimestamp;
  readonly includeArchived?: boolean;
}

export interface IssueWithRelations {
  readonly issue: Issue;
  readonly labels: readonly IssueLabel[];
  readonly commentCount: number;
  readonly attachmentCount: number;
}

/** One column of the kanban board; the board is an ordered list of these. */
export interface IssueBoardColumn {
  readonly status: IssueStatus;
  readonly issues: readonly Issue[];
  readonly total: number;
}
