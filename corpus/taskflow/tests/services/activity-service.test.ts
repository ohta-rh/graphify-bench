/**
 * One audit row per domain event; day grouping.
 *
 * Owner C implements `@/server/services/activity-service`, which subscribes to
 * the event bus at module init.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/server/repositories/activity-repository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/repositories/activity-repository")>();
  return { ...actual, insertActivity: vi.fn(actual.insertActivity) };
});

import { emit, subscribe, subscriberCount } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { TenantScopeError } from "@/lib/tenant";
import * as activityRepo from "@/server/repositories/activity-repository";
import {
  exportActivity,
  groupByDay,
  listActivity,
  registerActivityListeners,
} from "@/server/services/activity-service";
import { createTenant, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { ActivityEvent } from "@/types/activity";
import type { CommentId, IssueId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
let detach: Unsubscribe;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  tenant = await createTenant("activity", "growth");
  detach = registerActivityListeners();
});

afterAll(() => {
  detach();
  cleanup();
});

afterEach(() => {
  vi.mocked(activityRepo.insertActivity).mockClear();
});

describe("services/activity-service", () => {
  // subscribe() is registered for each ActivityAction-shaped event type.
  it("subscribes to every event that maps to an ActivityAction", () => {
    const before = subscriberCount("project.created");
    const off = registerActivityListeners();

    // registerActivityListeners() is idempotent per call — each call attaches
    // its own listener set, so calling it a second time adds one more.
    expect(subscriberCount("project.created")).toBe(before + 1);
    expect(subscriberCount("issue.created")).toBeGreaterThanOrEqual(1);
    expect(subscriberCount("member.role_changed")).toBeGreaterThanOrEqual(1);
    expect(subscriberCount("billing.plan_changed")).toBeGreaterThanOrEqual(1);

    off();
    expect(subscriberCount("project.created")).toBe(before);
  });

  // One emit produces exactly one activity row, with the actor and subject.
  it("records one audit row per emitted event", async () => {
    await emit("project.created", {
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      occurredAt: tenant.org.createdAt,
      projectId: tenant.project.id,
      name: "Audited project",
      slug: "audited-project",
    });

    const page = await listActivity(tenant.actors.member, {
      orgId: tenant.org.id,
      action: ["project.created"],
      limit: 25,
      cursor: null,
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({
      orgId: tenant.org.id,
      action: "project.created",
      actorId: tenant.userIds.member,
      subjectKind: "project",
      subjectId: tenant.project.id,
    });
  });

  // A second identical emit produces a second row — the log is append-only.
  it("appends rather than de-duplicates repeated events", async () => {
    const payload = {
      orgId: tenant.org.id,
      actorId: tenant.userIds.member,
      occurredAt: tenant.org.createdAt,
      projectId: tenant.project.id,
      name: "Repeat project",
      slug: "repeat-project",
    } as const;

    const before = await listActivity(tenant.actors.member, {
      orgId: tenant.org.id,
      action: ["project.created"],
      limit: 100,
      cursor: null,
    });

    await emit("project.created", payload);
    await emit("project.created", payload);

    const after = await listActivity(tenant.actors.member, {
      orgId: tenant.org.id,
      action: ["project.created"],
      limit: 100,
      cursor: null,
    });

    expect(after.total).toBe(before.total + 2);
  });

  // A throwing repository must not fail the emit for sibling subscribers.
  it("isolates a write failure from the emitting service", async () => {
    vi.mocked(activityRepo.insertActivity).mockRejectedValueOnce(
      new Error("activity store unavailable"),
    );

    const sibling = vi.fn();
    const offSibling = subscribe("comment.created", sibling);

    await expect(
      emit("comment.created", {
        orgId: tenant.org.id,
        actorId: tenant.userIds.member,
        occurredAt: tenant.org.createdAt,
        commentId: "cmt-isolation" as CommentId,
        issueId: "issue-isolation" as IssueId,
        mentionedUserIds: [],
      }),
    ).resolves.toBeUndefined();

    expect(sibling).toHaveBeenCalledTimes(1);
    offSibling();
  });

  // groupByDay buckets rows into ActivityGroup entries keyed by calendar day.
  it("groups the feed into calendar days", () => {
    const orgId = tenant.org.id;
    const build = (id: string, day: string): ActivityEvent => ({
      id: id as ActivityEvent["id"],
      orgId,
      action: "issue.created",
      actorId: null,
      subjectKind: "issue",
      subjectId: "s1",
      projectId: null,
      summary: "Created issue",
      metadata: {},
      occurredAt: `${day}T10:00:00.000Z` as ActivityEvent["occurredAt"],
    });

    const groups = groupByDay([
      build("e1", "2026-01-01"),
      build("e2", "2026-01-02"),
      build("e3", "2026-01-01"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.day).toBe("2026-01-02");
    expect(groups[0]?.events).toHaveLength(1);
    expect(groups[1]?.day).toBe("2026-01-01");
    expect(groups[1]?.events).toHaveLength(2);
  });

  // Rows are scoped to the actor's org, and export needs activity:export.
  it("scopes the feed to the actor's organization", async () => {
    const other = await createTenant("activity-other", "growth");

    await expect(
      listActivity(other.actors.owner, {
        orgId: tenant.org.id,
        limit: 25,
        cursor: null,
      }),
    ).rejects.toBeInstanceOf(TenantScopeError);

    const own = await listActivity(tenant.actors.member, {
      orgId: tenant.org.id,
      limit: 25,
      cursor: null,
    });
    expect(own.total).toBeGreaterThanOrEqual(1);

    // Exporting the audit log needs activity:export, which only admin+ holds.
    await expect(
      exportActivity(tenant.actors.member, {
        orgId: tenant.org.id,
        since: tenant.org.createdAt,
        until: tenant.org.createdAt,
        format: "json",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);

    await expect(
      exportActivity(tenant.actors.admin, {
        orgId: tenant.org.id,
        since: tenant.org.createdAt,
        until: tenant.org.createdAt,
        format: "json",
      }),
    ).resolves.toEqual(expect.any(String));
  });
});
