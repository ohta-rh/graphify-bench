/** `createIssueSchema` defaults, bounds and error paths. */
import { describe, expect, it } from "vitest";
import {
  archiveIssueSchema,
  assignIssueSchema,
  changeIssueStatusSchema,
  createIssueSchema,
  issueFilterSchema,
  moveIssueSchema,
  updateIssueSchema,
} from "@/schemas/issue";
import { ISSUE_PRIORITIES, ISSUE_STATUSES } from "@/types/issue";
import { ALICE, ORG_A } from "../helpers/factories";

const PROJECT = "01HZZZPPPPPPPPPPPPPPPPPPPP";
const ISSUE = "01HZZZSSSSSSSSSSSSSSSSSSSS";

function createInput(overrides: Record<string, unknown> = {}) {
  return { orgId: ORG_A, projectId: PROJECT, title: "Fix the link", ...overrides };
}

describe("schemas/issue", () => {
  it("applies every documented default", () => {
    expect(createIssueSchema.parse(createInput())).toMatchObject({
      description: null,
      status: "backlog",
      priority: "none",
      assigneeId: null,
      parentId: null,
      estimate: null,
      dueAt: null,
      labelIds: [],
    });
  });

  it("accepts every status and priority in the domain", () => {
    for (const status of ISSUE_STATUSES) {
      expect(createIssueSchema.safeParse(createInput({ status })).success, status).toBe(
        true,
      );
    }
    for (const priority of ISSUE_PRIORITIES) {
      expect(
        createIssueSchema.safeParse(createInput({ priority })).success,
        priority,
      ).toBe(true);
    }
  });

  it("rejects a status outside the enum", () => {
    expect(createIssueSchema.safeParse(createInput({ status: "shipped" })).success).toBe(
      false,
    );
  });

  it("bounds the title at 3 and 200 characters, reporting the title path", () => {
    expect(createIssueSchema.safeParse(createInput({ title: "ab" })).success).toBe(false);
    expect(
      createIssueSchema.safeParse(createInput({ title: "a".repeat(201) })).success,
    ).toBe(false);

    const result = createIssueSchema.safeParse(createInput({ title: "ab" }));
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["title"]);
    expect(result.error.issues[0]?.message).toBe("give the issue a title");
  });

  it("requires ULID ids and reports the offending path", () => {
    const result = createIssueSchema.safeParse(createInput({ projectId: "nope" }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["projectId"]);
  });

  it("bounds the estimate to a whole number between 0 and 100", () => {
    expect(createIssueSchema.safeParse(createInput({ estimate: 8 })).success).toBe(true);
    expect(createIssueSchema.safeParse(createInput({ estimate: 1.5 })).success).toBe(
      false,
    );
    expect(createIssueSchema.safeParse(createInput({ estimate: 101 })).success).toBe(
      false,
    );
    expect(createIssueSchema.safeParse(createInput({ estimate: null })).success).toBe(
      true,
    );
  });

  it("caps the label list at 20", () => {
    const label = "01HZZZKKKKKKKKKKKKKKKKKKKK";
    expect(
      createIssueSchema.safeParse(createInput({ labelIds: Array(20).fill(label) }))
        .success,
    ).toBe(true);
    expect(
      createIssueSchema.safeParse(createInput({ labelIds: Array(21).fill(label) }))
        .success,
    ).toBe(false);
  });

  it("requires a real ISO datetime for dueAt", () => {
    expect(
      createIssueSchema.safeParse(createInput({ dueAt: "2026-03-15T12:00:00.000Z" }))
        .success,
    ).toBe(true);
    expect(createIssueSchema.safeParse(createInput({ dueAt: "2026-03-15" })).success).toBe(
      false,
    );
  });

  it("makes every updatable field optional on update", () => {
    expect(updateIssueSchema.parse({ orgId: ORG_A, issueId: ISSUE })).toEqual({
      orgId: ORG_A,
      issueId: ISSUE,
    });
  });

  it("still bounds fields that are present on update", () => {
    expect(
      updateIssueSchema.safeParse({ orgId: ORG_A, issueId: ISSUE, title: "ab" }).success,
    ).toBe(false);
  });

  it("requires a status on the status-change payload", () => {
    expect(
      changeIssueStatusSchema.safeParse({ orgId: ORG_A, issueId: ISSUE }).success,
    ).toBe(false);
    expect(
      changeIssueStatusSchema.parse({ orgId: ORG_A, issueId: ISSUE, status: "done" })
        .status,
    ).toBe("done");
  });

  it("allows unassignment with an explicit null", () => {
    expect(
      assignIssueSchema.parse({ orgId: ORG_A, issueId: ISSUE, assigneeId: null })
        .assigneeId,
    ).toBeNull();
    expect(
      assignIssueSchema.parse({ orgId: ORG_A, issueId: ISSUE, assigneeId: ALICE })
        .assigneeId,
    ).toBe(ALICE);
    expect(assignIssueSchema.safeParse({ orgId: ORG_A, issueId: ISSUE }).success).toBe(
      false,
    );
  });

  it("carries pagination and archive scope on the filter schema", () => {
    const parsed = issueFilterSchema.parse({ orgId: ORG_A });
    expect(parsed.limit).toBe(25);
    expect(parsed.includeArchived).toBeUndefined();

    expect(
      issueFilterSchema.parse({ orgId: ORG_A, limit: 50, includeArchived: true }),
    ).toMatchObject({ limit: 50, includeArchived: true });
    expect(issueFilterSchema.safeParse({ orgId: ORG_A, limit: 101 }).success).toBe(false);
  });

  it("requires a non-negative board index on move", () => {
    expect(
      moveIssueSchema.safeParse({
        orgId: ORG_A,
        issueId: ISSUE,
        toStatus: "todo",
        toIndex: -1,
      }).success,
    ).toBe(false);
    expect(
      moveIssueSchema.safeParse({
        orgId: ORG_A,
        issueId: ISSUE,
        toStatus: "todo",
        toIndex: 0,
      }).success,
    ).toBe(true);
  });

  it("needs only the org and issue to archive", () => {
    expect(archiveIssueSchema.parse({ orgId: ORG_A, issueId: ISSUE })).toEqual({
      orgId: ORG_A,
      issueId: ISSUE,
    });
  });
});
