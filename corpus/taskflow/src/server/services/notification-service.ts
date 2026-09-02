/**
 * The fan-out hub: one domain event becomes in-app rows, an email draft and/or a digest entry, filtered by each recipient's preferences.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, isEnabled, subscribe
 */
import { subscribe } from "@/lib/event-bus";
import { isEnabled } from "@/lib/feature-flags";
import { assertCan } from "@/lib/permissions";
import { assertOrgScope } from "@/lib/tenant";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import { toIsoTimestamp } from "@/types/common";
import { notificationResource, requireFound } from "./_support";
import type {
  ListNotificationsInput,
  MarkNotificationReadInput,
  UpdateNotificationPreferenceInput,
} from "@/schemas/notification";
import type { OrgId, Page, UserId } from "@/types/common";
import type { FlagContext } from "@/types/feature-flag";
import type { Actor } from "@/types/member";
import type {
  Notification,
  NotificationChannel,
  NotificationKind,
  NotificationPreference,
} from "@/types/notification";

export type NotificationPayload = {
  title: string;
  body: string;
  href: string;
  actorId: UserId | null;
};

/** Channels used when a recipient has never touched their preferences. */
const DEFAULT_CHANNELS: readonly NotificationChannel[] = ["in_app", "email"];

/**
 * Writes one notification row per recipient, each with the channel set that
 * recipient's preferences allow. A recipient who has muted every channel is
 * skipped entirely rather than given a row nobody will ever see.
 */
export async function notify(
  orgId: OrgId,
  kind: NotificationKind,
  recipients: readonly UserId[],
  payload: NotificationPayload,
): Promise<readonly Notification[]> {
  if (recipients.length === 0) return [];

  const org = await orgRepo.findOrgById(orgId);
  const flags: FlagContext = {
    orgId,
    userId: payload.actorId,
    plan: org?.plan ?? "free",
    role: null,
    overrides: org?.settings.enabledFlagOverrides,
  };

  const rows = [];

  for (const recipientId of new Set(recipients)) {
    if (recipientId === payload.actorId) continue;

    const preference = await preferenceRepo.getPreference(
      orgId,
      recipientId,
      kind,
    );
    const channels = resolveChannels(preference, flags);
    if (channels.length === 0) continue;

    rows.push({
      orgId,
      recipientId,
      kind,
      title: payload.title,
      body: payload.body,
      href: payload.href,
      actorId: payload.actorId,
      channels,
    });
  }

  return notificationRepo.insertNotifications(orgId, rows);
}

export async function listNotifications(
  actor: Actor,
  input: ListNotificationsInput,
): Promise<Page<Notification>> {
  assertOrgScope(actor, input.orgId);
  assertCan(
    actor,
    "notification:read",
    notificationResource(input.orgId, input.recipientId),
  );
  return notificationRepo.listNotifications(input);
}

export async function markRead(
  actor: Actor,
  input: MarkNotificationReadInput,
): Promise<Notification> {
  assertOrgScope(actor, input.orgId);
  assertCan(
    actor,
    "notification:manage",
    notificationResource(input.orgId, actor.userId),
  );
  return notificationRepo.markRead(
    input.orgId,
    input.notificationId,
    toIsoTimestamp(new Date()),
  );
}

export async function markAllRead(
  actor: Actor,
  orgId: OrgId,
): Promise<number> {
  assertOrgScope(actor, orgId);
  assertCan(
    actor,
    "notification:manage",
    notificationResource(orgId, actor.userId),
  );
  return notificationRepo.markAllRead(
    orgId,
    actor.userId,
    toIsoTimestamp(new Date()),
  );
}

export async function updatePreference(
  actor: Actor,
  input: UpdateNotificationPreferenceInput,
): Promise<NotificationPreference> {
  assertOrgScope(actor, input.orgId);
  assertCan(
    actor,
    "notification:manage",
    notificationResource(input.orgId, input.userId),
  );
  return preferenceRepo.upsertPreference(input);
}

/**
 * Turns a stored preference into the channels one notification will use.
 * `digestOnly` suppresses the immediate email but keeps the in-app row, and
 * the email channel additionally requires the org's `digest_email` plan flag.
 */
export function resolveChannels(
  preference: NotificationPreference | null,
  flags: FlagContext,
): readonly NotificationChannel[] {
  if (preference === null) return DEFAULT_CHANNELS;

  const channels: NotificationChannel[] = [];
  if (preference.inApp) channels.push("in_app");

  const emailAllowed =
    preference.email &&
    (!preference.digestOnly || isEnabled("digest_email", flags));

  if (emailAllowed) channels.push("email");
  return channels;
}

/**
 * The bus wiring. Attached at module load rather than from `event-registry`
 * because the fan-out has no other public entry point — importing this module
 * is what makes an org start receiving notifications.
 */
let registered = false;

function registerFanOut(): void {
  if (registered) return;
  registered = true;

  subscribe("issue.assigned", async (payload) => {
    await notify(payload.orgId, "issue_assigned", [payload.assigneeId], {
      title: "You were assigned an issue",
      body: `Issue ${payload.issueId} is now yours`,
      href: `/issues/${payload.issueId}`,
      actorId: payload.actorId,
    });
  });

  subscribe("issue.overdue", async (payload) => {
    if (payload.assigneeId === null) return;
    await notify(payload.orgId, "issue_overdue", [payload.assigneeId], {
      title: "An issue is overdue",
      body: `Issue ${payload.issueId} was due ${payload.dueAt}`,
      href: `/issues/${payload.issueId}`,
      actorId: null,
    });
  });

  subscribe("comment.created", async (payload) => {
    const issue = await issueRepo.findIssueById(payload.orgId, payload.issueId);
    const watchers = issue
      ? [issue.authorId, ...(issue.assigneeId ? [issue.assigneeId] : [])]
      : [];

    await notify(payload.orgId, "comment_created", watchers, {
      title: "New comment",
      body: `A comment was added to issue ${payload.issueId}`,
      href: `/issues/${payload.issueId}`,
      actorId: payload.actorId,
    });

    if (payload.mentionedUserIds.length > 0) {
      await notify(
        payload.orgId,
        "comment_mention",
        payload.mentionedUserIds,
        {
          title: "You were mentioned",
          body: `You were mentioned on issue ${payload.issueId}`,
          href: `/issues/${payload.issueId}`,
          actorId: payload.actorId,
        },
      );
    }
  });

  subscribe("member.joined", async (payload) => {
    const org = requireFound(
      await orgRepo.findOrgById(payload.orgId),
      "Organization",
      payload.orgId,
    );
    await notify(payload.orgId, "member_joined", [org.ownerId], {
      title: "A new member joined",
      body: `${payload.userId} joined as ${payload.role}`,
      href: "/settings/members",
      actorId: payload.userId,
    });
  });
}

registerFanOut();
