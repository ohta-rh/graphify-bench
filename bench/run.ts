import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { captureTranscript, runClaudeP, type ClaudePInvocation } from "./lib/claude-p.js";
import { effectiveModel, overlayDirs, resolveCondition, type ConditionSpec } from "./conditions.js";
import { applyOverlay, cloneDir } from "./lib/copy.js";
import { REPO_ROOT, readEnv, runDir, runId, type BenchEnv } from "./lib/env.js";
import type { Task } from "../tasks/tasks.schema.js";

export interface RunRequest {
  task: Task;
  condition: string;
  rep: number;
  /** Absolute path to the corpus to clone. */
  corpusDir: string;
  /** Absolute path to overlays/. */
  overlaysDir: string;
  /** Absolute path to tasks/ (patches and keys resolve against it). */
  tasksDir: string;
  env?: Partial<BenchEnv>;
}

export interface VitestOutcome {
  ran: boolean;
  passed: boolean | null;
  exitCode: number | null;
  spec: string | null;
  outputTail: string | null;
  error?: string;
}

export interface RunMeta {
  run_id: string;
  task_id: string;
  category: string;
  condition: string;
  rep: number;
  grader: string;
  session_id: string;
  started_at: string;
  finished_at: string;
  corpus_dir: string;
  /**
   * The resolved arm definition: which overlays were layered, the model that
   * actually ran, and any extra `claude` arguments. Recorded so a run directory
   * is self-describing — `condition` alone does not say what was varied.
   */
  condition_spec: ConditionSpec & { effective_model: string };
  /** First (primary) overlay directory. Kept for backward compatibility. */
  overlay_dir: string;
  /** Every overlay directory, in application order (later files win). */
  overlay_dirs: string[];
  overlay_files: string[];
  copy_strategy: string | null;
  copy_ms: number | null;
  patch: { applied: boolean; file: string | null; method: string | null; error?: string } | null;
  claude: {
    argv: string[] | null;
    exit_code: number | null;
    signal: string | null;
    timed_out: boolean;
    wall_ms: number | null;
    parse_error: string | null;
    stderr_tail: string | null;
  };
  transcript: Record<string, unknown> | null;
  vitest: VitestOutcome | null;
  env: BenchEnv;
  versions: Record<string, string | null>;
  timings_ms: { total: number; copy: number; claude: number; vitest: number };
  error: string | null;
}

function cmdVersion(cmd: string, args: string[]): string | null {
  try {
    return execFileSync(cmd, args, { encoding: "utf8", timeout: 20_000 }).trim().split("\n")[0] ?? null;
  } catch {
    return null;
  }
}

let versionCache: Record<string, string | null> | null = null;
function toolVersions(): Record<string, string | null> {
  if (versionCache) return versionCache;
  versionCache = {
    claude: cmdVersion("claude", ["--version"]),
    graphify: cmdVersion("graphify", ["--version"]),
    node: process.version,
    pnpm: cmdVersion("pnpm", ["--version"]),
    platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  };
  return versionCache;
}

/**
 * Apply a bug patch to the run directory. The run dir is not a git repo, so
 * `git apply` needs `--unsafe-paths` plus an explicit `--directory`; if git is
 * unavailable or rejects the patch, fall back to POSIX `patch -p1`.
 */
function applyPatch(patchFile: string, dir: string): { applied: boolean; method: string | null; error?: string } {
  if (!fs.existsSync(patchFile)) return { applied: false, method: null, error: `patch not found: ${patchFile}` };
  const git = spawnSync(
    "git",
    ["apply", "--unsafe-paths", "--directory", ".", "-p1", "--verbose", patchFile],
    { cwd: dir, encoding: "utf8" },
  );
  if (git.status === 0) return { applied: true, method: "git apply" };
  const posix = spawnSync("patch", ["-p1", "-i", patchFile, "--batch", "--forward"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (posix.status === 0) return { applied: true, method: "patch -p1" };
  return {
    applied: false,
    method: null,
    error: `git apply: ${(git.stderr ?? "").trim().slice(0, 400)} | patch: ${(posix.stderr || posix.stdout || "").trim().slice(0, 400)}`,
  };
}

function runVitest(spec: string, dir: string): VitestOutcome {
  const res = spawnSync("pnpm", ["exec", "vitest", "run", spec], {
    cwd: dir,
    encoding: "utf8",
    timeout: 10 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (res.error) {
    return { ran: false, passed: null, exitCode: null, spec, outputTail: null, error: String(res.error) };
  }
  const output = `${res.stdout ?? ""}\n${res.stderr ?? ""}`;
  return {
    ran: true,
    passed: res.status === 0,
    exitCode: res.status,
    spec,
    outputTail: output.trim().split("\n").slice(-40).join("\n"),
  };
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Execute one (task, condition, rep). Never throws for a run-level failure:
 * whatever was produced is written to disk with `error` set, so a partial run
 * is still analysable and `matrix.ts` can move on.
 */
export async function executeRun(req: RunRequest): Promise<RunMeta> {
  const base: BenchEnv = { ...readEnv(), ...req.env };
  const spec = resolveCondition(req.condition);
  const dirs = overlayDirs(spec, req.overlaysDir);
  // The arm's model override wins over BENCH_MODEL, and `env.model` is what the
  // report reads, so it must carry the model that actually ran — not the default.
  const env: BenchEnv = { ...base, model: effectiveModel(spec, base.model) };
  const id = runId(req.task.id, req.condition, req.rep);
  const outDir = runDir(id);
  const sessionId = crypto.randomUUID();
  // The agent sees its own cwd on every tool call, so the run directory name
  // must not contain the condition, the task, or the string "graphify" — that
  // would prime the model differently in each arm. The session uuid alone is
  // opaque; run.meta.json holds the mapping back to the run id.
  const workDir = path.join(env.scratch, sessionId);
  const startedAt = new Date();
  const t0 = Date.now();

  const meta: RunMeta = {
    run_id: id,
    task_id: req.task.id,
    category: req.task.category,
    condition: req.condition,
    rep: req.rep,
    grader: req.task.grader,
    session_id: sessionId,
    started_at: startedAt.toISOString(),
    finished_at: startedAt.toISOString(),
    corpus_dir: req.corpusDir,
    condition_spec: { ...spec, effective_model: env.model },
    overlay_dir: dirs[0] ?? path.join(req.overlaysDir, req.condition),
    overlay_dirs: dirs,
    overlay_files: [],
    copy_strategy: null,
    copy_ms: null,
    patch: null,
    claude: {
      argv: null,
      exit_code: null,
      signal: null,
      timed_out: false,
      wall_ms: null,
      parse_error: null,
      stderr_tail: null,
    },
    transcript: null,
    vitest: null,
    env,
    versions: toolVersions(),
    timings_ms: { total: 0, copy: 0, claude: 0, vitest: 0 },
    error: null,
  };

  fs.mkdirSync(outDir, { recursive: true });
  let invocation: ClaudePInvocation | null = null;

  try {
    // 1. fresh copy of the corpus
    fs.rmSync(workDir, { recursive: true, force: true });
    const copied = cloneDir(req.corpusDir, workDir);
    meta.copy_strategy = copied.strategy;
    meta.copy_ms = copied.durationMs;
    meta.timings_ms.copy = copied.durationMs;

    // 2. overlay(s) for this condition, layered left to right
    const written: string[] = [];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) throw new Error(`overlay not found for condition "${req.condition}": ${dir}`);
      written.push(...applyOverlay(dir, workDir));
    }
    meta.overlay_files = [...new Set(written)];

    // 3. optional bug patch — after the overlay, identically in both conditions
    if (req.task.patch) {
      const patchFile = path.resolve(req.tasksDir, req.task.patch);
      const outcome = applyPatch(patchFile, workDir);
      meta.patch = { ...outcome, file: patchFile };
      if (!outcome.applied) meta.error = `patch failed: ${outcome.error ?? "unknown"}`;
    }

    // 4. the measured call
    const tClaude = Date.now();
    invocation = await runClaudeP({
      prompt: req.task.prompt,
      cwd: workDir,
      sessionId,
      model: env.model,
      effort: env.effort,
      maxTurns: env.maxTurns,
      maxBudgetUsd: env.maxBudgetUsd,
      extraArgs: spec.extraClaudeArgs,
      env: { ...(env.hookStrict ? { GRAPHIFY_HOOK_STRICT: "1" } : {}), ...(spec.env ?? {}) },
    });
    meta.timings_ms.claude = Date.now() - tClaude;
    meta.claude = {
      argv: invocation.argv,
      exit_code: invocation.exitCode,
      signal: invocation.signal,
      timed_out: invocation.timedOut,
      wall_ms: invocation.wallMs,
      parse_error: invocation.parseError,
      stderr_tail: invocation.stderr.trim().split("\n").slice(-20).join("\n") || null,
    };

    // 5. persist result + transcript
    if (invocation.result) {
      writeJson(path.join(outDir, "result.json"), invocation.result);
    } else {
      fs.writeFileSync(path.join(outDir, "result.stdout.txt"), invocation.stdout);
      meta.error = meta.error ?? `claude -p produced no parseable JSON (${invocation.parseError ?? "empty"})`;
    }
    meta.transcript = captureTranscript(workDir, sessionId, path.join(outDir, "transcript.jsonl")) as unknown as Record<
      string,
      unknown
    >;

    // 6. grader === "vitest": run the spec inside the run dir before deleting it
    if (req.task.grader === "vitest" && req.task.spec) {
      const tTest = Date.now();
      meta.vitest = runVitest(req.task.spec, workDir);
      meta.timings_ms.vitest = Date.now() - tTest;
    }
  } catch (err) {
    meta.error = meta.error ?? String(err instanceof Error ? err.stack ?? err.message : err);
  } finally {
    // 7. tear down the run dir; a partial result is never discarded
    if (process.env.BENCH_KEEP_WORKDIR !== "1") {
      try {
        fs.rmSync(workDir, { recursive: true, force: true });
      } catch (err) {
        meta.error = meta.error ?? `cleanup failed: ${String(err)}`;
      }
    }
    meta.finished_at = new Date().toISOString();
    meta.timings_ms.total = Date.now() - t0;
    writeJson(path.join(outDir, "run.meta.json"), meta);
  }
  return meta;
}

// --- CLI: run a single (task, condition, rep) --------------------------------

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

async function main(): Promise<void> {
  const { parseTaskFile } = await import("../tasks/tasks.schema.js");
  const tasksFile = path.resolve(REPO_ROOT, arg("tasks", "tasks/tasks.json")!);
  const taskId = arg("task");
  if (!taskId) throw new Error("usage: tsx bench/run.ts --task <id> --condition <name> [--rep 1] [--tasks <file>] [--corpus <dir>]");
  const parsed = parseTaskFile(JSON.parse(fs.readFileSync(tasksFile, "utf8")));
  const task = parsed.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`no task ${taskId} in ${tasksFile}`);

  const meta = await executeRun({
    task,
    condition: arg("condition", "baseline")!,
    rep: Number(arg("rep", "1")),
    corpusDir: path.resolve(REPO_ROOT, arg("corpus", "corpus/taskflow")!),
    overlaysDir: path.resolve(REPO_ROOT, arg("overlays", "overlays")!),
    tasksDir: path.dirname(tasksFile),
  });
  console.log(JSON.stringify({ run_id: meta.run_id, error: meta.error, timings_ms: meta.timings_ms }, null, 2));
  if (meta.error) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
