import type {
  CommentId,
  IssueId,
  MemberId,
  OrgId,
  ProjectId,
  UserId,
  IsoTimestamp,
} from "./common";
import type { IssueStatus, IssuePriority } from "./issue";
import type { Role } from "./member";
import type { PlanId, LimitedResource } from "./billing";
import type { FeatureFlagKey } from "./feature-flag";

/** Fields present on every event payload; the bus stamps them on `emit`. */
export interface EventEnvelope {
  readonly orgId: OrgId;
  readonly actorId: UserId | null;
  readonly occurredAt: IsoTimestamp;
}

/**
 * The complete catalogue of domain events. `emit()` and `subscribe()` in
 * `src/lib/event-bus.ts` are keyed on this map, so adding an event here is the
 * only way to introduce one — services, jobs and the webhook dispatcher all
 * derive their handler signatures from it.
 */
export interface TaskflowEventMap {
  "project.created": EventEnvelope & {
    projectId: ProjectId;
    name: string;
    slug: string;
  };
  "project.archived": EventEnvelope & {
    projectId: ProjectId;
    issuesArchived: number;
  };
  "project.restored": EventEnvelope & { projectId: ProjectId };
  "issue.created": EventEnvelope & {
    issueId: IssueId;
    projectId: ProjectId;
    title: string;
    assigneeId: UserId | null;
    priority: IssuePriority;
  };
  "issue.updated": EventEnvelope & {
    issueId: IssueId;
    projectId: ProjectId;
    changedFields: readonly string[];
  };
  "issue.status_changed": EventEnvelope & {
    issueId: IssueId;
    projectId: ProjectId;
    from: IssueStatus;
    to: IssueStatus;
  };
  "issue.assigned": EventEnvelope & {
    issueId: IssueId;
    projectId: ProjectId;
    previousAssigneeId: UserId | null;
    assigneeId: UserId;
  };
  "issue.archived": EventEnvelope & { issueId: IssueId; projectId: ProjectId };
  "issue.overdue": EventEnvelope & {
    issueId: IssueId;
    projectId: ProjectId;
    dueAt: IsoTimestamp;
    assigneeId: UserId | null;
  };
  "comment.created": EventEnvelope & {
    commentId: CommentId;
    issueId: IssueId;
    mentionedUserIds: readonly UserId[];
  };
  "comment.deleted": EventEnvelope & { commentId: CommentId; issueId: IssueId };
  "member.invited": EventEnvelope & { email: string; role: Role };
  "member.joined": EventEnvelope & { memberId: MemberId; userId: UserId; role: Role };
  "member.role_changed": EventEnvelope & {
    memberId: MemberId;
    from: Role;
    to: Role;
  };
  "member.removed": EventEnvelope & { memberId: MemberId; userId: UserId };
  "billing.plan_changed": EventEnvelope & { from: PlanId; to: PlanId };
  "billing.limit_exceeded": EventEnvelope & {
    resource: LimitedResource;
    limit: number;
    used: number;
  };
  "flag.toggled": EventEnvelope & { flag: FeatureFlagKey; enabled: boolean };
  "digest.due": EventEnvelope & { recipientId: UserId; windowStart: IsoTimestamp };
  "search.reindex_requested": EventEnvelope & {
    subjectKind: "issue" | "comment" | "project";
    subjectId: string;
  };
  "webhook.delivery_requested": EventEnvelope & {
    eventType: string;
    payload: Readonly<Record<string, unknown>>;
  };
}

export type TaskflowEventType = keyof TaskflowEventMap;

export type TaskflowEventPayload<K extends TaskflowEventType> =
  TaskflowEventMap[K];

/** A handler registered with `subscribe()`. May be async; errors are isolated. */
export type EventHandler<K extends TaskflowEventType> = (
  payload: TaskflowEventPayload<K>,
) => void | Promise<void>;

/** Returned by `subscribe()`; calling it removes the handler. */
export type Unsubscribe = () => void;
