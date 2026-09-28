/**
 * EIM2 — bulk issue import.
 *
 * One upload becomes one batch of issues: the same gates as a single create,
 * applied once to the whole batch; one `issues.imported` announcement instead
 * of a per-issue fan-out; and a replay-safe import key.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { subscribe } from "@/lib/event-bus";
import { PermissionDeniedError } from "@/lib/permissions";
import { AlreadyArchivedError } from "@/lib/soft-delete";
import { TenantScopeError } from "@/lib/tenant";
import * as activityRepo from "@/server/repositories/activity-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as labelRepo from "@/server/repositories/label-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as usageRepo from "@/server/repositories/usage-repository";
import * as webhookRepo from "@/server/repositories/webhook-repository";
import { NotFoundError } from "@/server/services/_support";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import { listNotifications } from "@/server/services/notification-service";
import * as projectService from "@/server/services/project-service";
import * as searchService from "@/server/services/search-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { ImportIssuesInput } from "@/schemas/issue-import";
import type { IsoTimestamp, ProjectId } from "@/types/common";
import type { TaskflowEventMap, TaskflowEventType, Unsubscribe } from "@/types/event";

let cleanup: () => void;
const detachers: Unsubscribe[] = [];

function capture<K extends TaskflowEventType>(type: K): TaskflowEventMap[K][] {
  const seen: TaskflowEventMap[K][] = [];
  detachers.push(
    subscribe(type, (payload) => {
      seen.push(payload);
    }),
  );
  return seen;
}

type Row = ImportIssuesInput["rows"][number];

function row(title: string, overrides: Partial<Row> = {}): Row {
  return {
    title,
    description: null,
    status: "backlog",
    priority: "none",
    assigneeEmail: null,
    labels: [],
    dueAt: null,
    ...overrides,
  };
}

function upload(
  tenant: Tenant,
  importKey: string,
  rows: readonly Row[],
  projectId: ProjectId = tenant.project.id,
): ImportIssuesInput {
  return { orgId: tenant.org.id, projectId, importKey, rows: [...rows] };
}

async function liveCount(tenant: Tenant): Promise<number> {
  return issueRepo.countIssues(tenant.org.id, tenant.project.id);
}

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
});

afterEach(() => {
  while (detachers.length > 0) detachers.pop()?.();
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
  vi.restoreAllMocks();
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

describe("EIM2 — bulk issue import", () => {
  it("creates one issue per row, in file order, with the row's fields", async () => {
    const tenant = await createTenant("eim2-fields");
    const due = "2026-09-30T12:00:00.000Z" as IsoTimestamp;

    const result = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "fields-0001", [
        row("First imported", {
          description: "Carried over",
          status: "in_review",
          priority: "high",
          dueAt: due,
        }),
        row("Second imported"),
        row("Third imported", { status: "done" }),
      ]),
    );

    expect(result.replayed).toBe(false);
    expect(result.importKey).toBe("fields-0001");
    expect(result.projectId).toBe(tenant.project.id);
    expect(result.issues.map((issue) => issue.title)).toEqual([
      "First imported",
      "Second imported",
      "Third imported",
    ]);

    const first = result.issues[0];
    expect(first).toMatchObject({
      orgId: tenant.org.id,
      projectId: tenant.project.id,
      description: "Carried over",
      status: "in_review",
      priority: "high",
      dueAt: due,
      authorId: tenant.userIds.member,
      assigneeId: null,
      parentId: null,
      estimate: null,
      archivedAt: null,
    });
    expect(result.issues[1]).toMatchObject({ status: "backlog", priority: "none", description: null });

    const stored = await issueRepo.findIssueById(tenant.org.id, first?.id as never);
    expect(stored).toMatchObject({ title: "First imported", status: "in_review", dueAt: due });
    expect(await liveCount(tenant)).toBe(3);
  });

  it("numbers imported issues after the project's highest number and keeps counting afterwards", async () => {
    const tenant = await createTenant("eim2-numbering");
    await issueService.createIssue(tenant.actors.member, issueInput(tenant.org.id, tenant.project.id, { title: "Existing one" }));
    const archived = await issueService.createIssue(tenant.actors.member, issueInput(tenant.org.id, tenant.project.id, { title: "Existing two" }));
    await issueService.archiveIssue(tenant.actors.member, tenant.org.id, archived.id);

    const result = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "numbering-01", [row("Imported A"), row("Imported B"), row("Imported C")]),
    );
    expect(result.issues.map((issue) => issue.number)).toEqual([3, 4, 5]);

    const next = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "After import" }),
    );
    expect(next.number).toBe(6);
  });

  it("resolves assignees by the email of current active members, case-insensitively", async () => {
    const tenant = await createTenant("eim2-assignees");
    const other = await createTenant("eim2-assignees-other");
    const admin = await memberRepo.findMember(tenant.org.id, tenant.userIds.admin);
    if (!admin) throw new Error("fixture admin missing");
    await memberRepo.archiveMember(tenant.org.id, admin.id);

    const result = await issueService.importIssues(
      tenant.actors.owner,
      upload(tenant, "assignees-001", [
        row("To the member", { assigneeEmail: "MEMBER@eim2-assignees.test" }),
        row("To the viewer", { assigneeEmail: "viewer@eim2-assignees.test" }),
        row("To nobody known", { assigneeEmail: "nobody@example.com" }),
        row("To a removed member", { assigneeEmail: "admin@eim2-assignees.test" }),
        row("To another workspace's owner", { assigneeEmail: "owner@eim2-assignees-other.test" }),
      ]),
    );

    expect(result.issues.map((issue) => issue.assigneeId)).toEqual([
      tenant.userIds.member,
      tenant.userIds.viewer,
      null,
      null,
      null,
    ]);
    expect(other.userIds.owner).not.toBe(result.issues[4]?.assigneeId);
  });

  it("does not alert imported assignees", async () => {
    const tenant = await createTenant("eim2-no-alerts");

    await issueService.importIssues(
      tenant.actors.owner,
      upload(tenant, "no-alerts-001", [
        row("Quietly assigned", { assigneeEmail: "member@eim2-no-alerts.test" }),
      ]),
    );

    const inbox = await listNotifications(tenant.actors.owner, {
      orgId: tenant.org.id,
      recipientId: tenant.userIds.member,
      unreadOnly: false,
      limit: 25,
      cursor: null,
    });
    expect(inbox.total).toBe(0);
  });

  it("links existing labels by exact name and creates missing ones once", async () => {
    const tenant = await createTenant("eim2-labels");
    const other = await createTenant("eim2-labels-other");
    const bug = await labelRepo.insertLabel({ orgId: tenant.org.id, name: "bug", color: "#ff0000", description: null });
    await labelRepo.insertLabel({ orgId: other.org.id, name: "migrated", color: "#00ff00", description: null });

    const result = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "labels-00001", [
        row("Both labels", { labels: ["bug", "migrated"] }),
        row("Repeated label", { labels: ["migrated", "migrated"] }),
        row("Different case", { labels: ["Bug"] }),
        row("No labels"),
      ]),
    );

    const labels = await labelRepo.listLabels(tenant.org.id);
    const names = labels.map((label) => label.name).sort();
    expect(names).toEqual(["Bug", "bug", "migrated"]);
    const migrated = labels.find((label) => label.name === "migrated");
    const capitalBug = labels.find((label) => label.name === "Bug");
    if (!migrated || !capitalBug) throw new Error("labels were not created");
    expect(migrated.orgId).toBe(tenant.org.id);
    expect(migrated.color).toBe("#94a3b8");
    expect(migrated.description).toBeNull();

    expect([...(result.issues[0]?.labelIds ?? [])].sort()).toEqual([bug.id, migrated.id].sort());
    expect(result.issues[1]?.labelIds).toEqual([migrated.id]);
    expect(result.issues[2]?.labelIds).toEqual([capitalBug.id]);
    expect(result.issues[3]?.labelIds).toEqual([]);

    const reread = await issueRepo.findIssueById(tenant.org.id, result.issues[0]?.id as never);
    expect([...(reread?.labelIds ?? [])].sort()).toEqual([bug.id, migrated.id].sort());

    const otherLabels = await labelRepo.listLabels(other.org.id);
    expect(otherLabels).toHaveLength(1);
  });

  it("publishes exactly one issues.imported event and no issue.created", async () => {
    const tenant = await createTenant("eim2-events");
    const created = capture("issue.created");
    const imported = capture("issues.imported");

    const result = await issueService.importIssues(
      tenant.actors.admin,
      upload(tenant, "events-00001", [row("Event one"), row("Event two")]),
    );

    expect(created).toHaveLength(0);
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      orgId: tenant.org.id,
      actorId: tenant.userIds.admin,
      projectId: tenant.project.id,
      importKey: "events-00001",
      issueIds: result.issues.map((issue) => issue.id),
    });
  });

  it("makes imported issues searchable right away", async () => {
    const tenant = await createTenant("eim2-search");

    await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "search-00001", [row("Xylophone migration target"), row("Quetzal migration target")]),
    );

    const hits = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "migration target",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(hits.total).toBe(2);
    expect(hits.items.map((hit) => hit.title).sort()).toEqual([
      "Quetzal migration target",
      "Xylophone migration target",
    ]);
  });

  it("raises the issues-used meter by the batch size, in step with a full recount", async () => {
    const tenant = await createTenant("eim2-usage");
    await usageRepo.recomputeUsage(tenant.org.id);
    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(0);

    await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "usage-000001", [row("Meter one"), row("Meter two"), row("Meter three")]),
    );

    expect((await usageRepo.getUsage(tenant.org.id)).issuesUsed).toBe(3);
    expect((await usageRepo.recomputeUsage(tenant.org.id)).issuesUsed).toBe(3);
  });

  it("records one audit entry for the import, about the project, and none per issue", async () => {
    const tenant = await createTenant("eim2-audit");

    await issueService.importIssues(
      tenant.actors.admin,
      upload(tenant, "audit-000001", [row("Audited one"), row("Audited two")]),
    );

    const imports = await activityRepo.listActivity({
      orgId: tenant.org.id,
      action: ["issues.imported"],
      limit: 25,
      cursor: null,
    });
    expect(imports.total).toBe(1);
    expect(imports.items[0]).toMatchObject({
      actorId: tenant.userIds.admin,
      subjectKind: "project",
      subjectId: tenant.project.id,
      projectId: tenant.project.id,
      metadata: { count: 2, importKey: "audit-000001" },
    });

    const perIssue = await activityRepo.listActivity({
      orgId: tenant.org.id,
      action: ["issue.created"],
      limit: 25,
      cursor: null,
    });
    expect(perIssue.total).toBe(0);
  });

  it("creates no webhook deliveries for an import", async () => {
    const tenant = await createTenant("eim2-webhooks");
    await webhookRepo.insertEndpoint(
      {
        orgId: tenant.org.id,
        url: "https://hooks.example.com/eim2",
        eventTypes: ["issue.created", "issue.updated", "issue.assigned"],
      },
      "secret",
    );
    const enqueueSpy = vi.spyOn(webhookRepo, "enqueueDelivery");

    await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "webhooks-0001", [
        row("Hooked one", { assigneeEmail: "member@eim2-webhooks.test" }),
        row("Hooked two"),
      ]),
    );

    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it("replays the same key without creating anything, whatever the rows say", async () => {
    const tenant = await createTenant("eim2-replay");

    const first = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "replay-00001", [row("Replay one"), row("Replay two")]),
    );

    const created = capture("issue.created");
    const imported = capture("issues.imported");
    const again = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "replay-00001", [row("Changed one"), row("Changed two"), row("Changed three")]),
    );

    expect(again.replayed).toBe(true);
    expect(again.issues.map((issue) => issue.id)).toEqual(first.issues.map((issue) => issue.id));
    expect(again.issues.map((issue) => issue.title)).toEqual(["Replay one", "Replay two"]);
    expect(await liveCount(tenant)).toBe(2);
    expect(created).toHaveLength(0);
    expect(imported).toHaveLength(0);
  });

  it("treats a different key as a new import even with identical rows", async () => {
    const tenant = await createTenant("eim2-new-key");

    const first = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "new-key-0001", [row("Same rows")]),
    );
    const second = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "new-key-0002", [row("Same rows")]),
    );

    expect(second.replayed).toBe(false);
    expect(second.issues[0]?.id).not.toBe(first.issues[0]?.id);
    expect(second.issues[0]?.number).toBe(2);
    expect(await liveCount(tenant)).toBe(2);
  });

  it("scopes import keys to the workspace", async () => {
    const tenantA = await createTenant("eim2-key-scope-a");
    const tenantB = await createTenant("eim2-key-scope-b");

    const a = await issueService.importIssues(
      tenantA.actors.member,
      upload(tenantA, "shared-key-01", [row("In A")]),
    );
    const b = await issueService.importIssues(
      tenantB.actors.member,
      upload(tenantB, "shared-key-01", [row("In B")]),
    );

    expect(b.replayed).toBe(false);
    expect(b.issues[0]?.orgId).toBe(tenantB.org.id);
    expect(b.issues[0]?.id).not.toBe(a.issues[0]?.id);
    expect(await liveCount(tenantA)).toBe(1);
    expect(await liveCount(tenantB)).toBe(1);
  });

  it("applies the per-project issue quota to the whole batch and creates nothing when it does not fit", async () => {
    const tenant = await createTenant("eim2-quota", "free");
    for (let number = 1; number <= 98; number += 1) {
      await issueRepo.insertIssue(
        issueInput(tenant.org.id, tenant.project.id, { title: `Seed ${number}` }),
        tenant.userIds.member,
        number,
      );
    }

    await expect(
      issueService.importIssues(
        tenant.actors.member,
        upload(tenant, "quota-000001", [row("Over one"), row("Over two"), row("Over three")]),
      ),
    ).rejects.toThrow();
    expect(await liveCount(tenant)).toBe(98);

    const fits = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "quota-000002", [row("Fits one"), row("Fits two")]),
    );
    expect(fits.issues.map((issue) => issue.number)).toEqual([99, 100]);
    expect(await liveCount(tenant)).toBe(100);

    await expect(
      issueService.createIssue(
        tenant.actors.member,
        issueInput(tenant.org.id, tenant.project.id, { title: "One too many" }),
      ),
    ).rejects.toThrow();
  });

  it("refuses an import the workspace's rate allowance cannot cover, creating nothing and burning no key", async () => {
    const tenant = await createTenant("eim2-rate-limit");
    rateLimitState.allowed = false;

    await expect(
      issueService.importIssues(
        tenant.actors.member,
        upload(tenant, "rate-limit-001", [row("Throttled one"), row("Throttled two")]),
      ),
    ).rejects.toThrow();
    expect(await liveCount(tenant)).toBe(0);

    rateLimitState.allowed = true;
    const retried = await issueService.importIssues(
      tenant.actors.member,
      upload(tenant, "rate-limit-001", [row("Throttled one"), row("Throttled two")]),
    );
    expect(retried.replayed).toBe(false);
    expect(retried.issues).toHaveLength(2);
  });

  it("requires the permission to create issues in the project", async () => {
    const tenant = await createTenant("eim2-permission");

    await expect(
      issueService.importIssues(
        tenant.actors.viewer,
        upload(tenant, "permission-01", [row("Viewer cannot")]),
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(await liveCount(tenant)).toBe(0);
  });

  it("refuses an import into an archived project", async () => {
    const tenant = await createTenant("eim2-archived");
    await projectService.archiveProject(tenant.actors.admin, {
      orgId: tenant.org.id,
      projectId: tenant.project.id,
      archiveIssues: true,
    });

    await expect(
      issueService.importIssues(
        tenant.actors.admin,
        upload(tenant, "archived-0001", [row("Into the archive")]),
      ),
    ).rejects.toBeInstanceOf(AlreadyArchivedError);
  });

  it("keeps imports inside the actor's workspace", async () => {
    const tenantA = await createTenant("eim2-tenant-a");
    const tenantB = await createTenant("eim2-tenant-b");

    await expect(
      issueService.importIssues(
        tenantB.actors.owner,
        upload(tenantA, "tenant-00001", [row("Wrong workspace")]),
      ),
    ).rejects.toBeInstanceOf(TenantScopeError);

    await expect(
      issueService.importIssues(
        tenantA.actors.owner,
        upload(tenantA, "tenant-00002", [row("Foreign project")], tenantB.project.id),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    expect(await liveCount(tenantA)).toBe(0);
    expect(await liveCount(tenantB)).toBe(0);
  });
});
