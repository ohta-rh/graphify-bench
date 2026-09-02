/**
 * Private row → domain mappers for the repository layer.
 *
 * SQLite stores branded ids as plain text and collections as JSON strings, so
 * exactly one place is allowed to re-apply the brands and parse the JSON: here.
 * Services never see a `*Row` type.
 */
import type {
  ActivityEventRow,
  AttachmentRow,
  CommentRow,
  InvitationRow,
  InvoiceRow,
  IssueRow,
  LabelRow,
  MemberRow,
  NotificationPreferenceRow,
  NotificationRow,
  OrganizationRow,
  OrganizationUsageRow,
  ProjectRow,
  SubscriptionRow,
  UserRow,
} from "@/server/db";
import type {
  ActivityAction,
  ActivityEvent,
} from "@/types/activity";
import type { Invoice, Subscription } from "@/types/billing";
import type { Comment } from "@/types/comment";
import type {
  ActivityId,
  AttachmentId,
  CommentId,
  InvitationId,
  IsoTimestamp,
  IssueId,
  LabelId,
  MemberId,
  NotificationId,
  OrgId,
  ProjectId,
  SubscriptionId,
  UserId,
} from "@/types/common";
import type { Issue, IssueAttachment, IssueLabel } from "@/types/issue";
import type { Invitation, Member, User } from "@/types/member";
import type {
  Notification,
  NotificationChannel,
  NotificationPreference,
} from "@/types/notification";
import type {
  Organization,
  OrganizationUsage,
} from "@/types/organization";
import type { Project } from "@/types/project";

/** Every id column is text in SQLite; the brand is re-applied on the way out. */
export function brandId<T extends string>(value: string): T {
  return value as T;
}

export function brandStamp(value: string): IsoTimestamp {
  return value as IsoTimestamp;
}

export function brandStampOrNull(value: string | null): IsoTimestamp | null {
  return value === null ? null : brandStamp(value);
}

/** Tolerant JSON array read: a corrupt column degrades to an empty list. */
export function parseJsonArray<T>(raw: string): readonly T[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function parseJsonObject(
  raw: string,
): Readonly<Record<string, string | number | boolean | null>> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | number | boolean | null>;
    }
    return {};
  } catch {
    return {};
  }
}

export function toUser(row: UserRow): User {
  return {
    id: brandId<UserId>(row.id),
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
    timezone: row.timezone,
    emailVerifiedAt: brandStampOrNull(row.emailVerifiedAt),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}

export function toOrganization(row: OrganizationRow): Organization {
  return {
    id: brandId<OrgId>(row.id),
    name: row.name,
    slug: row.slug,
    ownerId: brandId<UserId>(row.ownerId),
    plan: row.plan,
    logoUrl: row.logoUrl,
    trialEndsAt: brandStampOrNull(row.trialEndsAt),
    settings: {
      defaultIssueStatus: row.defaultIssueStatus,
      allowPublicProjects: row.allowPublicProjects,
      requireTwoFactor: row.requireTwoFactor,
      digestHourUtc: row.digestHourUtc,
      enabledFlagOverrides: parseJsonArray<string>(row.enabledFlagOverrides),
    },
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
    archivedAt: brandStampOrNull(row.archivedAt),
  };
}

export function toUsage(row: OrganizationUsageRow): OrganizationUsage {
  return {
    orgId: brandId<OrgId>(row.orgId),
    seatsUsed: row.seatsUsed,
    projectsUsed: row.projectsUsed,
    issuesUsed: row.issuesUsed,
    storageMbUsed: row.storageMbUsed,
    measuredAt: brandStamp(row.measuredAt),
  };
}

export function toMember(row: MemberRow): Member {
  return {
    id: brandId<MemberId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    userId: brandId<UserId>(row.userId),
    role: row.role,
    status: row.status,
    invitedBy: row.invitedBy === null ? null : brandId<UserId>(row.invitedBy),
    joinedAt: brandStampOrNull(row.joinedAt),
    lastSeenAt: brandStampOrNull(row.lastSeenAt),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
    archivedAt: brandStampOrNull(row.archivedAt),
  };
}

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: brandId<InvitationId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    email: row.email,
    role: row.role,
    invitedBy: brandId<UserId>(row.invitedBy),
    token: row.tokenHash,
    expiresAt: brandStamp(row.expiresAt),
    acceptedAt: brandStampOrNull(row.acceptedAt),
    revokedAt: brandStampOrNull(row.revokedAt),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}

export function toProject(row: ProjectRow): Project {
  return {
    id: brandId<ProjectId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    name: row.name,
    slug: row.slug,
    key: row.key,
    description: row.description,
    visibility: row.visibility,
    status: row.status,
    leadId: row.leadId === null ? null : brandId<UserId>(row.leadId),
    color: row.color,
    startsAt: brandStampOrNull(row.startsAt),
    targetDate: brandStampOrNull(row.targetDate),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
    archivedAt: brandStampOrNull(row.archivedAt),
  };
}

export function toIssue(
  row: IssueRow,
  labelIds: readonly LabelId[] = [],
): Issue {
  return {
    id: brandId<IssueId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    projectId: brandId<ProjectId>(row.projectId),
    number: row.number,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    authorId: brandId<UserId>(row.authorId),
    assigneeId: row.assigneeId === null ? null : brandId<UserId>(row.assigneeId),
    parentId: row.parentId === null ? null : brandId<IssueId>(row.parentId),
    estimate: row.estimate,
    dueAt: brandStampOrNull(row.dueAt),
    startedAt: brandStampOrNull(row.startedAt),
    completedAt: brandStampOrNull(row.completedAt),
    labelIds,
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
    archivedAt: brandStampOrNull(row.archivedAt),
  };
}

export function toLabel(row: LabelRow): IssueLabel {
  return {
    id: brandId<LabelId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    name: row.name,
    color: row.color,
    description: row.description,
  };
}

export function toAttachment(row: AttachmentRow): IssueAttachment {
  return {
    id: brandId<AttachmentId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    issueId: brandId<IssueId>(row.issueId),
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedBy: brandId<UserId>(row.uploadedBy),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}

export function toComment(row: CommentRow): Comment {
  return {
    id: brandId<CommentId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    issueId: brandId<IssueId>(row.issueId),
    authorId: brandId<UserId>(row.authorId),
    body: row.body,
    parentId: row.parentId === null ? null : brandId<CommentId>(row.parentId),
    editedAt: row.editedAt,
    mentionedUserIds: parseJsonArray<UserId>(row.mentionedUserIds),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
    archivedAt: brandStampOrNull(row.archivedAt),
  };
}

export function toNotification(row: NotificationRow): Notification {
  return {
    id: brandId<NotificationId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    recipientId: brandId<UserId>(row.recipientId),
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    actorId: row.actorId === null ? null : brandId<UserId>(row.actorId),
    readAt: brandStampOrNull(row.readAt),
    channels: parseJsonArray<NotificationChannel>(row.channels),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}

export function toPreference(
  row: NotificationPreferenceRow,
): NotificationPreference {
  return {
    orgId: brandId<OrgId>(row.orgId),
    userId: brandId<UserId>(row.userId),
    kind: row.kind,
    inApp: row.inApp,
    email: row.email,
    digestOnly: row.digestOnly,
  };
}

export function toActivityEvent(row: ActivityEventRow): ActivityEvent {
  return {
    id: brandId<ActivityId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    action: row.action as ActivityAction,
    actorId: row.actorId === null ? null : brandId<UserId>(row.actorId),
    subjectKind: row.subjectKind,
    subjectId: row.subjectId,
    projectId: row.projectId === null ? null : brandId<ProjectId>(row.projectId),
    summary: row.summary,
    metadata: parseJsonObject(row.metadata),
    occurredAt: brandStamp(row.occurredAt),
  };
}

export function toSubscription(row: SubscriptionRow): Subscription {
  return {
    id: brandId<SubscriptionId>(row.id),
    orgId: brandId<OrgId>(row.orgId),
    plan: row.plan,
    interval: row.interval,
    status: row.status,
    seats: row.seats,
    currentPeriodStart: brandStamp(row.currentPeriodStart),
    currentPeriodEnd: brandStamp(row.currentPeriodEnd),
    cancelAt: brandStampOrNull(row.cancelAt),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}

export function toInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    orgId: brandId<OrgId>(row.orgId),
    number: row.number,
    amountCents: row.amountCents,
    currency: row.currency,
    periodStart: brandStamp(row.periodStart),
    periodEnd: brandStamp(row.periodEnd),
    paidAt: brandStampOrNull(row.paidAt),
    createdAt: brandStamp(row.createdAt),
    updatedAt: brandStamp(row.updatedAt),
  };
}
