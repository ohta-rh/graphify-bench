/**
 * Rewrite the absolute `graphify` executable path inside every overlay's
 * `.claude/settings.json` to this machine's `which graphify`.
 *
 * `graphify install --project` bakes an absolute path into its PreToolUse hook
 * command, so an overlay captured on one machine silently no-ops on another —
 * the hook fails to spawn and condition B quietly degrades into condition A.
 * Run this after refreshing an overlay, and on any new host before measuring.
 *
 * Every overlay that ships a settings file is maintained, including the delta
 * overlays: `graphify-strict-v2` ships only its settings file, so it is exactly
 * the kind of overlay whose hook paths would otherwise be forgotten.
 *
 * Usage: pnpm exec tsx scripts/patch-overlay.ts [--check] [--exe <path>]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../bench/lib/env.js";

const OVERLAYS_DIR = path.join(REPO_ROOT, "overlays");

/**
 * Every overlay's `.claude/settings.json` that exists, sorted.
 *
 * Discovered rather than listed, so a new overlay — `graphify-v2`, or the next
 * delta on top of it — is maintained the day it lands. The delta overlays are
 * exactly the ones a hand-maintained list would forget: `graphify-strict-v2`
 * ships *only* its settings file, and a stale path there would leave the strict
 * arm pointing at another machine's binary, silently degrading it into the
 * plain graphify arm.
 */
export function overlaySettingsFiles(overlaysDir: string): string[] {
  if (!fs.existsSync(overlaysDir)) return [];
  return fs
    .readdirSync(overlaysDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(overlaysDir, entry.name, ".claude", "settings.json"))
    .filter((file) => fs.existsSync(file))
    .sort();
}

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

/**
 * The `mempalace-mcp` executable is host-specific in the same way graphify's
 * hook command is, and fails the same way: a stale path means the MCP server
 * never spawns, and `claude -p` carries on without it — the `mempalace` arm
 * silently degrades into an expensive `baseline` re-run. Unlike graphify it is
 * a Python entry point inside a virtualenv rather than a binary on PATH, so it
 * is recorded as a literal in `bench/conditions.ts` and rewritten here.
 */
const CONDITIONS_FILE = path.join(REPO_ROOT, "bench", "conditions.ts");

function whichMempalaceMcp(): string | null {
  const flagIndex = process.argv.indexOf("--mempalace-exe");
  if (flagIndex >= 0 && process.argv[flagIndex + 1]) return process.argv[flagIndex + 1]!;
  const fromEnv = process.env.MEMPALACE_MCP_EXE?.trim();
  if (fromEnv) return fromEnv;
  try {
    const out = execFileSync("which", ["mempalace-mcp"], { encoding: "utf8" }).trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Replace the absolute path ending in `/mempalace-mcp` inside a TS string literal. */
export function rewriteMempalacePath(text: string, exe: string): { text: string; replaced: number } {
  let replaced = 0;
  const out = text.replace(/"(\/[^"'\s:]*\/mempalace-mcp)"/g, (whole, found: string) => {
    if (found === exe) return whole;
    replaced += 1;
    return `"${exe}"`;
  });
  return { text: out, replaced };
}

/**
 * Maintain the mempalace path, and stay quiet on hosts that have no mempalace.
 *
 * Deliberately NOT a `--check` failure when the executable cannot be resolved:
 * mempalace is an optional dependency of one arm family, and most checkouts
 * (and CI) will never install it, so failing there would make the check useless
 * as a gate for everything else. The real gate is at the point of use —
 * `provisionMcp` in `bench/run.ts` refuses to start a run whose server
 * executable is missing, which is where a wrong path can actually corrupt a
 * measurement.
 */
function patchMempalace(check: boolean): number {
  if (!fs.existsSync(CONDITIONS_FILE)) return 0;
  const exe = whichMempalaceMcp();
  const rel = path.relative(REPO_ROOT, CONDITIONS_FILE);
  if (!exe) {
    console.log(`[patch-overlay] ${rel}: no mempalace-mcp on this host — leaving the recorded path alone.`);
    return 0;
  }
  const before = fs.readFileSync(CONDITIONS_FILE, "utf8");
  const { text, replaced } = rewriteMempalacePath(before, exe);
  if (replaced === 0) {
    console.log(`[patch-overlay] ${rel}: mempalace-mcp already points at ${exe}.`);
    return 0;
  }
  if (check) {
    console.error(`[patch-overlay] ${rel}: mempalace-mcp path does not match ${exe}.`);
    return replaced;
  }
  fs.writeFileSync(CONDITIONS_FILE, text);
  console.log(`[patch-overlay] ${rel}: rewrote ${replaced} mempalace-mcp path(s) to ${exe}`);
  return 0;
}

function main(): void {
  const check = process.argv.includes("--check");
  const exeFlagIndex = process.argv.indexOf("--exe");
  const exe = exeFlagIndex >= 0 ? process.argv[exeFlagIndex + 1] : whichGraphify();

  let stale = patchMempalace(check);

  const settingsFiles = overlaySettingsFiles(OVERLAYS_DIR);
  if (settingsFiles.length === 0) {
    // Expected before the Phase 2 worker lands the overlay. Not an error.
    console.log("[patch-overlay] no overlay ships a .claude/settings.json yet — nothing more to patch.");
    if (check && stale > 0) process.exitCode = 1;
    return;
  }
  if (!exe) {
    console.error("[patch-overlay] `graphify` is not on PATH and no --exe was given.");
    process.exitCode = 1;
    return;
  }

  for (const settings of settingsFiles) {
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
    console.error(
      `[patch-overlay] ${stale} executable path(s) stale across ${settingsFiles.length} overlay settings file(s) ` +
        "and the condition registry. Re-run without --check to fix.",
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
