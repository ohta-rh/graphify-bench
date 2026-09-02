/** Class-name merging: falsy values, de-duplication and caller precedence. */
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("lib/cn", () => {
  it("joins truthy class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
    expect(cn()).toBe("");
  });

  it("splits multi-class strings", () => {
    expect(cn("px-2 py-1", "text-sm")).toBe("px-2 py-1 text-sm");
  });

  it("keeps the last occurrence so a caller's className wins", () => {
    expect(cn("a b", "a")).toBe("b a");
  });

  it("collapses repeated whitespace", () => {
    expect(cn("  a   b  ")).toBe("a b");
  });
});
