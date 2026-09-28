import fs from "node:fs";
import path from "node:path";
import { collectRun } from "./collect.js";
import { overlayDirs, resolveCondition } from "./conditions.js";
import { REPO_ROOT, RESULTS_DIR, readEnv, runDir, runId } from "./lib/env.js";
import { retryDelayMs, runApiFailure } from "./lib/quota.js";
import { shuffle } from "./lib/rng.js";
import { executeRun } from "./run.js";
import { parseTaskFile, type Task } from "../tasks/tasks.schema.js";

export interface Cell {
  task: Task;
  condition: string;
  rep: number;
  id: string;
}

/** Enumerate (task × condition × rep), then shuffle so time-of-day drift spreads. */
export function enumerateCells(tasks: Task[], conditions: string[], reps: number, seed: string): Cell[] {
  const cells: Cell[] = [];
  for (const task of tasks) {
    for (const condition of conditions) {
      for (let rep = 1; rep <= reps; rep++) {
        cells.push({ task, condition, rep, id: runId(task.id, condition, rep) });
      }
    }
  }
  return shuffle(cells, seed);
}

/** A run is complete once metrics.json exists — that is the resume marker. */
/**
 * A cell is complete when its run reached the model. A run that ended in an
 * `api_error` (quota exhausted, transport failure) has metrics but measured
 * nothing, so it stays pending and is retried.
 */
export function isComplete(id: string): boolean {
  return fs.existsSync(path.join(runDir(id), "metrics.json")) && runApiFailure(runDir(id)) === null;
}

/** Most retries a single cell gets before the matrix gives up on it. */
export const MAX_API_RETRIES = 30;

/**
 * Move a run that hit an API failure out of `runs/` into `quarantine/`, so it is
 * kept as evidence but can never be collected, graded or analysed as a result.
 */
export function quarantineRun(id: string, stamp: string): string {
  const dest = path.join(RESULTS_DIR, "quarantine", `${id}__${stamp}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(runDir(id), dest);
  return dest;
}

interface Cli {
  profile: string;
  /** One or more task files; `--tasks a.json,b.json` pools them into one matrix. */
  tasksFiles: string[];
  corpus: string;
  overlays: string;
  conditions: string[];
  reps: number;
  seed: string;
  concurrency: number;
  only: string[];
  dryRun: boolean;
  force: boolean;
  allowPlaceholder: boolean;
}

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length && !argv[i + 1]!.startsWith("--") ? argv[i + 1] : undefined;
}
function bool(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

export function parseCli(argv: string[]): Cli {
  const env = readEnv();
  const profile = flag(argv, "profile") ?? "full";
  const defaultReps = profile === "pilot" ? 1 : env.reps;
  const conditions = (flag(argv, "conditions") ?? "baseline,graphify")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const concurrency = Math.min(8, Math.max(1, Number(flag(argv, "concurrency") ?? "1")));
  const tasksFiles = (flag(argv, "tasks") ?? "tasks/tasks.json")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((f) => path.resolve(REPO_ROOT, f));
  if (tasksFiles.length === 0) throw new Error("--tasks resolved to no files");
  return {
    profile,
    tasksFiles,
    corpus: path.resolve(REPO_ROOT, flag(argv, "corpus") ?? "corpus/taskflow"),
    overlays: path.resolve(REPO_ROOT, flag(argv, "overlays") ?? "overlays"),
    conditions,
    reps: Number(flag(argv, "reps") ?? String(defaultReps)),
    seed: flag(argv, "seed") ?? "graphify-bench-v1",
    concurrency,
    only: (flag(argv, "only") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    dryRun: bool(argv, "dry-run"),
    force: bool(argv, "force"),
    allowPlaceholder: bool(argv, "allow-placeholder"),
  };
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));

  // Pool several task files into one matrix. `patch`/`key`/`spec` are resolved
  // relative to the file that declared the task, so each task carries its own
  // tasks directory rather than inheriting a single global one.
  let tasks: Task[] = [];
  const tasksDirOf = new Map<string, string>();
  for (const file of cli.tasksFiles) {
    const parsed = parseTaskFile(JSON.parse(fs.readFileSync(file, "utf8")));
    for (const t of parsed.tasks) {
      const prev = tasksDirOf.get(t.id);
      if (prev !== undefined) throw new Error(`duplicate task id "${t.id}" across ${cli.tasksFiles.join(", ")}`);
      tasksDirOf.set(t.id, path.dirname(file));
      tasks.push(t);
    }
  }

  if (cli.only.length > 0) tasks = tasks.filter((t) => cli.only.includes(t.id));
  if (tasks.length === 0) throw new Error(`no tasks selected from ${cli.tasksFiles.join(", ")}`);
  const placeholders = tasks.filter((t) => t.placeholder);
  if (placeholders.length > 0 && !cli.allowPlaceholder) {
    throw new Error(
      `${placeholders.length} selected task(s) are placeholders (${placeholders.map((t) => t.id).join(", ")}). ` +
        `Pass --allow-placeholder to run them anyway; they must never appear in a real measurement.`,
    );
  }
  if (!fs.existsSync(cli.corpus)) throw new Error(`corpus not found: ${cli.corpus}`);
  for (const condition of cli.conditions) {
    for (const dir of overlayDirs(resolveCondition(condition), cli.overlays)) {
      if (!fs.existsSync(dir)) throw new Error(`overlay not found for condition "${condition}": ${dir}`);
    }
  }

  const cells = enumerateCells(tasks, cli.conditions, cli.reps, cli.seed);
  const pending = cli.force ? cells : cells.filter((c) => !isComplete(c.id));
  console.log(
    `[matrix] profile=${cli.profile} tasks=${tasks.length} conditions=${cli.conditions.join("/")} reps=${cli.reps} ` +
      `seed=${cli.seed} total=${cells.length} pending=${pending.length} concurrency=${cli.concurrency}`,
  );
  if (cli.dryRun) {
    for (const c of pending) console.log(`[dry-run] ${c.id}`);
    return;
  }

  const queue = [...pending];
  const attempts = new Map<string, number>();
  let finished = 0;
  let failures = 0;
  let pausedUntil = 0;
  const startedAll = Date.now();
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const worker = async (): Promise<void> => {
    for (;;) {
      while (Date.now() < pausedUntil) await sleep(Math.min(pausedUntil - Date.now(), 60_000));
      const cell = queue.shift();
      if (!cell) return;
      const started = Date.now();
      const meta = await executeRun({
        task: cell.task,
        condition: cell.condition,
        rep: cell.rep,
        corpusDir: cli.corpus,
        overlaysDir: cli.overlays,
        tasksDir: tasksDirOf.get(cell.task.id) ?? path.dirname(cli.tasksFiles[0]!),
      });
      let metricsSummary = "metrics=failed";
      try {
        const m = collectRun(cell.id);
        metricsSummary = `uncached=${m.uncached_equivalent ?? "-"} cost=${(m.total_cost_usd ?? 0).toFixed(4)} turns=${m.num_turns ?? "-"}`;
      } catch (err) {
        meta.error = meta.error ?? `collect failed: ${String(err)}`;
      }
      const failure = runApiFailure(runDir(cell.id));
      if (failure) {
        const tries = (attempts.get(cell.id) ?? 0) + 1;
        attempts.set(cell.id, tries);
        const moved = quarantineRun(cell.id, new Date().toISOString().replace(/[:.]/g, "-"));
        const delay = retryDelayMs(failure);
        pausedUntil = Math.max(pausedUntil, Date.now() + delay);
        console.log(
          `[retry ${tries}/${MAX_API_RETRIES}] ${cell.id} api_error (${failure.quota ? "quota" : "transport"}): ` +
            `${(failure.message.split("\n")[0] ?? "").slice(0, 120)} -> ${path.relative(REPO_ROOT, moved)}; ` +
            `all workers paused until ${new Date(pausedUntil).toISOString()}`,
        );
        if (tries < MAX_API_RETRIES) queue.push(cell);
        else failures++;
        continue;
      }
      finished++;
      if (meta.error) failures++;
      console.log(
        `[${finished}/${pending.length}] ${cell.id} ${((Date.now() - started) / 1000).toFixed(1)}s ` +
          `${metricsSummary}${meta.error ? ` ERROR: ${meta.error.split("\n")[0]}` : ""}`,
      );
    }
  };

  await Promise.all(Array.from({ length: Math.min(cli.concurrency, pending.length || 1) }, worker));
  console.log(
    `[matrix] done in ${((Date.now() - startedAll) / 60_000).toFixed(1)} min; ${finished - failures} ok, ${failures} with errors, ` +
      `${pending.length - finished} not measured`,
  );
  if (failures > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
