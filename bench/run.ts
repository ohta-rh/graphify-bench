import { execFileSync, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { captureTranscript, runClaudeP, type ClaudePInvocation } from "./lib/claude-p.js";
import {
  effectiveModel,
  expandPalace,
  overlayDirs,
  renderMcpConfig,
  resolveCondition,
  type ConditionSpec,
} from "./conditions.js";
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

/**
 * What the MCP-backed arms actually pointed at, recorded so a run directory
 * remains self-describing.
 *
 * The index is gitignored and per-run temporary, so nothing about it survives
 * except this record: without `source_hash` a reader cannot tell whether two
 * runs queried the same index, and without `tool_count` they cannot attribute
 * the arm's fixed token overhead to the server's tool definitions.
 */
export interface McpProvision {
  server: string;
  command: string;
  args: string[];
  /** The rendered `--mcp-config` file, inside the run's temp area. */
  config_file: string;
  /** Pre-built index this run cloned from, repo-relative. */
  source_dir: string;
  /** The run's own private clone — always under the temp dir, never shared. */
  palace_dir: string;
  source_files: number;
  source_bytes: number;
  /** sha256 over the source index's file list and contents. */
  source_hash: string;
  copy_strategy: string | null;
  copy_ms: number | null;
  /** Tools the server advertised, counted from the transcript after the run. */
  tool_count: number | null;
  /** Whether the transcript shows the server's tools present at all. */
  connected: boolean | null;
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
  /** Null for every arm without an `mcp` block — which is most of them. */
  mcp: McpProvision | null;
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

/**
 * sha256 over an index directory's sorted relative file list and contents.
 *
 * The palace is gitignored and rebuilt rather than committed, so this is the
 * only handle on "which index did these 65 runs actually query". Relative paths
 * go into the digest, not absolute ones, so the hash is a property of the index
 * and not of where the checkout happens to live.
 */
function hashDir(dir: string): { hash: string; files: number; bytes: number } {
  const rels: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const child = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) rels.push(child);
    }
  };
  walk("");
  rels.sort();
  const outer = crypto.createHash("sha256");
  let bytes = 0;
  for (const rel of rels) {
    const buf = fs.readFileSync(path.join(dir, rel));
    bytes += buf.length;
    outer.update(`${crypto.createHash("sha256").update(buf).digest("hex")}  ${rel}\n`);
  }
  return { hash: outer.digest("hex"), files: rels.length, bytes };
}

/**
 * Give one run its own MCP server: a private clone of the pre-built index and a
 * config file naming it.
 *
 * Cloning rather than sharing is a correctness requirement, not a precaution.
 * ChromaDB opens its sqlite file read-write even to serve a query, so the three
 * concurrent runs `matrix.ts` allows would be three writers on one database.
 *
 * Everything lands beside the corpus copy but NOT inside it: the agent must not
 * be able to read the index off its own filesystem, which would let it answer
 * from raw chunk text rather than by querying — the mempalace equivalent of the
 * `read_graph_json` counter-productive case that `collect.ts` already watches.
 */
export function provisionMcp(
  spec: ConditionSpec,
  mcpDir: string,
  repoRoot: string,
): { provision: McpProvision; extraArgs: string[]; env: Record<string, string> } | null {
  const mcp = spec.mcp;
  if (!mcp) return null;

  const sourceDir = path.resolve(repoRoot, mcp.resourceDir);
  // Fail loudly. A missing index or a stale executable path would leave the
  // server unable to start, and `claude -p` carries on regardless — the arm
  // would quietly degrade into an expensive `baseline` re-run wearing the
  // treatment's name, which is exactly the failure `patch-overlay.ts` exists
  // to prevent for graphify's hook.
  if (!fs.existsSync(sourceDir)) {
    throw new Error(
      `condition "${spec.name}": MCP index not found at ${sourceDir}. ` +
        `Build it first: pnpm palace:build ${path.basename(mcp.resourceDir).replace(/^palace-/, "")}`,
    );
  }
  if (!fs.existsSync(mcp.command)) {
    throw new Error(
      `condition "${spec.name}": MCP server executable not found at ${mcp.command}. ` +
        "Set MEMPALACE_MCP_EXE, or run scripts/patch-overlay.ts on this host.",
    );
  }

  const palaceDir = path.join(mcpDir, "palace");
  fs.mkdirSync(mcpDir, { recursive: true });
  const copied = cloneDir(sourceDir, palaceDir);
  const { hash, files, bytes } = hashDir(sourceDir);

  const configFile = path.join(mcpDir, `${mcp.name}.mcp.json`);
  const config = renderMcpConfig(mcp, palaceDir);
  fs.writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);

  // `--strict-mcp-config` limits the run to exactly this server. Without it the
  // agent would also inherit whatever MCP servers the operator has configured
  // globally, making the arm depend on the measuring machine's personal setup.
  const extraArgs = ["--mcp-config", configFile, "--strict-mcp-config"];
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(mcp.envTemplate ?? {})) env[k] = expandPalace(v, palaceDir);

  return {
    provision: {
      server: mcp.name,
      command: mcp.command,
      args: config.mcpServers[mcp.name]!.args,
      config_file: configFile,
      source_dir: path.relative(repoRoot, sourceDir),
      palace_dir: palaceDir,
      source_files: files,
      source_bytes: bytes,
      source_hash: hash,
      copy_strategy: copied.strategy,
      copy_ms: copied.durationMs,
      tool_count: null,
      connected: null,
    },
    extraArgs,
    env,
  };
}

/**
 * Count the server's tools as the transcript saw them.
 *
 * Claude Code announces MCP tools the same way it announces its own deferred
 * ones, in a `deferred_tools_delta` attachment; a tool that is actually called
 * shows up as a `tool_use` block. Either is proof the server connected, and the
 * union is the honest count — a server whose tools were never advertised *and*
 * never called did not connect, which is the case the sanity check must catch.
 */
export function mcpToolsFromTranscript(jsonl: string, prefix: string): { count: number; connected: boolean } {
  // Announced and called are tracked apart because they answer different
  // questions. `count` is what the SERVER offered, so it must come from the
  // announcement: a model can call a name the server never had — Haiku
  // misspelled `mempalace_search` as `memplacem_search` in one run — and
  // counting the union would report a 46-tool server that does not exist.
  // `connected` is the looser test, since either signal proves the server came
  // up, and a run whose tools were advertised but never used still connected.
  const announced = new Set<string>();
  const called = new Set<string>();
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes(prefix)) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const attachment = row.attachment as { addedNames?: unknown } | undefined;
    for (const n of Array.isArray(attachment?.addedNames) ? attachment.addedNames : []) {
      if (typeof n === "string" && n.startsWith(prefix)) announced.add(n);
    }
    const content = (row.message as { content?: unknown } | undefined)?.content;
    if (!Array.isArray(content)) continue;
    for (const rawBlock of content) {
      const block = rawBlock as { type?: unknown; name?: unknown };
      if (block.type === "tool_use" && typeof block.name === "string" && block.name.startsWith(prefix)) {
        called.add(block.name);
      }
    }
  }
  return {
    count: announced.size > 0 ? announced.size : called.size,
    connected: announced.size > 0 || called.size > 0,
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
  // Beside the corpus copy, never inside it: an index the agent can read is an
  // index it can answer from without querying. The name stays opaque for the
  // same reason `workDir` does.
  const mcpDir = path.join(env.scratch, `${sessionId}.mcp`);
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
    mcp: null,
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

    // 4. per-run MCP resources: a private index clone and the config naming it
    fs.rmSync(mcpDir, { recursive: true, force: true });
    const provisioned = provisionMcp(spec, mcpDir, REPO_ROOT);
    if (provisioned) meta.mcp = provisioned.provision;

    // 5. the measured call
    const tClaude = Date.now();
    invocation = await runClaudeP({
      prompt: req.task.prompt,
      cwd: workDir,
      sessionId,
      model: env.model,
      effort: env.effort,
      maxTurns: env.maxTurns,
      maxBudgetUsd: env.maxBudgetUsd,
      extraArgs: [...(spec.extraClaudeArgs ?? []), ...(provisioned?.extraArgs ?? [])],
      // The palace path is exported to `claude` itself, not only to the server
      // it spawns: the server inherits this environment, so setting it here
      // closes the gap if a mempalace code path ever resolves the palace before
      // its own `--palace` argument is parsed.
      env: {
        ...(env.hookStrict ? { GRAPHIFY_HOOK_STRICT: "1" } : {}),
        ...(provisioned?.env ?? {}),
        ...(spec.env ?? {}),
      },
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

    // 6. persist result + transcript
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

    // 7. did the MCP server actually connect? Read it back off the transcript
    // rather than trusting the spawn: `claude -p` exits 0 whether or not its
    // configured servers came up.
    if (meta.mcp) {
      const file = path.join(outDir, "transcript.jsonl");
      if (fs.existsSync(file)) {
        const seen = mcpToolsFromTranscript(fs.readFileSync(file, "utf8"), `mcp__${meta.mcp.server}__`);
        meta.mcp.tool_count = seen.count;
        meta.mcp.connected = seen.connected;
        if (!seen.connected) {
          meta.mcp.error = `no mcp__${meta.mcp.server}__* tool was advertised or called`;
          meta.error = meta.error ?? `MCP server "${meta.mcp.server}" did not connect`;
        }
      }
    }

    // 8. grader === "vitest": run the spec inside the run dir before deleting it
    if (req.task.grader === "vitest" && req.task.spec) {
      const tTest = Date.now();
      meta.vitest = runVitest(req.task.spec, workDir);
      meta.timings_ms.vitest = Date.now() - tTest;
    }
  } catch (err) {
    meta.error = meta.error ?? String(err instanceof Error ? err.stack ?? err.message : err);
  } finally {
    // 9. tear down the run dir and the index clone; a partial result is never
    // discarded. The clone is 30–40 MB, so leaving 130 of them behind would
    // fill the temp volume long before the matrix finished.
    if (process.env.BENCH_KEEP_WORKDIR !== "1") {
      for (const dir of [workDir, mcpDir]) {
        try {
          fs.rmSync(dir, { recursive: true, force: true });
        } catch (err) {
          meta.error = meta.error ?? `cleanup failed: ${String(err)}`;
        }
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
