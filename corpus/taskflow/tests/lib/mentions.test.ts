/** Mention extraction and resolution against a member list. */
import { describe, expect, it } from "vitest";
import { extractMentions, highlightMentions, resolveMentions } from "@/lib/mentions";
import { ALICE, BOB, makeMember, makeUser } from "../helpers/factories";

const members = [
  makeMember({ user: makeUser({ id: ALICE, email: "alice@example.com" }) }),
  makeMember({
    user: makeUser({ id: BOB, email: "bob.smith@example.com", name: "Bob Smith" }),
  }),
];

describe("lib/mentions", () => {
  it("extracts handles in first-appearance order without duplicates", () => {
    expect(extractMentions("@alice and @bob.smith — also @alice again")).toEqual([
      "alice",
      "bob.smith",
    ]);
  });

  it("lowercases handles so resolution is case-insensitive", () => {
    expect(extractMentions("ping @Alice")).toEqual(["alice"]);
  });

  it("finds a mention at the start of the body and after punctuation", () => {
    expect(extractMentions("@alice look")).toEqual(["alice"]);
    expect(extractMentions("(@alice) and [@bob.smith]")).toEqual(["alice", "bob.smith"]);
  });

  it("does not treat an email address as a mention", () => {
    expect(extractMentions("mail alice@example.com about it")).toEqual([]);
  });

  it("ignores mentions inside code spans and fenced blocks", () => {
    expect(extractMentions("use `@alice` here")).toEqual([]);
    expect(extractMentions("```\n@alice\n```\nbut @bob.smith is real")).toEqual([
      "bob.smith",
    ]);
  });

  it("returns an empty list for a body with no mentions", () => {
    expect(extractMentions("no mentions at all")).toEqual([]);
  });

  it("resolves handles to the ids of members who exist", () => {
    expect(resolveMentions("@alice @bob.smith", members)).toEqual([ALICE, BOB]);
  });

  it("drops unknown handles rather than failing", () => {
    expect(resolveMentions("@alice @nobody", members)).toEqual([ALICE]);
    expect(resolveMentions("@nobody", members)).toEqual([]);
  });

  it("resolves each user at most once", () => {
    expect(resolveMentions("@alice @Alice @alice", members)).toEqual([ALICE]);
  });

  it("resolves nothing against an empty member list", () => {
    expect(resolveMentions("@alice", [])).toEqual([]);
  });

  it("wraps mentions in a span for the comment renderer", () => {
    expect(highlightMentions("hi @alice")).toBe(
      'hi <span class="mention">@alice</span>',
    );
    expect(highlightMentions("no mention here")).toBe("no mention here");
  });
});
