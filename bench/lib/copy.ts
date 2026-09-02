import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type CopyStrategy = "clonefile" | "reflink" | "rsync" | "node";

export interface CopyResult {
  strategy: CopyStrategy;
  durationMs: number;
}

function tryCommand(cmd: string, args: string[]): { ok: boolean; stderr: string } {
  const res = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.error) return { ok: false, stderr: String(res.error.message) };
  return { ok: res.status === 0, stderr: res.stderr ?? "" };
}

/**
 * Clone `src` to `dest` including node_modules and dotfiles.
 *
 * `dest` must not exist. Strategies are tried in order:
 *   1. `cp -c -R`            macOS/APFS copy-on-write clone (fast, cheap)
 *   2. `cp -R --reflink=auto` GNU coreutils on btrfs/xfs
 *   3. `rsync -a`            portable
 *   4. `fs.cpSync`           last-resort in-process copy
 */
export function cloneDir(src: string, dest: string): CopyResult {
  const started = Date.now();
  if (!fs.existsSync(src)) throw new Error(`source directory does not exist: ${src}`);
  if (fs.existsSync(dest)) throw new Error(`destination already exists: ${dest}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const attempts: Array<[CopyStrategy, string, string[]]> = [
    // Trailing "/." copies the contents of src into dest, dotfiles included.
    ["clonefile", "cp", ["-c", "-R", `${src}/.`, dest]],
    ["reflink", "cp", ["-R", "--reflink=auto", `${src}/.`, dest]],
    ["rsync", "rsync", ["-a", `${src}/`, `${dest}/`]],
  ];

  const failures: string[] = [];
  for (const [strategy, cmd, args] of attempts) {
    fs.mkdirSync(dest, { recursive: true });
    const { ok, stderr } = tryCommand(cmd, args);
    if (ok) return { strategy, durationMs: Date.now() - started };
    failures.push(`${strategy}: ${stderr.trim().slice(0, 200)}`);
    fs.rmSync(dest, { recursive: true, force: true });
  }

  try {
    fs.cpSync(src, dest, { recursive: true, dereference: false, force: true });
    return { strategy: "node", durationMs: Date.now() - started };
  } catch (err) {
    throw new Error(
      `every copy strategy failed for ${src} -> ${dest}\n${failures.join("\n")}\nnode: ${String(err)}`,
    );
  }
}

/**
 * Name of the one-line marker file that makes an overlay a *delta* over another.
 *
 * A delta overlay ships only the files that differ from its base, so a variant
 * that changes a single settings key does not have to duplicate a multi-megabyte
 * `graph.json`. `resolveOverlayChain` expands the marker into the application
 * order; the marker itself never reaches the agent.
 */
export const OVERLAY_BASE_FILE = ".overlay-base";

/**
 * Expand a condition into the overlay directories to apply, base-first.
 *
 * `overlays/<condition>/.overlay-base` names the condition this one layers over
 * (a bare directory name under the same `overlays/` root, not a path). Chains
 * may nest; a cycle or a missing base is a hard error, because the silent
 * failure mode — a strict variant quietly measured with its base's settings —
 * is exactly what the delta mechanism exists to prevent.
 */
export function resolveOverlayChain(overlaysDir: string, condition: string): string[] {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current = condition;
  for (;;) {
    if (seen.has(current)) {
      throw new Error(`overlay base cycle: ${[...seen, current].join(" -> ")}`);
    }
    seen.add(current);
    const dir = path.join(overlaysDir, current);
    if (!fs.existsSync(dir)) {
      throw new Error(`overlay not found for condition "${current}": ${dir}`);
    }
    chain.unshift(dir);
    const marker = path.join(dir, OVERLAY_BASE_FILE);
    if (!fs.existsSync(marker)) return chain;
    const base = fs.readFileSync(marker, "utf8").trim();
    if (base === "" || base.includes("/") || base.includes("\\")) {
      throw new Error(`${marker} must name a sibling overlay directory, got ${JSON.stringify(base)}`);
    }
    current = base;
  }
}

/** Recursively overlay `src` onto `dest`, overwriting files that collide. */
export function applyOverlay(src: string, dest: string): string[] {
  if (!fs.existsSync(src)) return [];
  const written: string[] = [];
  const walk = (rel: string): void => {
    const from = path.join(src, rel);
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
      if (rel === "." && entry.name === OVERLAY_BASE_FILE) continue;
      const childRel = path.join(rel, entry.name);
      const to = path.join(dest, childRel);
      if (entry.isDirectory()) {
        fs.mkdirSync(to, { recursive: true });
        walk(childRel);
      } else if (entry.isSymbolicLink()) {
        fs.rmSync(to, { force: true });
        fs.symlinkSync(fs.readlinkSync(path.join(from, entry.name)), to);
        written.push(childRel);
      } else {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(path.join(from, entry.name), to);
        written.push(childRel);
      }
    }
  };
  walk(".");
  // README.md files in an overlay document the overlay itself; they are notes to
  // the maintainer, not corpus content, so they never reach the agent.
  const dropped = written.filter((f) => path.dirname(f) === "." && path.basename(f) === "README.md");
  for (const f of dropped) fs.rmSync(path.join(dest, f), { force: true });
  return written.filter((f) => !dropped.includes(f)).map((f) => f.replace(/^\.\//, ""));
}
