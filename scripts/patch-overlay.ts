/**
 * Rewrite the absolute `graphify` executable path inside
 * `overlays/graphify/.claude/settings.json` to this machine's `which graphify`.
 *
 * `graphify install --project` bakes an absolute path into its PreToolUse hook
 * command, so an overlay captured on one machine silently no-ops on another —
 * the hook fails to spawn and condition B quietly degrades into condition A.
 * Run this after refreshing the overlay, and on any new host before measuring.
 *
 * Usage: pnpm exec tsx scripts/patch-overlay.ts [--check] [--exe <path>]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../bench/lib/env.js";

const SETTINGS = path.join(REPO_ROOT, "overlays", "graphify", ".claude", "settings.json");

function whichGraphify(): string | null {
  try {
    const out = execFileSync("which", ["graphify"], { encoding: "utf8" }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Replace any absolute path whose basename is `graphify` with `exe`.
 * Returns the rewritten text and how many paths changed.
 */
export function rewriteGraphifyPaths(text: string, exe: string): { text: string; replaced: number } {
  let replaced = 0;
  const out = text.replace(/(["\s])(\/[^"'\s:]*\/graphify)(?=["\s]|$)/g, (whole, lead: string, found: string) => {
    if (found === exe) return whole;
    replaced += 1;
    return `${lead}${exe}`;
  });
  return { text: out, replaced };
}

function main(): void {
  const check = process.argv.includes("--check");
  const exeFlagIndex = process.argv.indexOf("--exe");
  const exe = exeFlagIndex >= 0 ? process.argv[exeFlagIndex + 1] : whichGraphify();

  if (!fs.existsSync(SETTINGS)) {
    // Expected before the Phase 2 worker lands the overlay. Not an error.
    console.log(`[patch-overlay] ${path.relative(REPO_ROOT, SETTINGS)} does not exist yet — nothing to patch.`);
    return;
  }
  if (!exe) {
    console.error("[patch-overlay] `graphify` is not on PATH and no --exe was given.");
    process.exitCode = 1;
    return;
  }

  const before = fs.readFileSync(SETTINGS, "utf8");
  const { text, replaced } = rewriteGraphifyPaths(before, exe);
  if (replaced === 0) {
    console.log(`[patch-overlay] already points at ${exe} (or contains no absolute graphify path).`);
    return;
  }
  if (check) {
    console.error(`[patch-overlay] ${replaced} path(s) do not match ${exe}. Re-run without --check to fix.`);
    process.exitCode = 1;
    return;
  }
  JSON.parse(text); // fail loudly rather than write a broken settings.json
  fs.writeFileSync(SETTINGS, text);
  console.log(`[patch-overlay] rewrote ${replaced} path(s) to ${exe}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
