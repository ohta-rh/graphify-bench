/** Route shapes and query-string composition. */
import { describe, expect, it } from "vitest";
import {
  issuePath,
  orgPath,
  projectPath,
  settingsPath,
  withSearchParams,
} from "@/lib/url";

describe("lib/url", () => {
  it("builds an org-rooted path", () => {
    expect(orgPath("acme")).toBe("/acme");
    expect(orgPath("acme", "issues")).toBe("/acme/issues");
    expect(orgPath("acme", "issues", "new")).toBe("/acme/issues/new");
  });

  it("encodes segments so a slug cannot break out of the path", () => {
    expect(orgPath("acme corp")).toBe("/acme%20corp");
    expect(orgPath("acme", "a/b")).toBe("/acme/a%2Fb");
  });

  it("nests project paths under the org", () => {
    expect(projectPath("acme", "website")).toBe("/acme/projects/website");
    expect(projectPath("acme", "website", "board")).toBe(
      "/acme/projects/website/board",
    );
  });

  it("builds an issue path from the issue number", () => {
    expect(issuePath("acme", "website", 142)).toBe(
      "/acme/projects/website/issues/142",
    );
  });

  it("builds settings paths with and without a section", () => {
    expect(settingsPath("acme")).toBe("/acme/settings");
    expect(settingsPath("acme", "billing")).toBe("/acme/settings/billing");
  });

  it("appends query parameters and stringifies numbers", () => {
    expect(withSearchParams("/acme/issues", { status: "todo", page: 2 })).toBe(
      "/acme/issues?status=todo&page=2",
    );
  });

  it("drops undefined parameters instead of writing 'undefined'", () => {
    expect(withSearchParams("/acme/issues", { status: undefined })).toBe(
      "/acme/issues",
    );
  });

  it("merges into an existing query string, overwriting on conflict", () => {
    expect(withSearchParams("/acme/issues?status=done&page=1", { page: 3 })).toBe(
      "/acme/issues?status=done&page=3",
    );
  });

  it("removes a parameter when its value is undefined", () => {
    expect(withSearchParams("/acme/issues?status=done", { status: undefined })).toBe(
      "/acme/issues",
    );
  });
});
