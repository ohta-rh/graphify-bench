/**
 * Keyboard-shortcut matching, split out of `useKeyboardShortcut` so the
 * modifier rules can be unit tested without a DOM event loop.
 *
 * A shortcut is written as a list of tokens, e.g. `["mod", "k"]` or
 * `["shift", "?"]`. `mod` means Meta on Apple platforms and Control elsewhere,
 * which is what every desktop app does and what users expect from Ctrl+K.
 */

export type ShortcutModifier = "mod" | "ctrl" | "meta" | "alt" | "shift";

const MODIFIERS: readonly string[] = ["mod", "ctrl", "meta", "alt", "shift"];

export interface ShortcutEventLike {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

export interface ParsedShortcut {
  readonly modifiers: readonly ShortcutModifier[];
  readonly key: string | null;
}

export function parseShortcut(keys: readonly string[]): ParsedShortcut {
  const modifiers: ShortcutModifier[] = [];
  let key: string | null = null;

  for (const raw of keys) {
    const token = raw.trim().toLowerCase();
    if (token.length === 0) continue;
    if (MODIFIERS.includes(token)) {
      modifiers.push(token as ShortcutModifier);
    } else {
      key = token;
    }
  }

  return { modifiers, key };
}

/** True when `mod` should resolve to Meta rather than Control. */
export function prefersMetaKey(platform: string): boolean {
  return /mac|iphone|ipad|ipod/i.test(platform);
}

export function matchesShortcut(
  keys: readonly string[],
  event: ShortcutEventLike,
  platform = "",
): boolean {
  const { modifiers, key } = parseShortcut(keys);
  if (key === null) return false;
  if (event.key.toLowerCase() !== key) return false;

  const useMeta = prefersMetaKey(platform);
  const wantCtrl =
    modifiers.includes("ctrl") || (modifiers.includes("mod") && !useMeta);
  const wantMeta =
    modifiers.includes("meta") || (modifiers.includes("mod") && useMeta);
  const wantAlt = modifiers.includes("alt");
  const wantShift = modifiers.includes("shift");

  return (
    event.ctrlKey === wantCtrl &&
    event.metaKey === wantMeta &&
    event.altKey === wantAlt &&
    event.shiftKey === wantShift
  );
}

/** Renders a shortcut for display next to a command palette entry. */
export function formatShortcut(
  keys: readonly string[],
  platform = "",
): string {
  const useMeta = prefersMetaKey(platform);
  return keys
    .map((raw) => {
      const token = raw.trim().toLowerCase();
      if (token === "mod") return useMeta ? "⌘" : "Ctrl";
      if (token === "meta") return "⌘";
      if (token === "ctrl") return "Ctrl";
      if (token === "alt") return useMeta ? "⌥" : "Alt";
      if (token === "shift") return "⇧";
      return token.length === 1 ? token.toUpperCase() : token;
    })
    .join(useMeta ? "" : "+");
}
