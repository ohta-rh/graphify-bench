import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  issueFilterQueryString,
  issueFilterToParams,
  parseIssueFilterParams,
  UNASSIGNED_TOKEN,
} from "@/hooks/issue-filter-params";
import type { LabelId, ProjectId, UserId } from "@/types/common";
import type { IssueFilter } from "@/types/issue";

function params(query: string): URLSearchParams {
  return new URLSearchParams(query);
}

describe("issue-filter-params/parse", () => {
  it("returns an empty filter for an empty query string", () => {
    expect(parseIssueFilterParams(params(""))).toEqual({});
  });

  it("parses comma-separated statuses and drops unknown values", () => {
    const filter = parseIssueFilterParams(params("status=todo,nonsense,done"));
    expect(filter.status).toEqual(["todo", "done"]);
  });

  it("distinguishes unassigned from no assignee filter", () => {
    expect(parseIssueFilterParams(params("assignee=none")).assigneeId).toBeNull();
    expect("assigneeId" in parseIssueFilterParams(params(""))).toBe(false);
  });

  it("reads the archived flag only for the literal 1", () => {
    expect(parseIssueFilterParams(params("archived=1")).includeArchived).toBe(
      true,
    );
    expect(
      parseIssueFilterParams(params("archived=true")).includeArchived,
    ).toBeUndefined();
  });
});

describe("issue-filter-params/serialise", () => {
  const filter: IssueFilter = {
    projectId: "prj_1" as ProjectId,
    status: ["todo", "in_progress"],
    assigneeId: "usr_1" as UserId,
    labelIds: ["lbl_1" as LabelId, "lbl_2" as LabelId],
    query: "crash",
    includeArchived: true,
  };

  it("round-trips through the query string", () => {
    const restored = parseIssueFilterParams(
      params(new URLSearchParams(issueFilterToParams(filter)).toString()),
    );
    expect(restored).toEqual(filter);
  });

  it("omits empty dimensions entirely", () => {
    expect(issueFilterToParams({ status: [], labelIds: [], query: "" })).toEqual(
      {},
    );
  });

  it("writes unassigned as the sentinel token", () => {
    expect(issueFilterToParams({ assigneeId: null }).assignee).toBe(
      UNASSIGNED_TOKEN,
    );
  });

  it("produces a bare path for an empty filter", () => {
    expect(issueFilterQueryString({})).toBe("");
    expect(issueFilterQueryString({ query: "x" })).toBe("?q=x");
  });

  it("counts the narrowed dimensions", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount(filter)).toBe(6);
  });
});
