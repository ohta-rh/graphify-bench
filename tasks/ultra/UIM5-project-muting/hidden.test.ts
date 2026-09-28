/**
 * UIM5 — members can mute a project.
 *
 * Muting is personal. The fan-out drops a muted project's chatter, delivers
 * what is addressed to the member (assignment, mention, overdue alert) in-app
 * only, and the digest leaves the project out entirely. Webhooks belong to
 * the workspace and ignore personal mutes.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { emit } from "@/lib/event-bus";
import { TenantScopeError } from "@/lib/tenant";
import { runDigestEmailJob } from "@/server/jobs/digest-email-job";
import { resetOverdueTracking, runOverdueIssueJob } from "@/server/jobs/overdue-issue-job";
import * as notificationRepo from "@/server/repositories/notification-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { NotFoundError } from "@/server/services/_support";
import * as commentService from "@/server/services/comment-service";
import * as emailService from "@/server/services/email-service";
import * as issueService from "@/server/services/issue-service";
import {
  listMutedProjectIds,
  listNotifications,
  muteProject,
  notify,
  unmuteProject,
} from "@/server/services/notification-service";
import { registerWebhookListeners } from "@/server/services/webhook-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CommentId, IsoTimestamp, UserId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Notification, NotificationKind } from "@/types/notification";
import type { Project } from "@/types/project";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

interface World {
  readonly tenant: Tenant;
  /** The tenant's own project; the one that gets muted. */
  readonly muted: Project;
  readonly other: Project;
  /** In `muted`, authored by the admin, assigned to the member. */
  readonly mutedIssue: Issue;
  /** In `other`, authored by the admin, assigned to the member. */
  readonly otherIssue: Issue;
}

async function makeWorld(slug: string, digestHourUtc?: number): Promise<World> {
  const tenant = await createTenant(slug, "growth");
  if (digestHourUtc !== undefined) {
    await orgRepo.updateOrg(tenant.org.id, { orgId: tenant.org.id, settings: { digestHourUtc } });
  }
  await usageRepo.recomputeUsage(tenant.org.id);

  const other = await projectRepo.insertProject({
    orgId: tenant.org.id,
    name: `${slug} mobile`,
    slug: "mobile",
    key: "MOB",
    description: null,
    visibility: "org",
    leadId: tenant.userIds.owner,
    color: "#6366f1",
    targetDate: null,
  });

  const create = (project: Project, title: string) =>
    issueService.createIssue(
      tenant.actors.admin,
      issueInput(tenant.org.id, project.id, { title, assigneeId: tenant.userIds.member }),
    );

  return {
    tenant,
    muted: tenant.project,
    other,
    mutedIssue: await create(tenant.project, `${slug} muted issue`),
    otherIssue: await create(other, `${slug} other issue`),
  };
}

async function inbox(
  tenant: Tenant,
  recipientId: UserId,
  kind: NotificationKind,
): Promise<readonly Notification[]> {
  const page = await listNotifications(tenant.actors.owner, {
    orgId: tenant.org.id,
    recipientId,
    unreadOnly: false,
    kind: [kind],
    limit: 100,
    cursor: null,
  });
  return page.items;
}

async function comment(
  world: World,
  issue: Issue,
  mentionedUserIds: readonly UserId[] = [],
): Promise<void> {
  await commentService.createComment(world.tenant.actors.owner, {
    orgId: world.tenant.org.id,
    issueId: issue.id,
    body: "Status update",
    parentId: null,
    mentionedUserIds: [...mentionedUserIds],
  });
}

async function at<T>(instant: string, work: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(instant));
  try {
    return await work();
  } finally {
    vi.useRealTimers();
  }
}

/** Makes the member a digest subscriber without touching comment preferences. */
async function subscribeMemberToDigest(tenant: Tenant): Promise<void> {
  await preferenceRepo.upsertPreference({
    orgId: tenant.org.id,
    userId: tenant.userIds.member,
    kind: "issue_due_soon",
    inApp: true,
    email: true,
    digestOnly: true,
  });
}

function chatter(world: World, issue: Issue, title: string) {
  return notify(world.tenant.org.id, "comment_created", [world.tenant.userIds.member], {
    title,
    body: title,
    href: `/issues/${issue.id}`,
    actorId: null,
    projectId: issue.projectId,
  });
}

function cell(html: string, key: string): string | null {
  const match = html.match(new RegExp(`<td>${key}</td><td>([^<]*)</td>`));
  return match?.[1] ?? null;
}

function mailsTo(spy: { mock: { calls: ReadonlyArray<ReadonlyArray<{ to: string; html: string }>> } }, to: string) {
  return spy.mock.calls
    .map((call) => call[0])
    .filter((message): message is { to: string; html: string } => message?.to === to)
    .map((message) => message.html);
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
});

beforeEach(() => {
  resetOverdueTracking();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  cleanup();
});

describe("UIM5 per-project muting", () => {
  it("mutes and unmutes a project for the acting member only, idempotently", async () => {
    const world = await makeWorld("uim5-api");
    const { tenant } = world;

    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    expect(await listMutedProjectIds(tenant.actors.member, tenant.org.id)).toEqual([world.muted.id]);
    expect(await listMutedProjectIds(tenant.actors.admin, tenant.org.id)).toEqual([]);

    await unmuteProject(tenant.actors.member, tenant.org.id, world.muted.id);
    await expect(unmuteProject(tenant.actors.member, tenant.org.id, world.muted.id)).resolves.toBeUndefined();
    expect(await listMutedProjectIds(tenant.actors.member, tenant.org.id)).toEqual([]);
  });

  it("guards muting like reading the project", async () => {
    const world = await makeWorld("uim5-guards");
    const stranger = await createTenant("uim5-guards-other", "growth");
    const { tenant } = world;

    await expect(
      muteProject(stranger.actors.owner, tenant.org.id, world.muted.id),
    ).rejects.toBeInstanceOf(TenantScopeError);
    await expect(
      muteProject(tenant.actors.member, tenant.org.id, stranger.project.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await listMutedProjectIds(tenant.actors.member, tenant.org.id)).toEqual([]);

    await muteProject(tenant.actors.viewer, tenant.org.id, world.other.id);
    expect(await listMutedProjectIds(tenant.actors.viewer, tenant.org.id)).toEqual([world.other.id]);
  });

  it("drops comment notifications about a muted project, for that member only", async () => {
    const world = await makeWorld("uim5-chatter");
    const { tenant } = world;
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    await comment(world, world.mutedIssue);
    await comment(world, world.otherIssue);

    const memberRows = await inbox(tenant, tenant.userIds.member, "comment_created");
    expect(memberRows).toHaveLength(1);
    expect(memberRows[0]?.href).toBe(`/issues/${world.otherIssue.id}`);

    const adminRows = await inbox(tenant, tenant.userIds.admin, "comment_created");
    expect(adminRows).toHaveLength(2);
    for (const row of adminRows) expect(row.channels).toEqual(["in_app", "email"]);
  });

  it("delivers a mention from a muted project in-app only", async () => {
    const world = await makeWorld("uim5-mention");
    const { tenant } = world;
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    await comment(world, world.mutedIssue, [tenant.userIds.member, tenant.userIds.viewer]);

    const forMember = await inbox(tenant, tenant.userIds.member, "comment_mention");
    expect(forMember).toHaveLength(1);
    expect(forMember[0]?.channels).toEqual(["in_app"]);
    expect(await inbox(tenant, tenant.userIds.member, "comment_created")).toHaveLength(0);

    const forViewer = await inbox(tenant, tenant.userIds.viewer, "comment_mention");
    expect(forViewer).toHaveLength(1);
    expect(forViewer[0]?.channels).toEqual(["in_app", "email"]);
  });

  it("delivers assignments in-app only, and not at all when the in-app channel is off", async () => {
    const world = await makeWorld("uim5-assign");
    const { tenant } = world;
    const assign = (issue: Issue, assigneeId: UserId) =>
      issueService.assignIssue(tenant.actors.admin, { orgId: tenant.org.id, issueId: issue.id, assigneeId });

    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);
    await assign(world.mutedIssue, tenant.userIds.owner);
    await assign(world.mutedIssue, tenant.userIds.member);

    const forMember = await inbox(tenant, tenant.userIds.member, "issue_assigned");
    expect(forMember.map((row) => row.channels)).toEqual([["in_app"]]);

    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.viewer,
      kind: "issue_assigned",
      inApp: false,
      email: true,
      digestOnly: false,
    });
    await muteProject(tenant.actors.viewer, tenant.org.id, world.muted.id);

    await assign(world.mutedIssue, tenant.userIds.viewer);
    expect(await inbox(tenant, tenant.userIds.viewer, "issue_assigned")).toHaveLength(0);

    await assign(world.otherIssue, tenant.userIds.viewer);
    const forViewer = await inbox(tenant, tenant.userIds.viewer, "issue_assigned");
    expect(forViewer.map((row) => row.channels)).toEqual([["email"]]);
  });

  it("sends the overdue alert for a muted project in-app only", async () => {
    const world = await makeWorld("uim5-overdue");
    const { tenant } = world;
    await issueService.updateIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: world.mutedIssue.id,
      dueAt: "2026-01-01T00:00:00.000Z" as IsoTimestamp,
    });
    await issueService.updateIssue(tenant.actors.admin, {
      orgId: tenant.org.id,
      issueId: world.otherIssue.id,
      dueAt: "2026-01-01T00:00:00.000Z" as IsoTimestamp,
    });
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    await runOverdueIssueJob(new Date("2026-06-01T07:00:00.000Z"));

    const alerts = await inbox(tenant, tenant.userIds.member, "issue_overdue");
    const byIssue = new Map(alerts.map((row) => [row.href, row.channels]));
    expect(alerts).toHaveLength(2);
    expect(byIssue.get(`/issues/${world.mutedIssue.id}`)).toEqual(["in_app"]);
    expect(byIssue.get(`/issues/${world.otherIssue.id}`)).toEqual(["in_app", "email"]);
  });

  it("applies muting in notify() only when the payload names the project", async () => {
    const world = await makeWorld("uim5-notify");
    const { tenant } = world;
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);
    const base = { title: "t", body: "b", href: `/issues/${world.mutedIssue.id}`, actorId: null };
    const member = [tenant.userIds.member];

    expect(await notify(tenant.org.id, "comment_created", member, { ...base, projectId: world.muted.id })).toEqual([]);

    const personal = await notify(tenant.org.id, "issue_assigned", member, { ...base, projectId: world.muted.id });
    expect(personal.map((row) => row.channels)).toEqual([["in_app"]]);

    const elsewhere = await notify(tenant.org.id, "comment_created", member, { ...base, projectId: world.other.id });
    expect(elsewhere.map((row) => row.channels)).toEqual([["in_app", "email"]]);

    const unscoped = await notify(tenant.org.id, "comment_created", member, base);
    expect(unscoped.map((row) => row.channels)).toEqual([["in_app", "email"]]);
  });

  it("leaves a muted project out of the digest until it is unmuted", async () => {
    const world = await makeWorld("uim5-digest", 6);
    const { tenant } = world;
    await subscribeMemberToDigest(tenant);
    const email = "member@uim5-digest.test";

    await at("2026-06-02T05:00:00.000Z", async () => {
      await chatter(world, world.mutedIssue, "Muted project update");
      await chatter(world, world.otherIssue, "Other project update");
    });
    // Muted after the notifications were written.
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-06-02T06:00:00.000Z"));

    const first = mailsTo(sendSpy, email);
    expect(first).toHaveLength(1);
    expect(cell(first[0] ?? "", "entryCount")).toBe("1");
    expect(cell(first[0] ?? "", "headline")).toBe("Other project update");

    const unread = await notificationRepo.listUnreadSince(
      tenant.org.id,
      tenant.userIds.member,
      "2026-06-01T00:00:00.000Z" as IsoTimestamp,
    );
    expect(unread.map((row) => row.title)).toContain("Muted project update");
    expect(unread.map((row) => row.title)).not.toContain("Other project update");

    await unmuteProject(tenant.actors.member, tenant.org.id, world.muted.id);
    sendSpy.mockClear();
    await runDigestEmailJob(new Date("2026-06-02T06:30:00.000Z"));

    const second = mailsTo(sendSpy, email);
    expect(second).toHaveLength(1);
    expect(cell(second[0] ?? "", "entryCount")).toBe("1");
    expect(cell(second[0] ?? "", "headline")).toBe("Muted project update");
  });

  it("applies the digest cap to what is left after muting", async () => {
    const world = await makeWorld("uim5-digest-cap", 9);
    const { tenant } = world;
    await subscribeMemberToDigest(tenant);

    await at("2026-06-03T08:00:00.000Z", async () => {
      await chatter(world, world.otherIssue, "Other one");
      await chatter(world, world.otherIssue, "Other two");
    });
    await at("2026-06-03T08:10:00.000Z", async () => {
      for (let i = 0; i < 50; i += 1) await chatter(world, world.mutedIssue, `Muted ${i}`);
    });
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-06-03T09:00:00.000Z"));

    const sent = mailsTo(sendSpy, "member@uim5-digest-cap.test");
    expect(sent).toHaveLength(1);
    expect(cell(sent[0] ?? "", "entryCount")).toBe("2");
  });

  it("does not digest an in-app mention from a muted project", async () => {
    const world = await makeWorld("uim5-digest-mention", 11);
    const { tenant } = world;
    await subscribeMemberToDigest(tenant);
    await muteProject(tenant.actors.member, tenant.org.id, world.muted.id);

    await at("2026-06-04T10:00:00.000Z", () => comment(world, world.mutedIssue, [tenant.userIds.member]));

    const mention = await inbox(tenant, tenant.userIds.member, "comment_mention");
    expect(mention).toHaveLength(1);
    expect(mention[0]?.readAt).toBeNull();

    const sendSpy = vi.spyOn(emailService, "sendEmail").mockResolvedValue(undefined);
    await runDigestEmailJob(new Date("2026-06-04T11:00:00.000Z"));

    expect(mailsTo(sendSpy, "member@uim5-digest-mention.test")).toHaveLength(0);
  });

  it("keeps webhook deliveries flowing for a muted project", async () => {
    const world = await makeWorld("uim5-webhooks");
    const { tenant } = world;
    detachers.push(registerWebhookListeners());
    await webhookRepo.insertEndpoint(
      { orgId: tenant.org.id, url: "https://hooks.example.com/uim5", eventTypes: ["comment.created"] },
      "secret",
    );
    for (const role of ["owner", "admin", "member", "viewer"] as const) {
      await muteProject(tenant.actors[role], tenant.org.id, world.muted.id);
    }

    const enqueueSpy = vi.spyOn(webhookRepo, "enqueueDelivery");
    await emit("comment.created", {
      orgId: tenant.org.id,
      actorId: tenant.userIds.owner,
      occurredAt: world.mutedIssue.createdAt,
      commentId: "uim5-webhook-comment" as CommentId,
      issueId: world.mutedIssue.id,
      mentionedUserIds: [],
    });

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy.mock.calls[0]?.[2]).toBe("comment.created");
  });
});
