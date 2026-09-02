import { describe, expect, it } from "vitest";
import {
  InvalidSlugError,
  SLUG_MAX_LENGTH,
  assertValidSlug,
  isReservedSlug,
  isValidSlug,
  projectKeyFromName,
  slugify,
  uniqueSlug,
} from "@/lib/slug";

describe("slugify", () => {
  it("lowercases, strips punctuation and collapses separators", () => {
    expect(slugify("Taskflow Core Team")).toBe("taskflow-core-team");
    expect(slugify("  Hello,   World!  ")).toBe("hello-world");
    expect(slugify("a---b")).toBe("a-b");
  });

  it("strips diacritics rather than dropping the letter", () => {
    expect(slugify("Café Münster")).toBe("cafe-munster");
  });

  it("never emits a leading or trailing hyphen", () => {
    expect(slugify("--edge--")).toBe("edge");
    expect(slugify("!!!")).toBe("");
  });

  it("respects the maximum length", () => {
    expect(slugify("x".repeat(200)).length).toBeLessThanOrEqual(SLUG_MAX_LENGTH);
  });
});

describe("slug validation", () => {
  it("accepts well-formed slugs and rejects malformed ones", () => {
    expect(isValidSlug("acme-corp")).toBe(true);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("acme--corp")).toBe(false);
    expect(isValidSlug("-acme")).toBe(false);
  });

  it("knows the reserved slugs", () => {
    expect(isReservedSlug("settings")).toBe(true);
    expect(isReservedSlug("acme")).toBe(false);
  });

  it("assertValidSlug throws InvalidSlugError for malformed and reserved values", () => {
    expect(() => assertValidSlug("acme-corp")).not.toThrow();
    expect(() => assertValidSlug("Acme")).toThrow(InvalidSlugError);
    expect(() => assertValidSlug("billing")).toThrow(InvalidSlugError);
  });
});

describe("uniqueSlug", () => {
  it("returns the base slug when it is free", () => {
    expect(uniqueSlug("Acme Corp", [])).toBe("acme-corp");
  });

  it("appends an incrementing suffix on collision", () => {
    expect(uniqueSlug("Acme Corp", ["acme-corp"])).toBe("acme-corp-2");
    expect(uniqueSlug("Acme Corp", ["acme-corp", "acme-corp-2"])).toBe("acme-corp-3");
  });

  it("skips reserved slugs", () => {
    expect(uniqueSlug("Billing", [])).toBe("billing-2");
  });

  it("falls back to a usable base when the input slugifies to nothing", () => {
    expect(uniqueSlug("!!!", [])).toBe("item");
  });
});

describe("projectKeyFromName", () => {
  it("uses initials for multi-word names", () => {
    expect(projectKeyFromName("Mobile App Redesign")).toBe("MAR");
  });

  it("uses a prefix for single-word names", () => {
    expect(projectKeyFromName("Platform")).toBe("PLA");
  });

  it("always returns a non-empty uppercase key", () => {
    expect(projectKeyFromName("###")).toBe("TASK");
  });
});
