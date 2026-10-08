/**
 * BFX1 — the search query language.
 *
 * Free text is matched literally; field tokens exist only with
 * `advanced_search`; without the flag only issues are searched and nothing is
 * refused for its syntax; comments are indexed under their issue's project on
 * every write path; reindex requests cover every kind.
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { emit } from "@/lib/event-bus";
import { resetRateLimits } from "@/lib/rate-limit";
import { runMigrations } from "@/server/db/migrate";
import { runSearchReindexJob } from "@/server/jobs/search-reindex-job";
import * as memberRepo from "@/server/repositories/member-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as subscriptionRepo from "@/server/repositories/subscription-repository";
import * as userRepo from "@/server/repositories/user-repository";
import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import {
  indexProject,
  registerSearchListeners,
  removeFromIndex,
  search,
} from "@/server/services/search-service";
import { toIsoTimestamp } from "@/types/common";
import type { PlanId } from "@/types/billing";
import type { Comment } from "@/types/comment";
import type { OrgId, ProjectId } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Organization } from "@/types/organization";
import type { Project } from "@/types/project";

type Tenant = {
  org: Organization;
  project: Project;
  member: Actor;
};

type Kind = "issue" | "comment" | "project";

let dir: string;
let detach: Unsubscribe;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "taskflow-bfx1-"));
  const path = join(dir, "taskflow.db");
  process.env.TASKFLOW_DB_PATH = path;
  await runMigrations(path);
  detach = registerSearchListeners();
});

beforeEach(() => {
  resetRateLimits();
});

afterEach(() => {
  resetRateLimits();
});

afterAll(() => {
  detach();
  rmSync(dir, { recursive: true, force: true });
});

async function makeTenant(slug: string, plan: PlanId): Promise<Tenant> {
  const owner = await userRepo.insertUser({
    email: `owner@${slug}.test`,
    name: `${slug} owner`,
    passwordHash: "seed",
  });
  const org = await orgRepo.insertOrg({ name: `${slug} inc`, slug, plan }, owner.id);
  await subscriptionRepo.insertSubscription(org.id, plan, "monthly");
  await memberRepo.insertMember(org.id, owner.id, "owner", null);

  const user = await userRepo.insertUser({
    email: `member@${slug}.test`,
    name: `${slug} member`,
    passwordHash: "seed",
  });
  await memberRepo.insertMember(org.id, user.id, "member", null);

  const project = await projectRepo.insertProject({
    orgId: org.id,
    name: `${slug} platform`,
    slug: "platform",
    key: "PLAT",
    description: null,
    visibility: "org",
    leadId: owner.id,
    color: "#6366f1",
    targetDate: null,
  });

  return { org, project, member: { userId: user.id, orgId: org.id, role: "member" } };
}

async function addProject(tenant: Tenant, name: string, slug: string, key: string): Promise<Project> {
  return projectRepo.insertProject({
    orgId: tenant.org.id,
    name,
    slug,
    key,
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  });
}

async function addIssue(tenant: Tenant, title: string, projectId: ProjectId = tenant.project.id): Promise<Issue> {
  return issueService.createIssue(tenant.member, {
    orgId: tenant.org.id,
    projectId,
    title,
    description: null,
    status: "backlog",
    priority: "none",
    assigneeId: null,
    parentId: null,
    estimate: null,
    dueAt: null,
    labelIds: [],
  });
}

async function addComment(tenant: Tenant, issue: Issue, body: string): Promise<Comment> {
  return commentService.createComment(tenant.member, {
    orgId: tenant.org.id,
    issueId: issue.id,
    body,
    parentId: null,
    mentionedUserIds: [],
  });
}

async function find(
  tenant: Tenant,
  q: string,
  kinds: readonly Kind[] = ["issue"],
  projectId?: ProjectId,
) {
  return search(tenant.member, {
    orgId: tenant.org.id,
    q,
    kinds: [...kinds],
    ...(projectId === undefined ? {} : { projectId }),
    limit: 50,
    cursor: null,
  });
}

function ids(page: { items: readonly { id: string }[] }): string[] {
  return page.items.map((hit) => hit.id).sort();
}

async function allowAdvanced(orgId: OrgId): Promise<void> {
  await orgRepo.updateOrg(orgId, {
    orgId,
    settings: { enabledFlagOverrides: ["advanced_search"] },
  });
}

describe("BFX1 search queries", () => {
  it("treats a colon as ordinary text on a plan without advanced search", async () => {
    const tenant = await makeTenant("bfx1-colon", "starter");
    const issue = await addIssue(tenant, "Release 2: hotfix");

    const page = await find(tenant, "Release 2: hotfix");
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ kind: "issue", id: issue.id });

    const partial = await find(tenant, "2: hot");
    expect(ids(partial)).toEqual([issue.id]);
  });

  it("searches would-be field syntax literally, and only issues, without advanced search", async () => {
    const tenant = await makeTenant("bfx1-literal", "starter");
    const issue = await addIssue(tenant, "flaky build on main");
    await addComment(tenant, issue, "the flaky step is the upload");

    const literal = await find(tenant, "kind:comment flaky", ["comment"]);
    expect(literal.total).toBe(0);
    expect(literal.items).toHaveLength(0);

    const narrowed = await find(tenant, "flaky", ["comment"]);
    expect(narrowed.total).toBe(1);
    expect(narrowed.items).toHaveLength(1);
    expect(narrowed.items[0]).toMatchObject({ kind: "issue", id: issue.id });
  });

  it("honours kind: and in: tokens with advanced search", async () => {
    const tenant = await makeTenant("bfx1-tokens", "enterprise");
    const issue = await addIssue(tenant, "flaky build on main");
    const comment = await addComment(tenant, issue, "the flaky step is the upload");

    const byKind = await find(tenant, "kind:comment flaky", ["issue"]);
    expect(byKind.total).toBe(1);
    expect(byKind.items[0]).toMatchObject({ kind: "comment", id: comment.id });

    const byIn = await find(tenant, "in:comments flaky", ["issue"]);
    expect(ids(byIn)).toEqual([comment.id]);

    const both = await find(tenant, "kind:issue kind:comment flaky", ["project"]);
    expect(both.total).toBe(2);
    expect(ids(both)).toEqual([comment.id, issue.id].sort());
  });

  it("scopes every kind to the project named by a project: token", async () => {
    const tenant = await makeTenant("bfx1-scope", "enterprise");
    const other = await addProject(tenant, "bfx1 docs", "docs", "DOC");
    const inPlatform = await addIssue(tenant, "deploy pipeline");
    await addIssue(tenant, "deploy docs", other.id);
    const comment = await addComment(tenant, inPlatform, "deploy notes for the pipeline");

    const scoped = await find(tenant, `project:${tenant.project.id} deploy`, ["issue", "comment"]);
    expect(scoped.total).toBe(2);
    expect(ids(scoped)).toEqual([comment.id, inPlatform.id].sort());

    const unscoped = await find(tenant, "deploy", ["issue", "comment"]);
    expect(unscoped.total).toBe(3);
  });

  it("drops tokens it does not know and searches the rest", async () => {
    const tenant = await makeTenant("bfx1-unknown", "enterprise");
    const issue = await addIssue(tenant, "flaky build on main");

    expect(ids(await find(tenant, "label:bug flaky"))).toEqual([issue.id]);
    expect(ids(await find(tenant, "kind: flaky"))).toEqual([issue.id]);
    expect((await find(tenant, "label:bug flaky")).total).toBe(1);
  });

  it("honours the caller's kinds when the query names none (advanced search)", async () => {
    const tenant = await makeTenant("bfx1-kinds", "enterprise");
    const issue = await addIssue(tenant, "flaky build on main");
    const comment = await addComment(tenant, issue, "the flaky step is the upload");

    const comments = await find(tenant, "flaky", ["comment"]);
    expect(ids(comments)).toEqual([comment.id]);

    const issues = await find(tenant, "flaky", ["issue"]);
    expect(ids(issues)).toEqual([issue.id]);

    const everything = await find(tenant, "flaky", ["issue", "comment", "project"]);
    expect(everything.total).toBe(2);
    expect(ids(everything)).toEqual([comment.id, issue.id].sort());
  });

  it("searches issues only without advanced search, whatever kinds are asked for", async () => {
    const tenant = await makeTenant("bfx1-narrow", "starter");
    const issue = await addIssue(tenant, "flaky build on main");
    await addComment(tenant, issue, "the flaky step is the upload");
    const project = await addProject(tenant, "flaky ops", "flaky-ops", "FLK");
    await indexProject(tenant.org.id, project);

    const page = await find(tenant, "flaky", ["issue", "comment", "project"]);
    expect(page.total).toBe(1);
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ kind: "issue", id: issue.id });
  });

  it("turns the query language on through a workspace override", async () => {
    const tenant = await makeTenant("bfx1-override", "starter");
    const issue = await addIssue(tenant, "flaky build on main");
    const comment = await addComment(tenant, issue, "the flaky step is the upload");

    expect((await find(tenant, "kind:comment flaky", ["issue"])).total).toBe(0);

    await allowAdvanced(tenant.org.id);

    const page = await find(tenant, "kind:comment flaky", ["issue"]);
    expect(ids(page)).toEqual([comment.id]);
    expect((await find(tenant, "flaky", ["comment"])).total).toBe(1);
  });

  it("matches a percent sign literally", async () => {
    const tenant = await makeTenant("bfx1-percent", "starter");
    const exact = await addIssue(tenant, "100% done with onboarding");
    await addIssue(tenant, "100 percent done with onboarding");

    const page = await find(tenant, "100%");
    expect(page.total).toBe(1);
    expect(ids(page)).toEqual([exact.id]);
  });

  it("matches an underscore literally", async () => {
    const tenant = await makeTenant("bfx1-underscore", "starter");
    const exact = await addIssue(tenant, "snake_case naming in the API");
    await addIssue(tenant, "snake case naming in the API");

    const page = await find(tenant, "snake_case");
    expect(page.total).toBe(1);
    expect(ids(page)).toEqual([exact.id]);
  });

  it("matches a backslash literally", async () => {
    const tenant = await makeTenant("bfx1-backslash", "starter");
    const exact = await addIssue(tenant, "path\\to\\file is wrong");
    await addIssue(tenant, "path to file is wrong");

    const page = await find(tenant, "path\\to");
    expect(page.total).toBe(1);
    expect(ids(page)).toEqual([exact.id]);
  });

  it("matches case-insensitively", async () => {
    const tenant = await makeTenant("bfx1-case", "starter");
    const issue = await addIssue(tenant, "flaky build on main");

    expect(ids(await find(tenant, "FLAKY"))).toEqual([issue.id]);
    expect(ids(await find(tenant, "Flaky Build"))).toEqual([issue.id]);
  });

  it("indexes a comment under its issue's project when it is posted", async () => {
    const tenant = await makeTenant("bfx1-comment-project", "enterprise");
    const other = await addProject(tenant, "bfx1 docs", "docs", "DOC");
    const issue = await addIssue(tenant, "deploy pipeline");
    const comment = await addComment(tenant, issue, "deploy notes for the pipeline");

    const scoped = await find(tenant, "deploy notes", ["comment"], tenant.project.id);
    expect(ids(scoped)).toEqual([comment.id]);

    const elsewhere = await find(tenant, "deploy notes", ["comment"], other.id);
    expect(elsewhere.total).toBe(0);
  });

  it("indexes comments under their project when the workspace index is rebuilt", async () => {
    const tenant = await makeTenant("bfx1-rebuild", "enterprise");
    const issue = await addIssue(tenant, "deploy pipeline");
    const comment = await addComment(tenant, issue, "deploy notes for the pipeline");

    await removeFromIndex(tenant.org.id, "comment", comment.id);
    expect((await find(tenant, "deploy notes", ["comment"])).total).toBe(0);

    await runSearchReindexJob(tenant.org.id);

    const scoped = await find(tenant, "deploy notes", ["comment"], tenant.project.id);
    expect(ids(scoped)).toEqual([comment.id]);
  });

  it("re-indexes a comment with its project on a reindex request", async () => {
    const tenant = await makeTenant("bfx1-reindex-comment", "enterprise");
    const issue = await addIssue(tenant, "deploy pipeline");
    const comment = await addComment(tenant, issue, "deploy notes for the pipeline");

    await removeFromIndex(tenant.org.id, "comment", comment.id);
    expect((await find(tenant, "deploy notes", ["comment"])).total).toBe(0);

    await emit("search.reindex_requested", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date("2026-06-01T09:00:00.000Z")),
      subjectKind: "comment",
      subjectId: comment.id,
    });

    const scoped = await find(tenant, "deploy notes", ["comment"], tenant.project.id);
    expect(ids(scoped)).toEqual([comment.id]);
  });

  it("re-indexes a project on a reindex request", async () => {
    const tenant = await makeTenant("bfx1-reindex-project", "enterprise");
    const project = await addProject(tenant, "Lighthouse rollout", "lighthouse", "LHR");

    expect((await find(tenant, "Lighthouse", ["project"])).total).toBe(0);

    await emit("search.reindex_requested", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date("2026-06-01T09:00:00.000Z")),
      subjectKind: "project",
      subjectId: project.id,
    });

    const page = await find(tenant, "Lighthouse", ["project"]);
    expect(page.items[0]).toMatchObject({ kind: "project", id: project.id });
    expect(page.total).toBe(1);
  });

  it("leaves an archived issue out of the index on a reindex request", async () => {
    const tenant = await makeTenant("bfx1-reindex-archived", "enterprise");
    const issue = await addIssue(tenant, "deploy pipeline");
    await issueService.archiveIssue(tenant.member, tenant.org.id, issue.id);
    expect((await find(tenant, "deploy pipeline")).total).toBe(0);

    await emit("search.reindex_requested", {
      orgId: tenant.org.id,
      actorId: null,
      occurredAt: toIsoTimestamp(new Date("2026-06-01T09:00:00.000Z")),
      subjectKind: "issue",
      subjectId: issue.id,
    });

    expect((await find(tenant, "deploy pipeline")).total).toBe(0);
  });

  it("never lets a project: token reach into another workspace", async () => {
    const tenant = await makeTenant("bfx1-cross", "enterprise");
    const stranger = await makeTenant("bfx1-cross-other", "enterprise");
    await addIssue(stranger, "deploy pipeline");
    await addIssue(tenant, "deploy pipeline");

    const page = await find(tenant, `project:${stranger.project.id} deploy`, ["issue", "comment"]);
    expect(page.total).toBe(0);
    expect(page.items).toHaveLength(0);
  });
});
