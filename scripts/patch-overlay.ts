/**
 * Rewrite the absolute `graphify` executable path inside every graphify-family
 * overlay's `.claude/settings.json` to this machine's `which graphify`.
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

/**
 * Every overlay that carries a graphify hook command. `graphify-strict` is a
 * delta overlay layered on `graphify`, so its settings file must be patched too —
 * missing it would leave the strict arm pointing at another machine's binary and
 * silently degrade it into the plain graphify arm.
 */
export const SETTINGS_FILES = ["graphify", "graphify-strict"].map((overlay) =>
  path.join(REPO_ROOT, "overlays", overlay, ".claude", "settings.json"),
);

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

  const present = SETTINGS_FILES.filter((f) => fs.existsSync(f));
  if (present.length === 0) {
    // Expected before the Phase 2 worker lands the overlay. Not an error.
    console.log(`[patch-overlay] no overlay settings.json exists yet — nothing to patch.`);
    return;
  }
  if (!exe) {
    console.error("[patch-overlay] `graphify` is not on PATH and no --exe was given.");
    process.exitCode = 1;
    return;
  }

  let stale = 0;
  for (const settings of present) {
    const rel = path.relative(REPO_ROOT, settings);
    const before = fs.readFileSync(settings, "utf8");
    const { text, replaced } = rewriteGraphifyPaths(before, exe);
    if (replaced === 0) {
      console.log(`[patch-overlay] ${rel}: already points at ${exe} (or contains no absolute graphify path).`);
      continue;
    }
    stale += replaced;
    if (check) {
      console.error(`[patch-overlay] ${rel}: ${replaced} path(s) do not match ${exe}.`);
      continue;
    }
    JSON.parse(text); // fail loudly rather than write a broken settings.json
    fs.writeFileSync(settings, text);
    console.log(`[patch-overlay] ${rel}: rewrote ${replaced} path(s) to ${exe}`);
  }
  if (check && stale > 0) {
    console.error(`[patch-overlay] ${stale} stale path(s) total. Re-run without --check to fix.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
