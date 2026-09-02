/**
 * Fan-out honours preferences and the digest flag.
 *
 * Owner C implements `@/server/services/notification-service`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { emit } from "@/lib/event-bus";
import { TenantScopeError } from "@/lib/tenant";
import * as issueService from "@/server/services/issue-service";
import * as preferenceRepo from "@/server/repositories/notification-preference-repository";
import {
  listNotifications,
  notify,
  resolveChannels,
} from "@/server/services/notification-service";
import {
  createTenant,
  issueInput,
  useTemporaryDatabase,
} from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { CommentId } from "@/types/common";
import type { FlagContext } from "@/types/feature-flag";

let cleanup: () => void;
let tenant: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("notify", "growth");
});

afterAll(() => {
  cleanup();
});

describe("services/notification-service", () => {
  // comment.created with mentions produces one comment_mention per mentioned user.
  it("creates one notification per mentioned user", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Mentions issue" }),
    );

    await emit("comment.created", {
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      occurredAt: issue.createdAt,
      commentId: "cmt-mentions-1" as CommentId,
      issueId: issue.id,
      mentionedUserIds: [tenant.userIds.admin, tenant.userIds.viewer],
    });

    const forAdmin = await listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.admin,
      unreadOnly: false,
      kind: ["comment_mention"],
      limit: 25,
      cursor: null,
    });
    const forViewer = await listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.viewer,
      unreadOnly: false,
      kind: ["comment_mention"],
      limit: 25,
      cursor: null,
    });

    expect(forAdmin.items).toHaveLength(1);
    expect(forViewer.items).toHaveLength(1);
    expect(forAdmin.items[0]?.kind).toBe("comment_mention");
  });

  // The actor who caused the event is not notified about their own action.
  it("does not notify the actor about their own action", async () => {
    const rows = await notify(
      tenant.org.id,
      "comment_created",
      [tenant.userIds.member, tenant.userIds.admin],
      {
        title: "New comment",
        body: "Someone commented",
        href: "/issues/x",
        actorId: tenant.userIds.member,
      },
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.recipientId).toBe(tenant.userIds.admin);
  });

  // NotificationPreference.email === false suppresses the email channel only.
  it("honours the per-kind email preference", async () => {
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.admin,
      kind: "issue_assigned",
      inApp: true,
      email: false,
      digestOnly: false,
    });

    const rows = await notify(tenant.org.id, "issue_assigned", [tenant.userIds.admin], {
      title: "Assigned",
      body: "You were assigned",
      href: "/issues/y",
      actorId: null,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.channels).toEqual(["in_app"]);
  });

  // digestOnly routes the entry to the digest instead of an immediate email.
  it("queues a digestOnly notification for the digest instead of sending", () => {
    const flagsWithDigest: FlagContext = {
      orgId: tenant.org.id,
      userId: null,
      plan: "growth",
      role: null,
      overrides: undefined,
    };

    const channels = resolveChannels(
      {
        orgId: tenant.org.id,
        userId: tenant.userIds.admin,
        kind: "digest_ready",
        inApp: true,
        email: true,
        digestOnly: true,
      },
      flagsWithDigest,
    );

    // The org's plan includes the digest_email flag, so the entry is still
    // routed to the "email" channel — it will go out with the digest run
    // rather than never leaving the in-app row.
    expect(channels).toEqual(["in_app", "email"]);
  });

  // isEnabled("digest_email", …) gates the digest channel by plan.
  it("skips the digest channel when the digest_email flag is off", () => {
    const flagsWithoutDigest: FlagContext = {
      orgId: tenant.org.id,
      userId: null,
      plan: "free",
      role: null,
      overrides: undefined,
    };

    const digestOnlyChannels = resolveChannels(
      {
        orgId: tenant.org.id,
        userId: tenant.userIds.admin,
        kind: "digest_ready",
        inApp: true,
        email: true,
        digestOnly: true,
      },
      flagsWithoutDigest,
    );

    // Without the plan flag, a digestOnly preference loses the email channel
    // entirely (the org has no digest run to defer it to).
    expect(digestOnlyChannels).toEqual(["in_app"]);

    // A non-digestOnly preference is unaffected by the flag.
    const immediateChannels = resolveChannels(
      {
        orgId: tenant.org.id,
        userId: tenant.userIds.admin,
        kind: "digest_ready",
        inApp: true,
        email: true,
        digestOnly: false,
      },
      flagsWithoutDigest,
    );
    expect(immediateChannels).toEqual(["in_app", "email"]);
  });

  // in_app is always recorded, even when email delivery is suppressed.
  it("always records the in-app notification", async () => {
    await preferenceRepo.upsertPreference({
      orgId: tenant.org.id,
      userId: tenant.userIds.viewer,
      kind: "member_joined",
      inApp: true,
      email: false,
      digestOnly: false,
    });

    const rows = await notify(tenant.org.id, "member_joined", [tenant.userIds.viewer], {
      title: "Member joined",
      body: "A member joined",
      href: "/settings/members",
      actorId: null,
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.channels).toContain("in_app");

    const page = await listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.viewer,
      unreadOnly: false,
      kind: ["member_joined"],
      limit: 25,
      cursor: null,
    });
    expect(page.items).toHaveLength(1);
  });

  // Notifications carry the org id and are only visible inside that tenant.
  it("scopes notifications to the recipient's organization", async () => {
    const other = await createTenant("notify-other", "growth");

    await notify(tenant.org.id, "member_joined", [tenant.userIds.owner], {
      title: "Member joined",
      body: "Welcome",
      href: "/settings/members",
      actorId: null,
    });

    await expect(
      listNotifications(other.actors.owner, {
        orgId: tenant.org.id,
        recipientId: tenant.userIds.owner,
        unreadOnly: false,
        limit: 25,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    const own = await listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.owner,
      unreadOnly: false,
      limit: 25,
      cursor: null,
    });
    expect(own.total).toBeGreaterThanOrEqual(1);
  });
});
