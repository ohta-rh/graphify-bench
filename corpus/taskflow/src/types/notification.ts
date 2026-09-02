import type {
  IsoTimestamp,
  NotificationId,
  TenantScoped,
  Timestamps,
  UserId,
} from "./common";

export type NotificationKind =
  | "issue_assigned"
  | "issue_status_changed"
  | "issue_due_soon"
  | "issue_overdue"
  | "comment_created"
  | "comment_mention"
  | "member_invited"
  | "member_joined"
  | "project_archived"
  | "plan_limit_reached"
  | "digest_ready";

export type NotificationChannel = "in_app" | "email" | "webhook";

export interface Notification extends Timestamps, TenantScoped {
  readonly id: NotificationId;
  readonly recipientId: UserId;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly actorId: UserId | null;
  readonly readAt: IsoTimestamp | null;
  readonly channels: readonly NotificationChannel[];
}

/** Per-user delivery matrix; the fan-out consults this before every send. */
export interface NotificationPreference extends TenantScoped {
  readonly userId: UserId;
  readonly kind: NotificationKind;
  readonly inApp: boolean;
  readonly email: boolean;
  readonly digestOnly: boolean;
}

/** One item queued for the daily digest email. */
export interface DigestEntry {
  readonly notificationId: NotificationId;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly href: string;
  readonly occurredAt: IsoTimestamp;
}

export interface DigestBundle extends TenantScoped {
  readonly recipientId: UserId;
  readonly entries: readonly DigestEntry[];
  readonly windowStart: IsoTimestamp;
  readonly windowEnd: IsoTimestamp;
}
