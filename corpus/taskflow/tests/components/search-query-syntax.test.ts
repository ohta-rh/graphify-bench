import { describe, expect, it } from "vitest";
import {
  describeQuery,
  parseSearchQuery,
} from "@/components/domain/search/query-syntax";

describe("query-syntax/parseSearchQuery", () => {
  it("treats everything as free text when the flag is off", () => {
    const parsed = parseSearchQuery("kind:comment deploy", false);
    expect(parsed.text).toBe("kind:comment deploy");
    expect(parsed.kinds).toEqual(["issue"]);
  });

  it("extracts kind tokens when the flag is on", () => {
    const parsed = parseSearchQuery("kind:comment deploy", true);
    expect(parsed.text).toBe("deploy");
    expect(parsed.kinds).toEqual(["comment"]);
  });

  it("accepts the plural and the in: alias", () => {
    expect(parseSearchQuery("in:projects roadmap", true).kinds).toEqual([
      "project",
    ]);
  });

  it("collects several kinds", () => {
    expect(
      parseSearchQuery("kind:issue kind:comment flaky", true).kinds,
    ).toEqual(["issue", "comment"]);
  });

  it("extracts a project filter", () => {
    const parsed = parseSearchQuery("project:prj_7 latency", true);
    expect(parsed.projectId).toBe("prj_7");
    expect(parsed.text).toBe("latency");
  });

  it("reports tokens it did not understand instead of searching for them", () => {
    const parsed = parseSearchQuery("author:ada bug", true);
    expect(parsed.unknownTokens).toEqual(["author:ada"]);
    expect(parsed.text).toBe("bug");
  });

  it("keeps a leading colon as ordinary text", () => {
    expect(parseSearchQuery(":wat", true).text).toBe(":wat");
  });

  it("falls back to the default kind when only syntax was typed", () => {
    expect(parseSearchQuery("project:prj_7", true).kinds).toEqual(["issue"]);
  });
});

describe("query-syntax/describeQuery", () => {
  it("summarises what the parser understood", () => {
    const parsed = parseSearchQuery("kind:comment project:prj_1 nope:x hi", true);
    const description = describeQuery(parsed);
    expect(description).toContain("searching comment");
    expect(description).toContain("in project prj_1");
    expect(description).toContain("ignoring nope:x");
  });
});
