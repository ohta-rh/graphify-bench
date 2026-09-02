import { describe, expect, it } from "vitest";
import {
  isClosedStatus,
  optimisticIssuesReducer,
  withAssignee,
  withStatus,
} from "@/hooks/optimistic-issues-reducer";
import { toIsoTimestamp } from "@/types/common";
import type { IssueId, OrgId, ProjectId, UserId } from "@/types/common";
import type { Issue } from "@/types/issue";

const AT = toIsoTimestamp("2026-03-01T12:00:00.000Z");

const BASE: Issue = {
  id: "iss_1" as IssueId,
  orgId: "org_1" as OrgId,
  projectId: "prj_1" as ProjectId,
  number: 12,
  title: "Fix the thing",
  description: null,
  status: "todo",
  priority: "medium",
  authorId: "usr_1" as UserId,
  assigneeId: null,
  parentId: null,
  estimate: null,
  dueAt: null,
  startedAt: null,
  completedAt: null,
  labelIds: [],
  archivedAt: null,
  createdAt: toIsoTimestamp("2026-01-01T00:00:00.000Z"),
  updatedAt: toIsoTimestamp("2026-01-01T00:00:00.000Z"),
};

describe("optimistic-issues/isClosedStatus", () => {
  it("treats done and canceled as closed", () => {
    expect(isClosedStatus("done")).toBe(true);
    expect(isClosedStatus("canceled")).toBe(true);
    expect(isClosedStatus("in_review")).toBe(false);
  });
});

describe("optimistic-issues/withStatus", () => {
  it("stamps completedAt when the issue closes", () => {
    const next = withStatus(BASE, "done", AT);
    expect(next.status).toBe("done");
    expect(next.completedAt).toBe(AT);
    expect(next.updatedAt).toBe(AT);
  });

  it("clears completedAt when the issue is reopened", () => {
    const closed = withStatus(BASE, "done", AT);
    const reopened = withStatus(closed, "in_progress", AT);
    expect(reopened.completedAt).toBeNull();
  });

  it("stamps startedAt the first time work begins", () => {
    const started = withStatus(BASE, "in_progress", AT);
    expect(started.startedAt).toBe(AT);

    const later = toIsoTimestamp("2026-04-01T00:00:00.000Z");
    const paused = withStatus(started, "todo", later);
    const resumed = withStatus(paused, "in_progress", later);
    expect(resumed.startedAt).toBe(AT);
  });

  it("is a no-op when the status is unchanged", () => {
    expect(withStatus(BASE, "todo", AT)).toBe(BASE);
  });
});

describe("optimistic-issues/withAssignee", () => {
  it("assigns and touches updatedAt", () => {
    const next = withAssignee(BASE, "usr_2" as UserId, AT);
    expect(next.assigneeId).toBe("usr_2");
    expect(next.updatedAt).toBe(AT);
  });

  it("is a no-op when the assignee is unchanged", () => {
    expect(withAssignee(BASE, null, AT)).toBe(BASE);
  });
});

describe("optimistic-issues/reducer", () => {
  const issues = [BASE, { ...BASE, id: "iss_2" as IssueId, number: 13 }];

  it("only rewrites the targeted issue", () => {
    const next = optimisticIssuesReducer(issues, {
      kind: "status",
      issueId: "iss_2" as IssueId,
      status: "done",
    });
    expect(next[0]).toBe(issues[0]);
    expect(next[1]?.status).toBe("done");
  });

  it("applies an assignee change", () => {
    const next = optimisticIssuesReducer(issues, {
      kind: "assignee",
      issueId: "iss_1" as IssueId,
      assigneeId: "usr_9" as UserId,
    });
    expect(next[0]?.assigneeId).toBe("usr_9");
  });

  it("leaves the list alone for an unknown id", () => {
    const next = optimisticIssuesReducer(issues, {
      kind: "status",
      issueId: "missing" as IssueId,
      status: "done",
    });
    expect(next).toEqual(issues);
  });
});
