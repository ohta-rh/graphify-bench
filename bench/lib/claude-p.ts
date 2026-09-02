import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Shape of `claude -p --output-format json`, verified against Claude Code
 * 2.1.258 (docs/plan/appendix-claude-p-json-sample.md). Every field is optional:
 * collect.ts must tolerate a schema change without losing the run.
 */
export interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens_details?: { thinking_tokens?: number };
  iterations?: unknown[];
  [k: string]: unknown;
}

export interface ClaudeModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  cacheCreationInputTokens?: number;
  costUSD?: number;
  [k: string]: unknown;
}

export interface ClaudeResult {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  terminal_reason?: string;
  duration_ms?: number;
  duration_api_ms?: number;
  num_turns?: number;
  result?: string;
  session_id?: string;
  total_cost_usd?: number;
  usage?: ClaudeUsage;
  modelUsage?: Record<string, ClaudeModelUsage>;
  permission_denials?: unknown[];
  subagent_stats?: { spawned?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export interface ClaudePOptions {
  prompt: string;
  cwd: string;
  sessionId: string;
  model: string;
  effort?: string;
  maxTurns?: number;
  maxBudgetUsd?: number;
  /** Extra CLI args, e.g. for a one-off judge call. */
  extraArgs?: string[];
  /** Hard wall-clock cap. Default 30 min. */
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export interface ClaudePInvocation {
  argv: string[];
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  /** Parsed stdout, or null when stdout was not valid JSON. */
  result: ClaudeResult | null;
  parseError: string | null;
  wallMs: number;
}

export function buildArgs(o: ClaudePOptions): string[] {
  const args = ["-p", o.prompt, "--output-format", "json", "--model", o.model];
  if (o.effort) args.push("--effort", o.effort);
  args.push("--setting-sources", "project", "--permission-mode", "bypassPermissions");
  if (o.maxTurns !== undefined) args.push("--max-turns", String(o.maxTurns));
  if (o.maxBudgetUsd !== undefined) args.push("--max-budget-usd", String(o.maxBudgetUsd));
  args.push("--session-id", o.sessionId);
  if (o.extraArgs?.length) args.push(...o.extraArgs);
  return args;
}

export async function runClaudeP(o: ClaudePOptions): Promise<ClaudePInvocation> {
  const argv = buildArgs(o);
  const started = Date.now();
  return await new Promise<ClaudePInvocation>((resolve) => {
    const child = spawn("claude", argv, {
      cwd: o.cwd,
      env: { ...process.env, ...o.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(
      () => {
        timedOut = true;
        child.kill("SIGKILL");
      },
      o.timeoutMs ?? 30 * 60_000,
    );
    child.stdout.on("data", (c: Buffer) => (stdout += c.toString("utf8")));
    child.stderr.on("data", (c: Buffer) => (stderr += c.toString("utf8")));
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      clearTimeout(timer);
      let result: ClaudeResult | null = null;
      let parseError: string | null = null;
      try {
        result = JSON.parse(stdout) as ClaudeResult;
      } catch (err) {
        // Some builds prefix diagnostics; fall back to the last JSON object.
        const start = stdout.indexOf("{");
        const end = stdout.lastIndexOf("}");
        if (start >= 0 && end > start) {
          try {
            result = JSON.parse(stdout.slice(start, end + 1)) as ClaudeResult;
          } catch {
            parseError = String(err);
          }
        } else {
          parseError = String(err);
        }
      }
      resolve({
        argv,
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
        result,
        parseError,
        wallMs: Date.now() - started,
      });
    };
    child.on("error", (err) => {
      stderr += `\nspawn error: ${String(err)}`;
      finish(null, null);
    });
    child.on("close", finish);
  });
}

// ---------------------------------------------------------------------------
// JSONL transcript lookup
// ---------------------------------------------------------------------------

export const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

/**
 * Encode a cwd the way Claude Code names its transcript directory.
 *
 * Rule determined empirically on 2026-09-02 (Claude Code 2.1.258) by comparing
 * ~/.claude/projects entries against the real paths that produced them:
 *
 *   /Users/tetsuyaohta/projects/other/graphify-bench
 *     -> -Users-tetsuyaohta-projects-other-graphify-bench
 *   /private/var/folders/82/dclbn8z5181_3ppf…/T/graphify-bench-scratch/EX1-seat-cap__baseline__r1__203f7b64
 *     -> -private-var-folders-82-dclbn8z5181-3ppf…-T-graphify-bench-scratch-EX1-seat-cap--baseline--r1--203f7b64
 *
 * **`/`, `.` and `_` each become `-`** — equivalently, every character outside
 * `[A-Za-z0-9-]` is replaced. The leading `/` yields a leading `-`, and runs of
 * these characters (`__`, or a segment that already starts with `-`) yield runs
 * of `-`. The `_` case is the one that matters here and was NOT visible in the
 * project list alone; it showed up only once a run used a macOS temp dir.
 *
 * `findTranscript` still scans every project directory as a backstop, because
 * this rule is an observation about a CLI version, not a documented contract.
 */
export function encodeCwd(cwd: string): string {
  return path.resolve(cwd).replace(/[^A-Za-z0-9-]/g, "-");
}

export function encodeCwdCandidates(cwd: string): string[] {
  const resolved = path.resolve(cwd);
  const out = new Set<string>([encodeCwd(resolved)]);
  // macOS reports /tmp and /var as symlinks into /private; Claude Code records
  // the resolved form, so try both.
  const real = fs.existsSync(resolved) ? fs.realpathSync(resolved) : resolved;
  if (real !== resolved) out.add(encodeCwd(real));
  return [...out];
}

export interface TranscriptLocation {
  /** Absolute path to the transcript found in ~/.claude/projects. */
  source: string;
  /** Directory name under ~/.claude/projects that held it. */
  projectDir: string;
  /** How it was found — "encoded" means the rule above predicted the directory. */
  via: "encoded" | "scan";
}

/** Find `<sessionId>.jsonl` for a run whose cwd was `cwd`. */
export function findTranscript(cwd: string, sessionId: string): TranscriptLocation | null {
  const file = `${sessionId}.jsonl`;
  for (const dir of encodeCwdCandidates(cwd)) {
    const candidate = path.join(PROJECTS_DIR, dir, file);
    if (fs.existsSync(candidate)) return { source: candidate, projectDir: dir, via: "encoded" };
  }
  // Backstop: the session id is a uuid, so a scan cannot collide.
  if (!fs.existsSync(PROJECTS_DIR)) return null;
  for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(PROJECTS_DIR, entry.name, file);
    if (fs.existsSync(candidate)) return { source: candidate, projectDir: entry.name, via: "scan" };
  }
  return null;
}

export interface TranscriptCapture extends Partial<TranscriptLocation> {
  captured: boolean;
  dest?: string;
  bytes?: number;
  removedOriginal?: boolean;
  error?: string;
}

/** Copy the transcript into the run directory and delete the original. */
export function captureTranscript(cwd: string, sessionId: string, dest: string): TranscriptCapture {
  const found = findTranscript(cwd, sessionId);
  if (!found) return { captured: false, error: `no transcript for session ${sessionId}` };
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(found.source, dest);
    const bytes = fs.statSync(dest).size;
    let removedOriginal = false;
    try {
      fs.rmSync(found.source, { force: true });
      removedOriginal = true;
      // Claude Code also drops a `memory/` directory beside the transcript, so
      // the project dir is rarely empty. Remove the whole directory, but ONLY
      // when its name is the one this run's throwaway cwd would have produced —
      // never a directory belonging to a real project of the user's.
      const dir = path.dirname(found.source);
      const ours = new Set(encodeCwdCandidates(cwd));
      if (ours.has(path.basename(dir)) && path.dirname(dir) === PROJECTS_DIR && fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      } else if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
        fs.rmdirSync(dir);
      }
    } catch {
      /* leaving the original behind is not fatal */
    }
    return { captured: true, dest, bytes, removedOriginal, ...found };
  } catch (err) {
    return { captured: false, error: String(err), ...found };
  }
}
