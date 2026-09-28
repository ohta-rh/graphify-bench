/**
 * Hidden test for UFX4-search-ghosts: search follows the soft-delete state of
 * projects, issues and comments through every write path and through a
 * rebuild of the index.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import { runSearchReindexJob } from "@/server/jobs/search-reindex-job";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import * as commentService from "@/server/services/comment-service";
import { registerEventHandlers, unregisterEventHandlers } from "@/server/services/event-registry";
import * as issueService from "@/server/services/issue-service";
import * as projectService from "@/server/services/project-service";
import * as searchService from "@/server/services/search-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Comment } from "@/types/comment";
import type { Issue } from "@/types/issue";
import type { Project } from "@/types/project";

let cleanup: () => void;
let keySeq = 0;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  registerEventHandlers();
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
});

afterAll(() => {
  unregisterEventHandlers();
  cleanup();
});

type Kind = "issue" | "comment" | "project";

/** Every hit for `q`, walking all pages; returns ids and the reported total. */
async function find(t: Tenant, q: string, kind: Kind): Promise<{ ids: string[]; total: number }> {
  const ids: string[] = [];
  let cursor: string | null = null;
  let total = -1;
  for (let guard = 0; guard < 50; guard += 1) {
    const page = await searchService.search(t.actors.member, {
      orgId: t.org.id,
      q,
      kinds: [kind],
      limit: 25,
      cursor,
    });
    if (total === -1) total = page.total;
    ids.push(...page.items.map((hit) => hit.id));
    if (page.nextCursor === null) break;
    cursor = page.nextCursor;
  }
  return { ids, total };
}

async function expectFound(t: Tenant, q: string, kind: Kind, expected: readonly string[]) {
  const { ids, total } = await find(t, q, kind);
  expect([...ids].sort()).toEqual([...expected].sort());
  expect(total).toBe(expected.length);
}

async function newProject(t: Tenant, name: string): Promise<Project> {
  keySeq += 1;
  return projectService.createProject(t.actors.admin, {
    orgId: t.org.id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    key: `S${String(keySeq).padStart(3, "0")}`,
    description: null,
    visibility: "org",
    leadId: null,
    color: "#6366f1",
    targetDate: null,
  });
}

function newIssue(t: Tenant, project: Project, title: string): Promise<Issue> {
  return issueService.createIssue(t.actors.member, issueInput(t.org.id, project.id, { title }));
}

function newComment(t: Tenant, issue: Issue, body: string): Promise<Comment> {
  return commentService.createComment(t.actors.member, {
    orgId: t.org.id,
    issueId: issue.id,
    body,
    parentId: null,
    mentionedUserIds: [],
  });
}

describe("UFX4 search follows archiving and restoring", () => {
  it("archiving an issue also hides its comments", async () => {
    const t = await createTenant("ufx4-issue-archive", "growth");
    const doomed = await newIssue(t, t.project, "Alfa doomed issue");
    const kept = await newIssue(t, t.project, "Alfa kept issue");
    await newComment(t, doomed, "alfanote on the doomed one");
    await newComment(t, doomed, "alfanote second on the doomed one");
    const keptNote = await newComment(t, kept, "alfanote on the kept one");

    await issueService.archiveIssue(t.actors.member, t.org.id, doomed.id);

    await expectFound(t, "alfanote", "comment", [keptNote.id]);
    await expectFound(t, "Alfa", "issue", [kept.id]);
  });

  it("archiving a project together with its issues hides everything inside it", async () => {
    const t = await createTenant("ufx4-cascade", "growth");
    const doomed = await newProject(t, "Bravo Doomed");
    const other = await newProject(t, "Bravo Other");
    const i1 = await newIssue(t, doomed, "bravoissue one");
    const i2 = await newIssue(t, doomed, "bravoissue two");
    const i3 = await newIssue(t, other, "bravoissue three");
    await newComment(t, i1, "bravonote a");
    await newComment(t, i2, "bravonote b");
    const c3 = await newComment(t, i3, "bravonote c");

    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: doomed.id,
      archiveIssues: true,
    });

    await expectFound(t, "Bravo", "project", [other.id]);
    await expectFound(t, "bravoissue", "issue", [i3.id]);
    await expectFound(t, "bravonote", "comment", [c3.id]);
  });

  it("an archived project hides the issues it kept live, and restoring brings them back", async () => {
    const t = await createTenant("ufx4-keep-live", "growth");
    const project = await newProject(t, "Charlie Shelf");
    const i1 = await newIssue(t, project, "charlieissue one");
    const i2 = await newIssue(t, project, "charlieissue two");
    const c1 = await newComment(t, i1, "charlienote kept");
    const gone = await newComment(t, i2, "charlienote deleted");
    await commentService.deleteComment(t.actors.admin, { orgId: t.org.id, commentId: gone.id });

    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: project.id,
      archiveIssues: false,
    });

    await expectFound(t, "Charlie", "project", []);
    await expectFound(t, "charlieissue", "issue", []);
    await expectFound(t, "charlienote", "comment", []);

    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);

    await expectFound(t, "Charlie", "project", [project.id]);
    await expectFound(t, "charlieissue", "issue", [i1.id, i2.id]);
    await expectFound(t, "charlienote", "comment", [c1.id]);
  });

  it("restoring a project does not bring back the issues archived with it", async () => {
    const t = await createTenant("ufx4-restore-cascade", "growth");
    const project = await newProject(t, "Delta Vault");
    const issue = await newIssue(t, project, "deltaissue archived with project");
    await newComment(t, issue, "deltanote under archived issue");

    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: project.id,
      archiveIssues: true,
    });
    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);

    await expectFound(t, "Delta", "project", [project.id]);
    await expectFound(t, "deltaissue", "issue", []);
    await expectFound(t, "deltanote", "comment", []);
  });

  it("restoring a project keeps hidden what was archived or deleted on its own", async () => {
    const t = await createTenant("ufx4-restore-mixed", "growth");
    const project = await newProject(t, "India Mixed");
    const liveIssue = await newIssue(t, project, "indiaissue live");
    const earlier = await newIssue(t, project, "indiaissue archived earlier");
    const kept = await newComment(t, liveIssue, "indianote kept");
    await newComment(t, earlier, "indianote under earlier archive");
    const removed = await newComment(t, liveIssue, "indianote removed");

    await issueService.archiveIssue(t.actors.member, t.org.id, earlier.id);
    await commentService.deleteComment(t.actors.admin, { orgId: t.org.id, commentId: removed.id });
    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: project.id,
      archiveIssues: false,
    });
    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);

    await expectFound(t, "indiaissue", "issue", [liveIssue.id]);
    await expectFound(t, "indianote", "comment", [kept.id]);
  });

  it("comments and edits made while the project is archived stay hidden until it is restored", async () => {
    const t = await createTenant("ufx4-frozen-writes", "growth");
    const project = await newProject(t, "Echo Base");
    const issue = await newIssue(t, project, "echoissue original");

    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: project.id,
      archiveIssues: false,
    });

    const late = await newComment(t, issue, "echonote written while archived");
    await issueService.updateIssue(t.actors.member, {
      orgId: t.org.id,
      issueId: issue.id,
      title: "echoissue renamed",
    });

    await expectFound(t, "echonote", "comment", []);
    await expectFound(t, "echoissue", "issue", []);

    await projectService.restoreProject(t.actors.admin, t.org.id, project.id);

    await expectFound(t, "echonote", "comment", [late.id]);
    await expectFound(t, "echoissue renamed", "issue", [issue.id]);
    await expectFound(t, "echoissue original", "issue", []);
  });
});

describe("UFX4 rebuilding a workspace's index", () => {
  it("does not resurrect archived or deleted content", async () => {
    const t = await createTenant("ufx4-rebuild-ghosts", "growth");
    const shelved = await newProject(t, "Foxtrot Shelved");
    const liveIssue = await newIssue(t, t.project, "foxissue live");
    const archivedIssue = await newIssue(t, t.project, "foxissue archived");
    const inShelved = await newIssue(t, shelved, "foxissue in shelved project");
    const liveNote = await newComment(t, liveIssue, "foxnote live");
    const deletedNote = await newComment(t, liveIssue, "foxnote deleted");
    await newComment(t, archivedIssue, "foxnote under archived issue");
    await newComment(t, inShelved, "foxnote in shelved project");

    await commentService.deleteComment(t.actors.admin, { orgId: t.org.id, commentId: deletedNote.id });
    await issueService.archiveIssue(t.actors.member, t.org.id, archivedIssue.id);
    await projectService.archiveProject(t.actors.admin, {
      orgId: t.org.id,
      projectId: shelved.id,
      archiveIssues: false,
    });

    await runSearchReindexJob(t.org.id);

    await expectFound(t, "foxissue", "issue", [liveIssue.id]);
    await expectFound(t, "foxnote", "comment", [liveNote.id]);
    await expectFound(t, "Foxtrot", "project", []);
  });

  it("covers every issue and comment of a large workspace", async () => {
    const t = await createTenant("ufx4-rebuild-large", "growth");
    const issues: Issue[] = [];
    for (let i = 0; i < 110; i += 1) {
      const number = await issueRepo.nextIssueNumber(t.org.id, t.project.id);
      issues.push(
        await issueRepo.insertIssue(
          issueInput(t.org.id, t.project.id, { title: `golfissue ${i}` }),
          t.userIds.owner,
          number,
        ),
      );
    }
    const oldest = issues[0];
    if (!oldest) throw new Error("no issues");
    const note = await newComment(t, oldest, "golfnote on the oldest issue");

    // Nothing but the comment went through the write path, so only the
    // rebuild can put the issues into the index.
    await runSearchReindexJob(t.org.id);

    await expectFound(t, "golfissue", "issue", issues.map((issue) => issue.id));
    await expectFound(t, "golfnote", "comment", [note.id]);
  });

  it("drops entries the rule does not allow and leaves other workspaces alone", async () => {
    const t = await createTenant("ufx4-rebuild-stale", "growth");
    const other = await createTenant("ufx4-rebuild-other", "growth");

    const archived = await newIssue(t, t.project, "hotelissue archived");
    await issueService.archiveIssue(t.actors.member, t.org.id, archived.id);
    // A leftover entry for the archived issue, as older builds left behind.
    await searchRepo.upsertSearchDocument(t.org.id, "issue", archived.id, "hotelissue archived", t.project.id);

    const otherIssue = await newIssue(other, other.project, "hotelissue elsewhere");
    const otherNote = await newComment(other, otherIssue, "hotelnote elsewhere");

    await runSearchReindexJob(t.org.id);

    await expectFound(t, "hotelissue", "issue", []);
    await expectFound(other, "hotelissue", "issue", [otherIssue.id]);
    await expectFound(other, "hotelnote", "comment", [otherNote.id]);
  });
});
