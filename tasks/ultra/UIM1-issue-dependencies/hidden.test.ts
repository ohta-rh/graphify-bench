/**
 * Hidden test for UIM1: "blocked by" links between issues.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import { updateNotificationPreferenceSchema } from "@/schemas/notification";
import * as notificationRepo from "@/server/repositories/notification-repository";
import { NotFoundError } from "@/server/services/_support";
import {
  registerEventHandlers,
  unregisterEventHandlers,
} from "@/server/services/event-registry";
import * as dependencyService from "@/server/services/issue-dependency-service";
import { IssueBlockedError } from "@/server/services/issue-dependency-service";
import * as issueService from "@/server/services/issue-service";
import * as notificationService from "@/server/services/notification-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { UserId } from "@/types/common";
import type { Issue, IssueStatus } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Notification } from "@/types/notification";

let cleanup: () => void;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("uim1a", "growth");
  b = await createTenant("uim1b", "growth");
  registerEventHandlers();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

async function issue(
  t: Tenant,
  title: string,
  assigneeId: UserId | null = null,
): Promise<Issue> {
  return issueService.createIssue(
    t.actors.member,
    issueInput(t.org.id, t.project.id, { title, assigneeId }),
  );
}

async function block(t: Tenant, blocked: Issue, blocker: Issue, actor?: Actor) {
  return dependencyService.addBlocker(actor ?? t.actors.member, {
    orgId: t.org.id,
    issueId: blocked.id,
    blockerId: blocker.id,
  });
}

async function setStatus(t: Tenant, target: Issue, status: IssueStatus, actor?: Actor) {
  return issueService.changeIssueStatus(actor ?? t.actors.member, {
    orgId: t.org.id,
    issueId: target.id,
    status,
  });
}

async function blockerIds(t: Tenant, target: Issue): Promise<string[]> {
  return (await dependencyService.listBlockers(t.actors.member, t.org.id, target.id)).map(
    (row) => row.id,
  );
}

async function unblockedNotices(t: Tenant, recipientId: UserId, target: Issue): Promise<Notification[]> {
  const page = await notificationRepo.listNotifications({
    orgId: t.org.id,
    recipientId,
    unreadOnly: false,
    limit: 100,
    cursor: null,
  });
  return page.items.filter(
    (row) => row.kind === "issue_unblocked" && row.href === `/issues/${target.id}`,
  );
}

async function statusOf(t: Tenant, target: Issue): Promise<IssueStatus> {
  return (await issueService.getIssue(t.actors.member, t.org.id, target.id)).issue.status;
}

describe("UIM1 addBlocker / listBlockers", () => {
  it("records a link once and lists the blockers by issue number", async () => {
    const blocked = await issue(a, "Blocked work");
    const first = await issue(a, "First blocker");
    const second = await issue(a, "Second blocker");

    const link = await block(a, blocked, second);
    expect(link).toMatchObject({
      orgId: a.org.id,
      issueId: blocked.id,
      blockerId: second.id,
      createdBy: a.userIds.member,
    });

    await block(a, blocked, first);
    // Adding the same link again is not an error and does not duplicate it.
    const again = await block(a, blocked, first);
    expect(again).toMatchObject({ issueId: blocked.id, blockerId: first.id });

    expect(await blockerIds(a, blocked)).toEqual([first.id, second.id]);
    expect(await blockerIds(a, first)).toEqual([]);
  });

  it("rejects self-links and direct or transitive cycles without storing anything", async () => {
    const top = await issue(a, "Cycle top");
    const middle = await issue(a, "Cycle middle");
    const bottom = await issue(a, "Cycle bottom");

    await block(a, top, middle); // top is blocked by middle
    await block(a, middle, bottom); // middle is blocked by bottom

    await expect(block(a, top, top)).rejects.toThrow();
    await expect(block(a, middle, top)).rejects.toThrow();
    await expect(block(a, bottom, top)).rejects.toThrow();

    expect(await blockerIds(a, top)).toEqual([middle.id]);
    expect(await blockerIds(a, middle)).toEqual([bottom.id]);
    expect(await blockerIds(a, bottom)).toEqual([]);
  });

  it("keeps tenants apart", async () => {
    const mine = await issue(a, "Tenant A issue");
    const theirs = await issue(b, "Tenant B issue");

    await expect(
      dependencyService.addBlocker(a.actors.member, {
        orgId: b.org.id,
        issueId: theirs.id,
        blockerId: theirs.id,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    await expect(block(a, mine, theirs)).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      dependencyService.listBlockers(a.actors.member, a.org.id, theirs.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await blockerIds(a, mine)).toEqual([]);
    expect(await blockerIds(b, theirs)).toEqual([]);
  });

  it("needs the permission to update the blocked issue, for adding and removing", async () => {
    const blocked = await issue(a, "Guarded issue");
    const blocker = await issue(a, "Guard blocker");

    await expect(block(a, blocked, blocker, a.actors.viewer)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(await blockerIds(a, blocked)).toEqual([]);

    await block(a, blocked, blocker);
    await expect(
      dependencyService.removeBlocker(a.actors.viewer, {
        orgId: a.org.id,
        issueId: blocked.id,
        blockerId: blocker.id,
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(await blockerIds(a, blocked)).toEqual([blocker.id]);
  });

  it("refuses to link archived issues on either side", async () => {
    const live = await issue(a, "Live side");
    const gone = await issue(a, "Archived side");
    await issueService.archiveIssue(a.actors.member, a.org.id, gone.id);

    await expect(block(a, live, gone)).rejects.toBeInstanceOf(AlreadyArchivedError);
    await expect(block(a, gone, live)).rejects.toBeInstanceOf(AlreadyArchivedError);
    expect(await blockerIds(a, live)).toEqual([]);
  });
});

describe("UIM1 completion gate", () => {
  it("refuses to complete an issue while it has open blockers", async () => {
    const blocked = await issue(a, "Gate: blocked");
    const open = await issue(a, "Gate: open blocker");
    const closed = await issue(a, "Gate: closed blocker");
    await setStatus(a, closed, "done");
    await block(a, blocked, open);
    await block(a, blocked, closed);

    const transitions: unknown[] = [];
    const off = subscribe("issue.status_changed", (payload) => {
      if (payload.issueId === blocked.id) transitions.push(payload);
    });

    try {
      const error = await setStatus(a, blocked, "done").catch((caught: unknown) => caught);
      expect(error).toBeInstanceOf(IssueBlockedError);
      expect((error as IssueBlockedError).code).toBe("conflict");
      expect([...(error as IssueBlockedError).blockerIds]).toEqual([open.id]);

      await expect(
        issueService.moveIssue(a.actors.member, {
          orgId: a.org.id,
          issueId: blocked.id,
          toStatus: "done",
          toIndex: 0,
        }),
      ).rejects.toBeInstanceOf(IssueBlockedError);

      expect(await statusOf(a, blocked)).toBe("backlog");
      expect(transitions).toHaveLength(0);

      // Other transitions stay allowed.
      await setStatus(a, blocked, "in_review");
      expect(await statusOf(a, blocked)).toBe("in_review");
    } finally {
      off();
    }
  });

  it("lets the issue complete once blockers are closed, archived or unlinked", async () => {
    const one = await issue(a, "Release one");
    const oneBlocker = await issue(a, "Release one blocker");
    await block(a, one, oneBlocker);
    await setStatus(a, oneBlocker, "canceled");
    await setStatus(a, one, "done");
    expect(await statusOf(a, one)).toBe("done");

    const two = await issue(a, "Release two");
    const twoBlocker = await issue(a, "Release two blocker");
    await block(a, two, twoBlocker);
    await issueService.archiveIssue(a.actors.member, a.org.id, twoBlocker.id);
    expect(await blockerIds(a, two)).toEqual([]);
    await setStatus(a, two, "done");
    expect(await statusOf(a, two)).toBe("done");

    const three = await issue(a, "Release three");
    const threeBlocker = await issue(a, "Release three blocker");
    await block(a, three, threeBlocker);
    const input = { orgId: a.org.id, issueId: three.id, blockerId: threeBlocker.id };
    expect(await dependencyService.removeBlocker(a.actors.member, input)).toBe(true);
    expect(await dependencyService.removeBlocker(a.actors.member, input)).toBe(false);
    await setStatus(a, three, "done");
    expect(await statusOf(a, three)).toBe("done");
  });
});

describe("UIM1 unblocked notification", () => {
  it("tells the assignee once the last open blocker closes", async () => {
    const blocked = await issue(a, "Notify: blocked", a.userIds.admin);
    const first = await issue(a, "Notify: first");
    const second = await issue(a, "Notify: second");
    await block(a, blocked, first);
    await block(a, blocked, second);

    await setStatus(a, first, "done");
    expect(await unblockedNotices(a, a.userIds.admin, blocked)).toHaveLength(0);

    await setStatus(a, second, "canceled");
    const notices = await unblockedNotices(a, a.userIds.admin, blocked);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toMatchObject({
      orgId: a.org.id,
      recipientId: a.userIds.admin,
      kind: "issue_unblocked",
      actorId: a.userIds.member,
      href: `/issues/${blocked.id}`,
    });
  });

  it("notifies only on open-to-closed transitions, and again after a reopen", async () => {
    const blocked = await issue(a, "Reopen: blocked", a.userIds.admin);
    const blocker = await issue(a, "Reopen: blocker");
    await block(a, blocked, blocker);

    await setStatus(a, blocker, "done");
    expect(await unblockedNotices(a, a.userIds.admin, blocked)).toHaveLength(1);

    // Closed to closed is not an unblocking.
    await setStatus(a, blocker, "canceled");
    expect(await unblockedNotices(a, a.userIds.admin, blocked)).toHaveLength(1);

    // Reopening blocks again; closing again unblocks again.
    await setStatus(a, blocker, "todo");
    await expect(setStatus(a, blocked, "done")).rejects.toBeInstanceOf(IssueBlockedError);
    await setStatus(a, blocker, "done");
    expect(await unblockedNotices(a, a.userIds.admin, blocked)).toHaveLength(2);
  });

  it("treats archiving an open blocker as closing it, but not an already-closed one", async () => {
    const byArchive = await issue(a, "Archive: blocked", a.userIds.admin);
    const openBlocker = await issue(a, "Archive: open blocker");
    await block(a, byArchive, openBlocker);
    await issueService.archiveIssue(a.actors.member, a.org.id, openBlocker.id);
    expect(await unblockedNotices(a, a.userIds.admin, byArchive)).toHaveLength(1);

    const once = await issue(a, "Archive: closed then archived", a.userIds.admin);
    const doneBlocker = await issue(a, "Archive: done blocker");
    await block(a, once, doneBlocker);
    await setStatus(a, doneBlocker, "done");
    expect(await unblockedNotices(a, a.userIds.admin, once)).toHaveLength(1);
    // Archiving a blocker that is already closed changes nothing for `once`.
    await issueService.archiveIssue(a.actors.member, a.org.id, doneBlocker.id);
    expect(await unblockedNotices(a, a.userIds.admin, once)).toHaveLength(1);
  });

  it("unblocks every dependant that has no other open blocker", async () => {
    const shared = await issue(a, "Fan: shared blocker");
    const free = await issue(a, "Fan: freed", a.userIds.admin);
    const held = await issue(a, "Fan: still held", a.userIds.admin);
    const holder = await issue(a, "Fan: holder");
    await block(a, free, shared);
    await block(a, held, shared);
    await block(a, held, holder);

    await setStatus(a, shared, "done");
    expect(await unblockedNotices(a, a.userIds.admin, free)).toHaveLength(1);
    expect(await unblockedNotices(a, a.userIds.admin, held)).toHaveLength(0);
  });

  it("sends nothing when there is nobody to tell", async () => {
    const unassigned = await issue(a, "Quiet: unassigned");
    const selfAssigned = await issue(a, "Quiet: closer is assignee", a.userIds.member);
    const archived = await issue(a, "Quiet: archived dependant", a.userIds.admin);
    const cancelled = await issue(a, "Quiet: cancelled dependant", a.userIds.admin);
    const blocker = await issue(a, "Quiet: blocker");
    for (const dependant of [unassigned, selfAssigned, archived, cancelled]) {
      await block(a, dependant, blocker);
    }
    await issueService.archiveIssue(a.actors.member, a.org.id, archived.id);
    await setStatus(a, cancelled, "canceled");

    await setStatus(a, blocker, "done", a.actors.member);

    expect(await unblockedNotices(a, a.userIds.member, selfAssigned)).toHaveLength(0);
    expect(await unblockedNotices(a, a.userIds.admin, archived)).toHaveLength(0);
    expect(await unblockedNotices(a, a.userIds.admin, cancelled)).toHaveLength(0);
  });

  it("is a notification kind recipients can mute", async () => {
    const parsed = updateNotificationPreferenceSchema.parse({
      orgId: b.org.id,
      userId: b.userIds.admin,
      kind: "issue_unblocked",
      inApp: false,
      email: false,
      digestOnly: false,
    });
    await notificationService.updatePreference(b.actors.admin, parsed);

    const muted = await issue(b, "Muted: blocked", b.userIds.admin);
    const heard = await issue(b, "Heard: blocked", b.userIds.owner);
    const blocker = await issue(b, "Mute: blocker");
    await block(b, muted, blocker);
    await block(b, heard, blocker);

    await setStatus(b, blocker, "done");
    expect(await unblockedNotices(b, b.userIds.admin, muted)).toHaveLength(0);
    expect(await unblockedNotices(b, b.userIds.owner, heard)).toHaveLength(1);
    // Nothing leaks into the other tenant.
    expect(await unblockedNotices(a, a.userIds.owner, heard)).toHaveLength(0);
  });
});
