import { describe, expect, it } from "vitest";
import {
  buildBoardColumns,
  compareBoardIssues,
  findIssue,
  moveIssueInColumns,
  orderColumns,
} from "@/components/domain/board/board-model";
import { toIsoTimestamp } from "@/types/common";
import type { IssueId, OrgId, ProjectId, UserId } from "@/types/common";
import type { Issue, IssuePriority, IssueStatus } from "@/types/issue";

const ORG_ID = "org_1" as OrgId;
const PROJECT_ID = "prj_1" as ProjectId;
const AUTHOR_ID = "usr_1" as UserId;

function issue(
  id: string,
  status: IssueStatus,
  priority: IssuePriority = "none",
  createdAt = "2026-01-01T00:00:00.000Z",
): Issue {
  return {
    id: id as IssueId,
    orgId: ORG_ID,
    projectId: PROJECT_ID,
    number: Number(id.replace(/\D/g, "")) || 1,
    title: `Issue ${id}`,
    description: null,
    status,
    priority,
    authorId: AUTHOR_ID,
    assigneeId: null,
    parentId: null,
    estimate: null,
    dueAt: null,
    startedAt: null,
    completedAt: null,
    labelIds: [],
    archivedAt: null,
    createdAt: toIsoTimestamp(createdAt),
    updatedAt: toIsoTimestamp(createdAt),
  };
}

describe("board-model/buildBoardColumns", () => {
  it("creates one column per status in workflow order", () => {
    const columns = buildBoardColumns([issue("i1", "todo")]);
    expect(columns.map((column) => column.status)).toEqual([
      "backlog",
      "todo",
      "in_progress",
      "in_review",
      "done",
      "canceled",
    ]);
  });

  it("counts each column and keeps empty ones", () => {
    const columns = buildBoardColumns([
      issue("i1", "todo"),
      issue("i2", "todo"),
      issue("i3", "done"),
    ]);
    const byStatus = new Map(columns.map((c) => [c.status, c]));
    expect(byStatus.get("todo")?.total).toBe(2);
    expect(byStatus.get("done")?.total).toBe(1);
    expect(byStatus.get("backlog")?.issues).toEqual([]);
  });

  it("orders a column by priority first, then age", () => {
    const columns = buildBoardColumns([
      issue("i1", "todo", "low", "2026-01-01T00:00:00.000Z"),
      issue("i2", "todo", "urgent", "2026-02-01T00:00:00.000Z"),
      issue("i3", "todo", "low", "2025-12-01T00:00:00.000Z"),
    ]);
    const todo = columns.find((column) => column.status === "todo");
    expect(todo?.issues.map((i) => i.id)).toEqual(["i2", "i3", "i1"]);
  });
});

describe("board-model/compareBoardIssues", () => {
  it("ranks urgent above high", () => {
    expect(
      compareBoardIssues(issue("a", "todo", "urgent"), issue("b", "todo", "high")),
    ).toBeLessThan(0);
  });
});

describe("board-model/moveIssueInColumns", () => {
  const columns = buildBoardColumns([
    issue("i1", "todo"),
    issue("i2", "todo"),
    issue("i3", "in_progress"),
  ]);

  it("moves an issue between columns and rewrites its status", () => {
    const next = moveIssueInColumns(columns, "i1" as IssueId, "in_progress", 0);
    const todo = next.find((c) => c.status === "todo");
    const inProgress = next.find((c) => c.status === "in_progress");

    expect(todo?.issues.map((i) => i.id)).toEqual(["i2"]);
    expect(todo?.total).toBe(1);
    expect(inProgress?.issues.map((i) => i.id)).toEqual(["i1", "i3"]);
    expect(findIssue(next, "i1" as IssueId)?.status).toBe("in_progress");
  });

  it("clamps an index past the end of the target column", () => {
    const next = moveIssueInColumns(columns, "i3" as IssueId, "todo", 99);
    const todo = next.find((c) => c.status === "todo");
    expect(todo?.issues.map((i) => i.id)).toEqual(["i1", "i2", "i3"]);
  });

  it("re-orders within the same column without duplicating the card", () => {
    const next = moveIssueInColumns(columns, "i2" as IssueId, "todo", 0);
    const todo = next.find((c) => c.status === "todo");
    expect(todo?.issues.map((i) => i.id)).toEqual(["i2", "i1"]);
    expect(todo?.total).toBe(2);
  });

  it("leaves the board untouched for an unknown issue", () => {
    expect(moveIssueInColumns(columns, "nope" as IssueId, "done", 0)).toBe(
      columns,
    );
  });
});

describe("board-model/orderColumns", () => {
  it("restores workflow order from an arbitrary arrangement", () => {
    const scrambled = [
      { status: "done" as IssueStatus, issues: [], total: 0 },
      { status: "backlog" as IssueStatus, issues: [], total: 0 },
    ];
    expect(orderColumns(scrambled).map((c) => c.status)).toEqual([
      "backlog",
      "done",
    ]);
  });
});
