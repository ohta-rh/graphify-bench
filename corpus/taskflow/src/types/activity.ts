import type {
  ActivityId,
  IsoTimestamp,
  ProjectId,
  TenantScoped,
  UserId,
} from "./common";

/** The verb recorded in the audit log. Kept deliberately close to the event
 *  bus keys so `ActivityService` can map one to the other mechanically. */
export type ActivityAction =
  | "organization.updated"
  | "project.created"
  | "project.updated"
  | "project.archived"
  | "project.restored"
  | "issue.created"
  | "issue.updated"
  | "issue.status_changed"
  | "issue.assigned"
  | "issue.archived"
  | "issue.restored"
  | "comment.created"
  | "comment.updated"
  | "comment.deleted"
  | "member.invited"
  | "member.joined"
  | "member.role_changed"
  | "member.removed"
  | "billing.plan_changed"
  | "flag.toggled";

export type ActivitySubjectKind =
  | "organization"
  | "project"
  | "issue"
  | "comment"
  | "member"
  | "subscription"
  | "feature_flag";

export interface ActivityEvent extends TenantScoped {
  readonly id: ActivityId;
  readonly action: ActivityAction;
  readonly actorId: UserId | null;
  readonly subjectKind: ActivitySubjectKind;
  readonly subjectId: string;
  readonly projectId: ProjectId | null;
  readonly summary: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
  readonly occurredAt: IsoTimestamp;
}

/** Filter for the activity feed page and the audit-log CSV export. */
export interface ActivityFilter {
  readonly action?: readonly ActivityAction[];
  readonly actorId?: UserId;
  readonly projectId?: ProjectId;
  readonly subjectKind?: ActivitySubjectKind;
  readonly since?: IsoTimestamp;
  readonly until?: IsoTimestamp;
}

/** Activity rows grouped by calendar day, as the feed renders them. */
export interface ActivityGroup {
  readonly day: string;
  readonly events: readonly ActivityEvent[];
}
