import { describe, expect, it } from "vitest";
import {
  applyMention,
  findMentionQuery,
  matchMembers,
  mentionHandle,
} from "@/components/domain/comment/mention-query";
import { toIsoTimestamp } from "@/types/common";
import type { MemberId, OrgId, UserId } from "@/types/common";
import type { MemberWithUser } from "@/types/member";

function member(id: string, name: string, email: string): MemberWithUser {
  const at = toIsoTimestamp("2026-01-01T00:00:00.000Z");
  return {
    id: `mem_${id}` as MemberId,
    orgId: "org_1" as OrgId,
    userId: `usr_${id}` as UserId,
    role: "member",
    status: "active",
    invitedBy: null,
    joinedAt: at,
    lastSeenAt: at,
    archivedAt: null,
    createdAt: at,
    updatedAt: at,
    user: {
      id: `usr_${id}` as UserId,
      email,
      name,
      avatarUrl: null,
      timezone: "UTC",
      emailVerifiedAt: at,
      createdAt: at,
      updatedAt: at,
    },
  };
}

const MEMBERS = [
  member("1", "Ada Lovelace", "ada@example.com"),
  member("2", "Alan Turing", "alan@example.com"),
  member("3", "Grace Hopper", "grace@example.com"),
];

describe("mention-query/findMentionQuery", () => {
  it("finds a mention at the start of the body", () => {
    expect(findMentionQuery("@ad", 3)).toEqual({
      start: 0,
      end: 3,
      query: "ad",
    });
  });

  it("finds a mention after whitespace", () => {
    const found = findMentionQuery("ping @gr", 8);
    expect(found?.start).toBe(5);
    expect(found?.query).toBe("gr");
  });

  it("ignores an @ that is part of an email address", () => {
    expect(findMentionQuery("mail ada@example.com", 20)).toBeNull();
  });

  it("closes the mention once a space is typed", () => {
    expect(findMentionQuery("@ada done", 9)).toBeNull();
  });

  it("only considers text before the caret", () => {
    const found = findMentionQuery("@ada and @alan", 4);
    expect(found?.query).toBe("ada");
  });
});

describe("mention-query/matchMembers", () => {
  it("matches on the email handle", () => {
    expect(matchMembers(MEMBERS, "al").map(mentionHandle)).toEqual(["alan"]);
  });

  it("matches on the display name too", () => {
    expect(matchMembers(MEMBERS, "hopper").map(mentionHandle)).toEqual([
      "grace",
    ]);
  });

  it("returns everyone for an empty query, capped by the limit", () => {
    expect(matchMembers(MEMBERS, "", 2)).toHaveLength(2);
  });
});

describe("mention-query/applyMention", () => {
  it("replaces the typed prefix with the full handle and a space", () => {
    const mention = findMentionQuery("ping @ad", 8);
    expect(mention).not.toBeNull();
    const result = applyMention("ping @ad", mention!, MEMBERS[0]!);
    expect(result.body).toBe("ping @ada ");
    expect(result.caret).toBe(result.body.length);
  });

  it("keeps text that follows the mention", () => {
    const mention = findMentionQuery("@ad please look", 3);
    const result = applyMention("@ad please look", mention!, MEMBERS[0]!);
    expect(result.body).toBe("@ada  please look");
  });
});
