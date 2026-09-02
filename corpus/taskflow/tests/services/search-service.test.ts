/**
 * Index maintenance on issue and comment writes.
 *
 * Owner C implements `@/server/services/search-service`.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/id", () => import("../server/_support/doubles/id"));
vi.mock("@/lib/logger", async () => (await import("../server/_support/doubles/misc")).loggerModule);
vi.mock("@/lib/rate-limit", async () => (await import("../server/_support/doubles/misc")).rateLimitModule);

import * as commentService from "@/server/services/comment-service";
import * as issueService from "@/server/services/issue-service";
import * as searchService from "@/server/services/search-service";
import { rateLimitState } from "../server/_support/doubles/misc";
import { createTenant, issueInput, useTemporaryDatabase } from "../server/_support/fixtures";
import type { Tenant } from "../server/_support/fixtures";
import type { Unsubscribe } from "@/types/event";

let cleanup: () => void;
let tenant: Tenant;
let detach: Unsubscribe;

beforeAll(async () => {
  cleanup = await useTemporaryDatabase();
  detach = searchService.registerSearchListeners();
  tenant = await createTenant("searchsvc", "growth");
});

afterAll(() => {
  detach();
  cleanup();
});

afterEach(() => {
  rateLimitState.allowed = true;
  rateLimitState.remaining = 100;
});

describe("services/search-service", () => {
  it("indexes an issue and a comment on creation", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Zulu index target" }),
    );
    const comment = await commentService.createComment(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      body: "Yankee index target",
      parentId: null,
      mentionedUserIds: [],
    });

    const issueHits = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Zulu",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(issueHits.total).toBe(1);
    expect(issueHits.items[0]).toMatchObject({ kind: "issue", id: issue.id });

    const commentHits = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Yankee",
      kinds: ["comment"],
      limit: 25,
      cursor: null,
    });
    expect(commentHits.total).toBe(1);
    expect(commentHits.items[0]).toMatchObject({ kind: "comment", id: comment.id });
  });

  it("re-indexes an updated issue in place", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "Original Title Marker" }),
    );

    await issueService.updateIssue(tenant.actors.member, {
      orgId: tenant.org.id,
      issueId: issue.id,
      title: "Updated Title Marker",
    });

    const stale = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Original Title Marker",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(stale.total).toBe(0);

    const fresh = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "Updated Title Marker",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(fresh.total).toBe(1);
    expect(fresh.items[0]).toMatchObject({ id: issue.id });
  });

  it("drops an archived issue from the index", async () => {
    const issue = await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "ArchiveIndexMarker" }),
    );

    const before = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "ArchiveIndexMarker",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(before.total).toBe(1);

    await issueService.archiveIssue(tenant.actors.member, tenant.org.id, issue.id);

    const after = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "ArchiveIndexMarker",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });
    expect(after.total).toBe(0);
  });

  it("never returns another tenant's rows", async () => {
    const other = await createTenant("searchsvcother", "growth");
    await issueService.createIssue(
      other.actors.member,
      issueInput(other.org.id, other.project.id, { title: "CrossTenantMarker" }),
    );

    const hits = await searchService.search(tenant.actors.member, {
      orgId: tenant.org.id,
      q: "CrossTenantMarker",
      kinds: ["issue"],
      limit: 25,
      cursor: null,
    });

    expect(hits.total).toBe(0);
    expect(hits.items).toHaveLength(0);
  });

  it("falls back to plain matching when advanced_search is off", async () => {
    // The tenant is on "growth", which does not include advanced_search.
    await issueService.createIssue(
      tenant.actors.member,
      issueInput(tenant.org.id, tenant.project.id, { title: "PlainMatchWorks" }),
    );

    await expect(
      searchService.search(tenant.actors.member, {
        orgId: tenant.org.id,
        q: "PlainMatchWorks",
        kinds: ["issue"],
        limit: 25,
        cursor: null,
      }),
    ).resolves.toMatchObject({ total: 1 });

    await expect(
      searchService.search(tenant.actors.member, {
        orgId: tenant.org.id,
        q: "status:PlainMatchWorks",
        kinds: ["issue"],
        limit: 25,
        cursor: null,
      }),
    ).rejects.toThrow(/not included in this plan/);
  });

  it("rate-limits search queries per organization", async () => {
    rateLimitState.allowed = false;

    await expect(
      searchService.search(tenant.actors.member, {
        orgId: tenant.org.id,
        q: "anything",
        kinds: ["issue"],
        limit: 25,
        cursor: null,
      }),
    ).rejects.toThrow(/rate limit/i);
  });
});
