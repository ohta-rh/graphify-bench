"use client";

/**
 * Debounces search and filter inputs.
 */
import { useEffect, useState } from "react";

export const DEFAULT_DEBOUNCE_MS = 250;

export function useDebouncedValue(
  value: string,
  delayMs: number = DEFAULT_DEBOUNCE_MS,
): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), Math.max(0, delayMs));
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
