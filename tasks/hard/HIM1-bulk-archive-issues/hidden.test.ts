/**
 * Hidden test for HIM1: bulk archive of issues.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import { bulkArchiveIssuesSchema } from "@/schemas/issue";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as issueService from "@/server/services/issue-service";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { IssueId, UserId } from "@/types/common";

let cleanup: () => void;
let a: Tenant;
let b: Tenant;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  a = await createTenant("him1a", "growth");
  b = await createTenant("him1b", "growth");
});

afterAll(() => {
  cleanup();
});

afterEach(() => {
  vi.useRealTimers();
});

async function newIssue(t: Tenant, title: string, assigneeId: UserId | null = null) {
  return issueService.createIssue(
    t.actors.member,
    issueInput(t.org.id, t.project.id, { title, assigneeId }),
  );
}

describe("HIM1 issueService.bulkArchiveIssues", () => {
  it("archives live issues, skips unknown, foreign and already-archived ids", async () => {
    const one = await newIssue(a, "Bulk one");
    const two = await newIssue(a, "Bulk two");
    const old = await newIssue(a, "Already archived");
    const foreign = await newIssue(b, "Other tenant issue");

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-05T10:00:00.000Z"));
    await issueService.archiveIssue(a.actors.member, a.org.id, old.id);
    vi.setSystemTime(new Date("2026-02-10T10:00:00.000Z"));

    const result = await issueService.bulkArchiveIssues(a.actors.member, {
      orgId: a.org.id,
      issueIds: [one.id, old.id, foreign.id, two.id, one.id],
    });

    expect([...result.archived]).toEqual([one.id, two.id]);
    expect([...result.skipped]).toEqual([old.id, foreign.id]);

    expect((await issueRepo.findIssueById(a.org.id, one.id))?.archivedAt).not.toBeNull();
    expect((await issueRepo.findIssueById(a.org.id, two.id))?.archivedAt).not.toBeNull();
    // An already-archived issue keeps its original archive stamp.
    expect((await issueRepo.findIssueById(a.org.id, old.id))?.archivedAt).toBe(
      "2026-01-05T10:00:00.000Z",
    );
    // The other tenant's issue is untouched.
    expect((await issueRepo.findIssueById(b.org.id, foreign.id))?.archivedAt).toBeNull();
  });

  it("publishes issue.archived once per archived issue and never for skipped ids", async () => {
    const x = await newIssue(a, "Event x");
    const y = await newIssue(a, "Event y");
    const gone = await newIssue(a, "Event gone");
    await issueService.archiveIssue(a.actors.member, a.org.id, gone.id);

    const received: { issueId: string; projectId: string; orgId: string }[] = [];
    const off = subscribe("issue.archived", (payload) => {
      received.push(payload);
    });
    try {
      await issueService.bulkArchiveIssues(a.actors.admin, {
        orgId: a.org.id,
        issueIds: [x.id, gone.id, y.id],
      });
    } finally {
      off();
    }

    expect(received.map((p) => p.issueId).sort()).toEqual([x.id, y.id].sort());
    for (const payload of received) {
      expect(payload.projectId).toBe(a.project.id);
      expect(payload.orgId).toBe(a.org.id);
    }
  });

  it("lets a viewer archive issues they are assigned to", async () => {
    const mine = await newIssue(a, "Assigned to viewer", a.userIds.viewer);

    const result = await issueService.bulkArchiveIssues(a.actors.viewer, {
      orgId: a.org.id,
      issueIds: [mine.id],
    });

    expect([...result.archived]).toEqual([mine.id]);
    expect((await issueRepo.findIssueById(a.org.id, mine.id))?.archivedAt).not.toBeNull();
  });

  it("rejects the whole request when any issue may not be archived by the caller", async () => {
    const mine = await newIssue(a, "Viewer owns this", a.userIds.viewer);
    const theirs = await newIssue(a, "Viewer does not own this");

    const received: unknown[] = [];
    const off = subscribe("issue.archived", (payload) => {
      received.push(payload);
    });
    try {
      await expect(
        issueService.bulkArchiveIssues(a.actors.viewer, {
          orgId: a.org.id,
          issueIds: [mine.id, theirs.id],
        }),
      ).rejects.toBeInstanceOf(PermissionDeniedError);
    } finally {
      off();
    }

    expect(received).toHaveLength(0);
    expect((await issueRepo.findIssueById(a.org.id, mine.id))?.archivedAt).toBeNull();
    expect((await issueRepo.findIssueById(a.org.id, theirs.id))?.archivedAt).toBeNull();
  });

  it("does not hold skipped ids against the caller's permissions", async () => {
    const mine = await newIssue(a, "Viewer owns this too", a.userIds.viewer);
    const theirsArchived = await newIssue(a, "Archived, not the viewer's");
    await issueService.archiveIssue(a.actors.member, a.org.id, theirsArchived.id);
    const foreign = await newIssue(b, "Foreign for viewer");

    const result = await issueService.bulkArchiveIssues(a.actors.viewer, {
      orgId: a.org.id,
      issueIds: [theirsArchived.id, mine.id, foreign.id],
    });

    expect([...result.archived]).toEqual([mine.id]);
    expect([...result.skipped]).toEqual([theirsArchived.id, foreign.id]);
  });

  it("refuses to act on another organization", async () => {
    const foreign = await newIssue(b, "Cross-tenant target");

    await expect(
      issueService.bulkArchiveIssues(a.actors.owner, {
        orgId: b.org.id,
        issueIds: [foreign.id],
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    expect((await issueRepo.findIssueById(b.org.id, foreign.id))?.archivedAt).toBeNull();
  });

  it("finds issues by id within one org, archived ones included", async () => {
    const live = await newIssue(a, "Lookup live");
    const archived = await newIssue(a, "Lookup archived");
    await issueService.archiveIssue(a.actors.member, a.org.id, archived.id);
    const foreign = await newIssue(b, "Lookup foreign");

    const found = await issueRepo.findIssuesByIds(a.org.id, [live.id, archived.id, foreign.id]);
    expect(found.map((issue) => issue.id).sort()).toEqual([live.id, archived.id].sort());
    expect(await issueRepo.findIssuesByIds(a.org.id, [])).toEqual([]);
  });

  it("validates the request shape", () => {
    const id = (n: number) => `01HZZZ${String(n).padStart(20, "0")}` as IssueId;
    const orgId = a.org.id;

    expect(bulkArchiveIssuesSchema.safeParse({ orgId, issueIds: [] }).success).toBe(false);
    expect(
      bulkArchiveIssuesSchema.safeParse({
        orgId,
        issueIds: Array.from({ length: 50 }, (_, i) => id(i + 1)),
      }).success,
    ).toBe(true);
    expect(
      bulkArchiveIssuesSchema.safeParse({
        orgId,
        issueIds: Array.from({ length: 51 }, (_, i) => id(i + 1)),
      }).success,
    ).toBe(false);
  });
});
