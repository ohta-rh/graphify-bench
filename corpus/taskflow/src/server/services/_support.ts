/**
 * Private helpers shared by the service layer.
 *
 * Two jobs only: build the `PermissionResource` descriptors `can()` expects
 * from a loaded row, and stamp the `EventEnvelope` every domain event carries.
 * Neither re-implements a cross-cutting concern — they are adapters onto
 * `@/lib/permissions` and `@/lib/event-bus`.
 */
import { toIsoTimestamp } from "@/types/common";
import type { Comment } from "@/types/comment";
import type { OrgId, UserId } from "@/types/common";
import type { EventEnvelope } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor, Member } from "@/types/member";
import type { PermissionResource } from "@/types/permission";
import type { Project } from "@/types/project";
import type { WebhookId } from "@/types/common";

/** Raised when a scoped lookup finds nothing; mapped to `not_found` by callers. */
export class NotFoundError extends Error {
  readonly code = "not_found" as const;

  constructor(
    readonly entity: string,
    readonly id: string,
  ) {
    super(`${entity} ${id} was not found`);
    this.name = "NotFoundError";
  }
}

/** Unwraps a repository read, turning the `null` case into a domain error. */
export function requireFound<T>(
  value: T | null | undefined,
  entity: string,
  id: string,
): T {
  if (value === null || value === undefined) {
    throw new NotFoundError(entity, id);
  }
  return value;
}

export function orgResource(orgId: OrgId): PermissionResource {
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

export function webhookResource(
  orgId: OrgId,
  webhookId: WebhookId | null,
): PermissionResource {
  return { kind: "webhook", orgId, webhookId };
}

export function memberResource(member: Member): PermissionResource {
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

/** The three fields the bus stamps on every payload. */
export function envelope(orgId: OrgId, actorId: UserId | null): EventEnvelope {
  return { orgId, actorId, occurredAt: toIsoTimestamp(new Date()) };
}

/** Same envelope, taken from an `Actor` rather than assembled by hand. */
export function actorEnvelope(actor: Actor): EventEnvelope {
  return envelope(actor.orgId, actor.userId);
}

/** Names the fields an update actually changed, for `issue.updated`. */
export function changedFields<T extends object>(
  before: T,
  after: T,
): readonly string[] {
  return Object.keys(after).filter(
    (key) =>
      JSON.stringify(before[key as keyof T]) !==
      JSON.stringify(after[key as keyof T]),
  );
}
