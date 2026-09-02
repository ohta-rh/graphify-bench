/**
 * Query-time search plus the write-time index maintenance driven by `search.reindex_requested`.
 *
 * Must call (do not reimplement): assertCan, assertOrgScope, subscribe, isEnabled, consumeRateLimit
 */
import { subscribe } from "@/lib/event-bus";
import { isEnabled } from "@/lib/feature-flags";
import { assertCan } from "@/lib/permissions";
import { consumeRateLimit } from "@/lib/rate-limit";
import { assertOrgScope } from "@/lib/tenant";
import * as commentRepo from "@/server/repositories/comment-repository";
import * as issueRepo from "@/server/repositories/issue-repository";
import * as orgRepo from "@/server/repositories/organization-repository";
import * as projectRepo from "@/server/repositories/project-repository";
import * as searchRepo from "@/server/repositories/search-repository";
import { orgResource } from "./_support";
import type { SearchQueryInput } from "@/schemas/search";
import type { SearchSubjectKind } from "@/server/repositories/search-repository";
import type { Comment } from "@/types/comment";
import type { OrgId, Page } from "@/types/common";
import type { Unsubscribe } from "@/types/event";
import type { Issue } from "@/types/issue";
import type { Actor } from "@/types/member";
import type { Project } from "@/types/project";

export type SearchHit = {
  kind: SearchSubjectKind;
  id: string;
  title: string;
  snippet: string;
  href: string;
};

/** Characters of surrounding context kept on either side of a match. */
const SNIPPET_RADIUS = 60;

/** Token bucket protecting the index from query bursts. */
const SEARCH_QUERY_BUCKET = "search:query";

/**
 * Runs a query against the denormalised index. Field-scoped syntax
 * (`status:done`) is an `advanced_search` feature, so a query containing a
 * colon is rejected for plans that do not include it rather than silently
 * being treated as literal text.
 */
export async function search(
  actor: Actor,
  input: SearchQueryInput,
): Promise<Page<SearchHit>> {
  assertOrgScope(actor, input.orgId);
  assertCan(actor, "issue:read", orgResource(input.orgId));

  const verdict = await consumeRateLimit(input.orgId, SEARCH_QUERY_BUCKET);
  if (!verdict.allowed) {
    throw new Error(
      `Search rate limit reached; try again after ${verdict.resetAt}`,
    );
  }

  const org = await orgRepo.findOrgById(input.orgId);
  const advanced = isEnabled("advanced_search", {
    orgId: input.orgId,
    userId: actor.userId,
    plan: org?.plan ?? "free",
    role: actor.role,
    overrides: org?.settings.enabledFlagOverrides,
  });

  if (input.q.includes(":") && !advanced) {
    throw new Error("Field-scoped search is not included in this plan");
  }

  const page = await searchRepo.searchDocuments(input);

  return {
    items: page.items.map((row) => ({
      kind: row.subjectKind,
      id: row.subjectId,
      title: row.content.split("\n")[0] ?? row.subjectId,
      snippet: snippetAround(row.content, input.q),
      href: hrefFor(row.subjectKind, row.subjectId),
    })),
    nextCursor: page.nextCursor,
    total: page.total,
  };
}

export async function indexIssue(orgId: OrgId, issue: Issue): Promise<void> {
  await searchRepo.upsertSearchDocument(
    orgId,
    "issue",
    issue.id,
    [issue.title, issue.description ?? ""].join("\n"),
    issue.projectId,
  );
}

export async function indexComment(
  orgId: OrgId,
  comment: Comment,
): Promise<void> {
  await searchRepo.upsertSearchDocument(
    orgId,
    "comment",
    comment.id,
    comment.body,
    null,
  );
}

export async function indexProject(
  orgId: OrgId,
  project: Project,
): Promise<void> {
  await searchRepo.upsertSearchDocument(
    orgId,
    "project",
    project.id,
    [project.name, project.description ?? ""].join("\n"),
    project.id,
  );
}

export async function removeFromIndex(
  orgId: OrgId,
  subjectKind: SearchSubjectKind,
  subjectId: string,
): Promise<void> {
  await searchRepo.deleteSearchDocument(orgId, subjectKind, subjectId);
}

/**
 * Keeps the index in step with writes. Every handler re-reads the row rather
 * than trusting the event payload, so a partially-applied write can never be
 * indexed as if it had succeeded.
 */
export function registerSearchListeners(): Unsubscribe {
  const offs: Unsubscribe[] = [
    subscribe("issue.created", async (payload) => {
      const issue = await issueRepo.findIssueById(payload.orgId, payload.issueId);
      if (issue) await indexIssue(payload.orgId, issue);
    }),
    subscribe("issue.updated", async (payload) => {
      const issue = await issueRepo.findIssueById(payload.orgId, payload.issueId);
      if (issue) await indexIssue(payload.orgId, issue);
    }),
    subscribe("issue.archived", async (payload) => {
      await removeFromIndex(payload.orgId, "issue", payload.issueId);
    }),
    subscribe("comment.created", async (payload) => {
      const comment = await commentRepo.findCommentById(
        payload.orgId,
        payload.commentId,
      );
      if (comment) await indexComment(payload.orgId, comment);
    }),
    subscribe("comment.deleted", async (payload) => {
      await removeFromIndex(payload.orgId, "comment", payload.commentId);
    }),
    subscribe("project.created", async (payload) => {
      const project = await projectRepo.findProjectById(
        payload.orgId,
        payload.projectId,
      );
      if (project) await indexProject(payload.orgId, project);
    }),
    subscribe("project.archived", async (payload) => {
      await removeFromIndex(payload.orgId, "project", payload.projectId);
    }),
    subscribe("search.reindex_requested", async (payload) => {
      if (payload.subjectKind !== "issue") return;
      const issue = await issueRepo.findIssueById(
        payload.orgId,
        payload.subjectId as Issue["id"],
      );
      if (issue) await indexIssue(payload.orgId, issue);
    }),
  ];

  return () => {
    for (const off of offs) off();
  };
}

function hrefFor(kind: SearchSubjectKind, subjectId: string): string {
  switch (kind) {
    case "issue":
      return `/issues/${subjectId}`;
    case "comment":
      return `/comments/${subjectId}`;
    case "project":
      return `/projects/${subjectId}`;
  }
}

function snippetAround(content: string, query: string): string {
  const at = content.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return content.slice(0, SNIPPET_RADIUS * 2);

  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(content.length, at + query.length + SNIPPET_RADIUS);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${
    end < content.length ? "…" : ""
  }`;
}
