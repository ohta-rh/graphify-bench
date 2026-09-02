/** Comment body limits and mention array bounds. */
import { describe, expect, it } from "vitest";
import {
  createCommentSchema,
  deleteCommentSchema,
  listCommentsSchema,
  updateCommentSchema,
} from "@/schemas/comment";
import { ALICE, ORG_A } from "../helpers/factories";

const ISSUE = "01HZZZSSSSSSSSSSSSSSSSSSSS";
const COMMENT = "01HZZZCCCCCCCCCCCCCCCCCCCC";

function createInput(overrides: Record<string, unknown> = {}) {
  return { orgId: ORG_A, issueId: ISSUE, body: "Looking at this now.", ...overrides };
}

describe("schemas/comment", () => {
  it("defaults the parent and mention list", () => {
    expect(createCommentSchema.parse(createInput())).toMatchObject({
      parentId: null,
      mentionedUserIds: [],
    });
  });

  it("rejects an empty body with a helpful message", () => {
    const result = createCommentSchema.safeParse(createInput({ body: "" }));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.path).toEqual(["body"]);
    expect(result.error.issues[0]?.message).toBe("write something");
  });

  it("caps the body at 10,000 characters", () => {
    expect(
      createCommentSchema.safeParse(createInput({ body: "a".repeat(10_000) })).success,
    ).toBe(true);
    expect(
      createCommentSchema.safeParse(createInput({ body: "a".repeat(10_001) })).success,
    ).toBe(false);
  });

  it("accepts a reply with an explicit parent id", () => {
    expect(createCommentSchema.parse(createInput({ parentId: COMMENT })).parentId).toBe(
      COMMENT,
    );
    expect(createCommentSchema.safeParse(createInput({ parentId: "nope" })).success).toBe(
      false,
    );
  });

  it("caps the mention list at 50 ids", () => {
    expect(
      createCommentSchema.safeParse(
        createInput({ mentionedUserIds: Array(50).fill(ALICE) }),
      ).success,
    ).toBe(true);
    expect(
      createCommentSchema.safeParse(
        createInput({ mentionedUserIds: Array(51).fill(ALICE) }),
      ).success,
    ).toBe(false);
  });

  it("rejects a non-ULID in the mention list", () => {
    expect(
      createCommentSchema.safeParse(createInput({ mentionedUserIds: ["alice"] })).success,
    ).toBe(false);
  });

  it("requires a non-empty body on update", () => {
    expect(
      updateCommentSchema.safeParse({ orgId: ORG_A, commentId: COMMENT, body: "edited" })
        .success,
    ).toBe(true);
    expect(
      updateCommentSchema.safeParse({ orgId: ORG_A, commentId: COMMENT, body: "" })
        .success,
    ).toBe(false);
  });

  it("needs only the org and comment to delete", () => {
    expect(deleteCommentSchema.parse({ orgId: ORG_A, commentId: COMMENT })).toEqual({
      orgId: ORG_A,
      commentId: COMMENT,
    });
  });

  it("carries pagination and archive scope when listing a thread", () => {
    const parsed = listCommentsSchema.parse({ orgId: ORG_A, issueId: ISSUE });
    expect(parsed.limit).toBe(25);
    expect(parsed.includeArchived).toBe(false);
    expect(
      listCommentsSchema.safeParse({ orgId: ORG_A, issueId: ISSUE, limit: 0 }).success,
    ).toBe(false);
  });
});
