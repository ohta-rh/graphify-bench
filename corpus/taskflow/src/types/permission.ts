import type {
  CommentId,
  IssueId,
  MemberId,
  OrgId,
  ProjectId,
  UserId,
  WebhookId,
} from "./common";
import type { Role } from "./member";
import type { ProjectVisibility } from "./project";

/**
 * The complete action vocabulary of `can()`. Every authorization decision in
 * Taskflow names one of these — there is no free-form string permission.
 */
export type PermissionAction =
  | "org:read"
  | "org:update"
  | "org:delete"
  | "org:manage_billing"
  | "org:manage_flags"
  | "member:read"
  | "member:invite"
  | "member:update_role"
  | "member:remove"
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:archive"
  | "project:delete"
  | "issue:create"
  | "issue:read"
  | "issue:update"
  | "issue:assign"
  | "issue:archive"
  | "issue:delete"
  | "comment:create"
  | "comment:read"
  | "comment:update"
  | "comment:delete"
  | "activity:read"
  | "activity:export"
  | "notification:read"
  | "notification:manage"
  | "webhook:manage";

/**
 * The object a permission is asked about. Discriminated on `kind` so the
 * ownership rules inside `can()` can read the fields they need without casts.
 */
export type PermissionResource =
  | { readonly kind: "organization"; readonly orgId: OrgId }
  | { readonly kind: "billing"; readonly orgId: OrgId }
  | {
      readonly kind: "member";
      readonly orgId: OrgId;
      readonly memberId: MemberId;
      readonly targetUserId: UserId;
      readonly targetRole: Role;
    }
  | {
      readonly kind: "project";
      readonly orgId: OrgId;
      readonly projectId: ProjectId;
      readonly visibility: ProjectVisibility;
      readonly leadId: UserId | null;
    }
  | {
      readonly kind: "issue";
      readonly orgId: OrgId;
      readonly projectId: ProjectId;
      readonly issueId: IssueId;
      readonly authorId: UserId;
      readonly assigneeId: UserId | null;
    }
  | {
      readonly kind: "comment";
      readonly orgId: OrgId;
      readonly commentId: CommentId;
      readonly authorId: UserId;
    }
  | { readonly kind: "activity"; readonly orgId: OrgId }
  | { readonly kind: "notification"; readonly orgId: OrgId; readonly recipientId: UserId }
  | { readonly kind: "webhook"; readonly orgId: OrgId; readonly webhookId: WebhookId | null };

export type PermissionResourceKind = PermissionResource["kind"];

/** Verbose form of a decision, used by the settings UI to explain a denial. */
export interface PermissionDecision {
  readonly allowed: boolean;
  readonly action: PermissionAction;
  readonly resourceKind: PermissionResourceKind;
  readonly reason:
    | "granted_by_role"
    | "granted_by_ownership"
    | "granted_by_staff"
    | "denied_by_role"
    | "denied_cross_tenant"
    | "denied_unknown_action";
}
