"use client";

/**
 * Global keydown binding with modifier matching.
 */
import { useEffect, useRef } from "react";
import { matchesShortcut } from "./shortcut-match";

/** Typing in one of these should never trigger a global shortcut. */
const EDITABLE_TAGS: readonly string[] = ["INPUT", "TEXTAREA", "SELECT"];

function isTypingTarget(target: EventTarget | null): boolean {
  if (target === null || !(target instanceof HTMLElement)) return false;
  return EDITABLE_TAGS.includes(target.tagName) || target.isContentEditable;
}

export function useKeyboardShortcut(
  keys: readonly string[],
  handler: () => void,
  enabled = true,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  const signature = keys.join("+");

  useEffect(() => {
    if (!enabled || signature.length === 0) return;
    const tokens = signature.split("+");

    function onKeyDown(event: KeyboardEvent): void {
      const platform =
        typeof navigator === "undefined" ? "" : navigator.platform;
      if (!matchesShortcut(tokens, event, platform)) return;
      // A bare letter shortcut must not fire while the user is writing.
      if (
        isTypingTarget(event.target) &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        return;
      }
      event.preventDefault();
      handlerRef.current();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [signature, enabled]);
}
