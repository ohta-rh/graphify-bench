/**
 * BFX2 — the issue list filter vocabulary.
 *
 * One vocabulary for the URL codec, the filter schema and the repository:
 * `me` / `none`, the status groups `open` / `closed`, all-of labels, the two
 * forms of `due_before`, and `archived=1` / `archived=only`. The reported
 * total always matches the rows.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { issueFilterToParams, parseIssueFilterParams } from "@/hooks/issue-filter-params";
import { runMigrations } from "@/server/db/migrate";
import { issueFilterSchema } from "@/schemas/issue";
import * as labelRepo from "@/server/repositories/label-repository";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as issueService from "@/server/services/issue-service";
import type { PlanId } from "@/types/billing";
import type { IsoTimestamp, LabelId, UserId } from "@/types/common";
import type { Issue, IssueFilter, IssueStatus } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

type Tenant = {
  org: Organization;
  project: Project;
  owner: Actor;
  member: Actor;
};

let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bfx2-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

async function makeTenant(slug: string, plan: PlanId = "growth"): Promise<Tenant> {
  const ownerUser = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, ownerUser.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");
  await memberRepo.insertMember(org.id, ownerUser.id, "owner", null);

  const memberUser = await userRepo.insertUser({
    email: `member@${slug}.test`,
    name: `${slug} member`,
    passwordHash: "seed",
  });
  await memberRepo.insertMember(org.id, memberUser.id, "member", null);

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: ownerUser.id,
    color: "#6366f1",
    targetDate: null,
  });

  return {
    org,
    project,
    owner: { userId: ownerUser.id, orgId: org.id, role: "owner" },
    member: { userId: memberUser.id, orgId: org.id, role: "member" },
  };
}

async function addIssue(
  tenant: Tenant,
  title: string,
  overrides: Partial<{
    by: Actor;
    status: IssueStatus;
    assigneeId: UserId | null;
    labelIds: readonly LabelId[];
    dueAt: string | null;
  }> = {},
): Promise<Issue> {
  return issueService.createIssue(overrides.by ?? tenant.member, {
    orgId: tenant.org.id,
    projectId: tenant.project.id,
    title,
    description: null,
    status: overrides.status ?? "backlog",
    priority: "none",
    assigneeId: overrides.assigneeId ?? null,
    parentId: null,
    estimate: null,
    dueAt: (overrides.dueAt ?? null) as IsoTimestamp | null,
    labelIds: [...(overrides.labelIds ?? [])],
  });
}

async function addLabel(tenant: Tenant, name: string): Promise<LabelId> {
  const label = await labelRepo.insertLabel({
    orgId: tenant.org.id,
    name,
    color: "#94a3b8",
    description: null,
  });
  return label.id;
}

/** Lists through the service with the filter as the schema would admit it. */
async function list(tenant: Tenant, actor: Actor, filter: IssueFilter) {
  const input = issueFilterSchema.parse({
    ...filter,
    orgId: tenant.org.id,
    limit: 100,
    cursor: null,
  });
  return issueService.listIssues(actor, input);
}

function titles(page: { items: readonly Issue[] }): string[] {
  return page.items.map((issue) => issue.title).sort();
}

const OPEN = ["backlog", "todo", "in_progress", "in_review"];
const CLOSED = ["done", "canceled"];

describe("BFX2 issue filters — the URL codec", () => {
  it("expands the status groups open and closed when parsing", () => {
    expect([...(parseIssueFilterParams(params("status=open")).status ?? [])].sort()).toEqual(
      [...OPEN].sort(),
    );
    expect([...(parseIssueFilterParams(params("status=closed")).status ?? [])].sort()).toEqual(
      [...CLOSED].sort(),
    );
    const mixed = parseIssueFilterParams(params("status=closed,todo,done"));
    expect([...(mixed.status ?? [])].sort()).toEqual(["canceled", "done", "todo"].sort());
    expect(parseIssueFilterParams(params("status=nonsense")).status).toBeUndefined();
  });

  it("passes me through for the assignee and the author", () => {
    expect(parseIssueFilterParams(params("assignee=me")).assigneeId).toBe("me");
    expect(parseIssueFilterParams(params("author=me")).authorId).toBe("me");
    expect(parseIssueFilterParams(params("assignee=none")).assigneeId).toBeNull();
    expect(issueFilterToParams({ assigneeId: "me" }).assignee).toBe("me");
    expect(issueFilterToParams({ authorId: "me" }).author).toBe("me");
  });

  it("keeps a calendar date in due_before and round-trips it", () => {
    const parsed = parseIssueFilterParams(params("due_before=2026-06-01"));
    expect(parsed.dueBefore).toBe("2026-06-01");
    expect(issueFilterToParams(parsed).due_before).toBe("2026-06-01");
  });

  it("distinguishes archived=1 from archived=only", () => {
    const mixed = parseIssueFilterParams(params("archived=1"));
    expect(mixed.includeArchived).toBe(true);
    expect(mixed.archivedOnly).not.toBe(true);

    const only = parseIssueFilterParams(params("archived=only"));
    expect(only.archivedOnly).toBe(true);
    expect(only.includeArchived).not.toBe(true);

    expect(issueFilterToParams({ archivedOnly: true }).archived).toBe("only");
    expect(issueFilterToParams({ includeArchived: true }).archived).toBe("1");
    expect(parseIssueFilterParams(params("archived=true")).archivedOnly).toBeUndefined();
  });
});

describe("BFX2 issue filters — the schema", () => {
  const base = { orgId: "01HZZZAAAAAAAAAAAAAAAAAAAA", limit: 25, cursor: null };

  it("accepts the whole vocabulary", () => {
    const parsed = issueFilterSchema.safeParse({
      ...base,
      status: ["open", "done"],
      assigneeId: "me",
      authorId: "me",
      dueBefore: "2026-06-01",
      archivedOnly: true,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.assigneeId).toBe("me");
    expect(parsed.data.authorId).toBe("me");
    expect(parsed.data.dueBefore).toBe("2026-06-01");
    expect(parsed.data.archivedOnly).toBe(true);
    expect(parsed.data.status).toEqual(["open", "done"]);

    const stamped = issueFilterSchema.safeParse({ ...base, dueBefore: "2026-06-01T12:00:00.000Z" });
    expect(stamped.success).toBe(true);
    const unassigned = issueFilterSchema.safeParse({ ...base, assigneeId: null });
    expect(unassigned.success).toBe(true);
  });

  it("still refuses values outside the vocabulary", () => {
    expect(issueFilterSchema.safeParse({ ...base, status: ["nonsense"] }).success).toBe(false);
    expect(issueFilterSchema.safeParse({ ...base, dueBefore: "yesterday" }).success).toBe(false);
    expect(issueFilterSchema.safeParse({ ...base, assigneeId: "them" }).success).toBe(false);
  });
});

describe("BFX2 issue filters — the list", () => {
  it("lists only unassigned issues for assignee=none, with a matching total", async () => {
    const tenant = await makeTenant("bfx2-none");
    await addIssue(tenant, "nobody's", { assigneeId: null });
    await addIssue(tenant, "mine", { assigneeId: tenant.member.userId });
    await addIssue(tenant, "owner's", { assigneeId: tenant.owner.userId });

    const page = await list(tenant, tenant.owner, { assigneeId: null });
    expect(titles(page)).toEqual(["nobody's"]);
    expect(page.total).toBe(1);

    const anyone = await list(tenant, tenant.owner, {});
    expect(anyone.total).toBe(3);
  });

  it("resolves assignee=me and author=me against the acting user", async () => {
    const tenant = await makeTenant("bfx2-me");
    await addIssue(tenant, "assigned to member", { assigneeId: tenant.member.userId, by: tenant.owner });
    await addIssue(tenant, "assigned to owner", { assigneeId: tenant.owner.userId, by: tenant.owner });
    await addIssue(tenant, "written by member", { by: tenant.member });

    const memberSees = await list(tenant, tenant.member, { assigneeId: "me" });
    expect(titles(memberSees)).toEqual(["assigned to member"]);
    expect(memberSees.total).toBe(1);

    const ownerSees = await list(tenant, tenant.owner, { assigneeId: "me" });
    expect(titles(ownerSees)).toEqual(["assigned to owner"]);

    const authored = await list(tenant, tenant.member, { authorId: "me" });
    expect(titles(authored)).toEqual(["written by member"]);
    expect(authored.total).toBe(1);

    const ownerAuthored = await list(tenant, tenant.owner, { authorId: "me" });
    expect(titles(ownerAuthored)).toEqual(["assigned to member", "assigned to owner"]);
  });

  it("matches only issues that carry every listed label", async () => {
    const tenant = await makeTenant("bfx2-labels");
    const bug = await addLabel(tenant, "bug");
    const regression = await addLabel(tenant, "regression");
    await addIssue(tenant, "just a bug", { labelIds: [bug] });
    await addIssue(tenant, "just a regression", { labelIds: [regression] });
    await addIssue(tenant, "both", { labelIds: [bug, regression] });
    await addIssue(tenant, "neither");

    const both = await list(tenant, tenant.owner, { labelIds: [bug, regression] });
    expect(titles(both)).toEqual(["both"]);
    expect(both.total).toBe(1);

    const bugs = await list(tenant, tenant.owner, { labelIds: [bug] });
    expect(titles(bugs)).toEqual(["both", "just a bug"]);
    expect(bugs.total).toBe(2);

    const repeated = await list(tenant, tenant.owner, { labelIds: [bug, bug] });
    expect(repeated.total).toBe(2);
  });

  it("reads a calendar date in due_before as that whole UTC day, inclusive", async () => {
    const tenant = await makeTenant("bfx2-due-date");
    await addIssue(tenant, "late that evening", { dueAt: "2026-06-01T23:59:59.000Z" });
    await addIssue(tenant, "that morning", { dueAt: "2026-06-01T00:00:00.000Z" });
    await addIssue(tenant, "the day after", { dueAt: "2026-06-02T00:00:00.000Z" });
    await addIssue(tenant, "the week before", { dueAt: "2026-05-25T09:00:00.000Z" });
    await addIssue(tenant, "no due date", { dueAt: null });

    const page = await list(tenant, tenant.owner, { dueBefore: "2026-06-01" });
    expect(titles(page)).toEqual(["late that evening", "that morning", "the week before"]);
    expect(page.total).toBe(3);
  });

  it("reads a full timestamp in due_before as strictly before that instant", async () => {
    const tenant = await makeTenant("bfx2-due-stamp");
    await addIssue(tenant, "at noon", { dueAt: "2026-06-01T12:00:00.000Z" });
    await addIssue(tenant, "just before noon", { dueAt: "2026-06-01T11:59:59.000Z" });
    await addIssue(tenant, "no due date", { dueAt: null });

    const page = await list(tenant, tenant.owner, { dueBefore: "2026-06-01T12:00:00.000Z" });
    expect(titles(page)).toEqual(["just before noon"]);
    expect(page.total).toBe(1);
  });

  it("expands status groups at the service entry point", async () => {
    const tenant = await makeTenant("bfx2-groups");
    await addIssue(tenant, "backlog one", { status: "backlog" });
    await addIssue(tenant, "todo one", { status: "todo" });
    await addIssue(tenant, "review one", { status: "in_review" });
    await addIssue(tenant, "done one", { status: "done" });
    await addIssue(tenant, "canceled one", { status: "canceled" });

    const open = await list(tenant, tenant.owner, { status: ["open"] });
    expect(titles(open)).toEqual(["backlog one", "review one", "todo one"]);
    expect(open.total).toBe(3);

    const closed = await list(tenant, tenant.owner, { status: ["closed"] });
    expect(titles(closed)).toEqual(["canceled one", "done one"]);
    expect(closed.total).toBe(2);

    const mixed = await list(tenant, tenant.owner, { status: ["closed", "todo"] });
    expect(titles(mixed)).toEqual(["canceled one", "done one", "todo one"]);
    expect(mixed.total).toBe(3);
  });

  it("lists archived issues only for archivedOnly, both for includeArchived, live by default", async () => {
    const tenant = await makeTenant("bfx2-archived");
    const gone = await addIssue(tenant, "archived one");
    await addIssue(tenant, "live one");
    await issueService.archiveIssue(tenant.owner, tenant.org.id, gone.id);

    const only = await list(tenant, tenant.owner, { archivedOnly: true });
    expect(titles(only)).toEqual(["archived one"]);
    expect(only.total).toBe(1);

    const both = await list(tenant, tenant.owner, { includeArchived: true });
    expect(titles(both)).toEqual(["archived one", "live one"]);
    expect(both.total).toBe(2);

    const live = await list(tenant, tenant.owner, {});
    expect(titles(live)).toEqual(["live one"]);
    expect(live.total).toBe(1);
  });

  it("combines the dimensions: open, unassigned and every listed label", async () => {
    const tenant = await makeTenant("bfx2-combo");
    const bug = await addLabel(tenant, "bug");
    const urgent = await addLabel(tenant, "urgent");
    await addIssue(tenant, "wanted", { status: "todo", assigneeId: null, labelIds: [bug, urgent] });
    await addIssue(tenant, "closed", { status: "done", assigneeId: null, labelIds: [bug, urgent] });
    await addIssue(tenant, "taken", { status: "todo", assigneeId: tenant.member.userId, labelIds: [bug, urgent] });
    await addIssue(tenant, "one label", { status: "todo", assigneeId: null, labelIds: [bug] });

    const page = await list(tenant, tenant.owner, {
      status: ["open"],
      assigneeId: null,
      labelIds: [bug, urgent],
    });
    expect(titles(page)).toEqual(["wanted"]);
    expect(page.total).toBe(1);
  });

  it("gives an API caller and a page the same answer for the same URL", async () => {
    const tenant = await makeTenant("bfx2-url");
    const bug = await addLabel(tenant, "bug");
    await addIssue(tenant, "due and mine", {
      status: "todo",
      assigneeId: tenant.member.userId,
      labelIds: [bug],
      dueAt: "2026-06-01T10:00:00.000Z",
    });
    await addIssue(tenant, "due and done", {
      status: "done",
      assigneeId: tenant.member.userId,
      labelIds: [bug],
      dueAt: "2026-06-01T10:00:00.000Z",
    });
    await addIssue(tenant, "not due yet", {
      status: "todo",
      assigneeId: tenant.member.userId,
      labelIds: [bug],
      dueAt: "2026-06-03T10:00:00.000Z",
    });

    const fromUrl = parseIssueFilterParams(
      params(`status=open&assignee=me&label=${bug}&due_before=2026-06-01`),
    );
    const page = await list(tenant, tenant.member, fromUrl);
    expect(titles(page)).toEqual(["due and mine"]);
    expect(page.total).toBe(1);
  });
});
