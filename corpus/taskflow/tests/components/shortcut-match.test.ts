import { describe, expect, it } from "vitest";
import {
  formatShortcut,
  matchesShortcut,
  parseShortcut,
  prefersMetaKey,
  type ShortcutEventLike,
} from "@/hooks/shortcut-match";

function event(
  key: string,
  modifiers: Partial<Omit<ShortcutEventLike, "key">> = {},
): ShortcutEventLike {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  };
}

describe("shortcut-match/parseShortcut", () => {
  it("splits modifiers from the key", () => {
    expect(parseShortcut(["mod", "K"])).toEqual({
      modifiers: ["mod"],
      key: "k",
    });
  });

  it("returns a null key when only modifiers were given", () => {
    expect(parseShortcut(["shift"]).key).toBeNull();
  });
});

describe("shortcut-match/matchesShortcut", () => {
  it("maps mod to Meta on Apple platforms", () => {
    expect(
      matchesShortcut(["mod", "k"], event("k", { metaKey: true }), "MacIntel"),
    ).toBe(true);
    expect(
      matchesShortcut(["mod", "k"], event("k", { ctrlKey: true }), "MacIntel"),
    ).toBe(false);
  });

  it("maps mod to Control elsewhere", () => {
    expect(
      matchesShortcut(["mod", "k"], event("k", { ctrlKey: true }), "Win32"),
    ).toBe(true);
  });

  it("rejects a match with an extra modifier held down", () => {
    expect(
      matchesShortcut(
        ["mod", "k"],
        event("k", { ctrlKey: true, shiftKey: true }),
        "Win32",
      ),
    ).toBe(false);
  });

  it("matches a bare key", () => {
    expect(matchesShortcut(["c"], event("c"), "Win32")).toBe(true);
    expect(matchesShortcut(["c"], event("v"), "Win32")).toBe(false);
  });

  it("never matches when no key was configured", () => {
    expect(matchesShortcut(["mod"], event("Control"), "Win32")).toBe(false);
  });
});

describe("shortcut-match/formatShortcut", () => {
  it("renders Apple glyphs on Apple platforms", () => {
    expect(formatShortcut(["mod", "k"], "MacIntel")).toBe("⌘K");
  });

  it("renders Ctrl+K elsewhere", () => {
    expect(formatShortcut(["mod", "k"], "Win32")).toBe("Ctrl+K");
  });

  it("knows which platforms prefer Meta", () => {
    expect(prefersMetaKey("iPhone")).toBe(true);
    expect(prefersMetaKey("Linux x86_64")).toBe(false);
  });
});
