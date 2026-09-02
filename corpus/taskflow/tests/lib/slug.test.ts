/** `slugify`, reserved slugs and `uniqueSlug` suffixing. */
import { describe, expect, it } from "vitest";
import {
  InvalidSlugError,
  RESERVED_SLUGS,
  SLUG_MAX_LENGTH,
  assertValidSlug,
  isReservedSlug,
  isValidSlug,
  projectKeyFromName,
  slugify,
  uniqueSlug,
} from "@/lib/slug";

describe("lib/slug", () => {
  it("lowercases and hyphenates a display name", () => {
    expect(slugify("Website Relaunch")).toBe("website-relaunch");
    expect(slugify("  Acme   Corp  ")).toBe("acme-corp");
  });

  it("strips diacritics and punctuation", () => {
    expect(slugify("Café Münster")).toBe("cafe-munster");
    expect(slugify("Q3 — Roadmap!")).toBe("q3-roadmap");
  });

  it("collapses runs of separators and trims leading/trailing hyphens", () => {
    expect(slugify("--hello___world--")).toBe("hello-world");
  });

  it("truncates to the maximum length without a trailing hyphen", () => {
    const slug = slugify("a".repeat(80));
    expect(slug.length).toBe(SLUG_MAX_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string when there is nothing sluggable", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("validates length and shape", () => {
    expect(isValidSlug("acme")).toBe(true);
    expect(isValidSlug("a")).toBe(false);
    expect(isValidSlug("Acme")).toBe(false);
    expect(isValidSlug("acme--corp")).toBe(false);
    expect(isValidSlug("-acme")).toBe(false);
    expect(isValidSlug("a".repeat(SLUG_MAX_LENGTH + 1))).toBe(false);
  });

  it("knows the router's reserved slugs", () => {
    expect(isReservedSlug("settings")).toBe(true);
    expect(isReservedSlug("acme")).toBe(false);
    for (const reserved of RESERVED_SLUGS) {
      expect(isReservedSlug(reserved), reserved).toBe(true);
    }
  });

  it("throws InvalidSlugError for malformed and reserved slugs", () => {
    expect(() => assertValidSlug("acme")).not.toThrow();
    expect(() => assertValidSlug("Acme!")).toThrow(InvalidSlugError);
    expect(() => assertValidSlug("billing")).toThrow(/reserved/);
  });

  it("returns the base slug when nothing has claimed it", () => {
    expect(uniqueSlug("Website Relaunch", [])).toBe("website-relaunch");
  });

  it("suffixes numerically until it finds a free slug", () => {
    expect(uniqueSlug("Acme", ["acme"])).toBe("acme-2");
    expect(uniqueSlug("Acme", ["acme", "acme-2", "acme-3"])).toBe("acme-4");
  });

  it("never returns a reserved slug, even as the base", () => {
    const slug = uniqueSlug("Settings", []);
    expect(slug).not.toBe("settings");
    expect(isReservedSlug(slug)).toBe(false);
  });

  it("falls back to `item` for input with no sluggable characters", () => {
    expect(uniqueSlug("???", [])).toBe("item");
  });

  it("derives a project key from the initials of a multi-word name", () => {
    expect(projectKeyFromName("Website Relaunch")).toBe("WR");
    expect(projectKeyFromName("Customer Data Platform")).toBe("CDP");
  });

  it("derives a project key from the first letters of a single word", () => {
    expect(projectKeyFromName("Payments")).toBe("PAY");
    expect(projectKeyFromName("")).toBe("TAS");
  });
});
