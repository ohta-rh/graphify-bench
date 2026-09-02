"use client";

/**
 * Builds the Ctrl+K command groups from the actor's permissions and flags.
 *
 * Must call (do not reimplement): can, isEnabled
 */
import { useCallback, useMemo, useState } from "react";
import { isEnabled } from "@/lib/feature-flags";
import type { CommandGroup } from "@/components/ui/command-palette";
import { buildCommandGroups } from "./command-groups";
import { orgFlagContext } from "./flag-context";
import { useKeyboardShortcut } from "./use-keyboard-shortcut";
import { useOrg } from "./use-org";

export const COMMAND_PALETTE_SHORTCUT: readonly string[] = ["mod", "k"];

export function useCommandPalette(): {
  open: boolean;
  setOpen: (open: boolean) => void;
  groups: readonly CommandGroup[];
} {
  const { org, actor, flags } = useOrg();
  const [open, setOpen] = useState(false);

  // The palette itself is a flag; when it is off the shortcut must not bind.
  const paletteEnabled =
    flags.command_palette === true ||
    isEnabled("command_palette", orgFlagContext(org, actor));

  const toggle = useCallback(() => setOpen((current) => !current), []);
  useKeyboardShortcut(COMMAND_PALETTE_SHORTCUT, toggle, paletteEnabled);

  const groups = useMemo(
    () => (paletteEnabled ? buildCommandGroups(org, actor, flags) : []),
    [paletteEnabled, org, actor, flags],
  );

  return { open: open && paletteEnabled, setOpen, groups };
}
