/**
 * Builders for the `PermissionResource` values the UI hands to `can()`.
 *
 * Every domain component that gates a control needs the same discriminated
 * object, and assembling it inline in twenty files is how ownership fields
 * quietly drift apart. These builders are the only place a component-side
 * resource is shaped — the decision itself still belongs to
 * `can()` in `@/lib/permissions`.
 */
import type { Comment } from "@/types/comment";
import type { CommentId, OrgId, UserId } from "@/types/common";
import type { Issue } from "@/types/issue";
import type { Member, MemberWithUser } from "@/types/member";
import type { Project } from "@/types/project";
import type { PermissionResource } from "@/types/permission";

export function organizationResource(orgId: OrgId): PermissionResource {
  return { kind: "organization", orgId };
}

export function billingResource(orgId: OrgId): PermissionResource {
  return { kind: "billing", orgId };
}

export function activityResource(orgId: OrgId): PermissionResource {
  return { kind: "activity", orgId };
}

export function notificationResource(
  orgId: OrgId,
  recipientId: UserId,
): PermissionResource {
  return { kind: "notification", orgId, recipientId };
}

export function memberResource(
  member: Member | MemberWithUser,
): PermissionResource {
  return {
    kind: "member",
    orgId: member.orgId,
    memberId: member.id,
    targetUserId: member.userId,
    targetRole: member.role,
  };
}

export function projectResource(project: Project): PermissionResource {
  return {
    kind: "project",
    orgId: project.orgId,
    projectId: project.id,
    visibility: project.visibility,
    leadId: project.leadId,
  };
}

export function issueResource(issue: Issue): PermissionResource {
  return {
    kind: "issue",
    orgId: issue.orgId,
    projectId: issue.projectId,
    issueId: issue.id,
    authorId: issue.authorId,
    assigneeId: issue.assigneeId,
  };
}

export function commentResource(comment: Comment): PermissionResource {
  return {
    kind: "comment",
    orgId: comment.orgId,
    commentId: comment.id,
    authorId: comment.authorId,
  };
}

/**
 * A comment resource for a comment that does not exist yet (the composer asks
 * "may I create a comment here?" before there is an id to name).
 */
export function draftCommentResource(
  orgId: OrgId,
  authorId: UserId,
): PermissionResource {
  return {
    kind: "comment",
    orgId,
    commentId: "" as CommentId,
    authorId,
  };
}
