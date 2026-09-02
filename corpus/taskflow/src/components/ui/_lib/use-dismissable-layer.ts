"use client";

/**
 * Shared overlay plumbing for the floating primitives (dialog, drawer, popover,
 * dropdown menu, combobox, command palette, date picker).
 *
 * Private to `src/components/ui/**`. Every overlay in the design system closes
 * on Escape and on a pointer-down outside its box; centralising that here is
 * what keeps the behaviour identical across seven components.
 */

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export type DismissableLayerOptions = {
  open: boolean;
  onDismiss: () => void;
  /** Skip the outside-pointer listener (menus that own their own trigger). */
  closeOnOutside?: boolean;
};

/**
 * Wire Escape + outside-pointer dismissal to a container element.
 * Returns the ref to spread onto that element.
 */
export function useDismissableLayer<T extends HTMLElement>(
  options: DismissableLayerOptions,
): RefObject<T | null> {
  const { open, onDismiss, closeOnOutside = true } = options;
  const ref = useRef<T | null>(null);
  const dismissRef = useRef(onDismiss);

  // Keep the latest callback without re-subscribing the listeners on every
  // render — callers commonly pass an inline arrow.
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        dismissRef.current();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const node = ref.current;
      if (!node) return;
      if (event.target instanceof Node && !node.contains(event.target)) {
        dismissRef.current();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    if (closeOnOutside) document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closeOnOutside]);

  return ref;
}

/**
 * Trap Tab/Shift+Tab inside `ref` while `active`, move focus to the first
 * focusable child on open, and restore it to the previously focused element on
 * close. Used by Dialog and Drawer, the two layers that block the page.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusables = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [ref, active]);
}

/** Freeze background scrolling while a blocking layer is open. */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
