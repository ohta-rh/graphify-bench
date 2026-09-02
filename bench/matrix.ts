import fs from "node:fs";
import path from "node:path";
import { collectRun } from "./collect.js";
import { REPO_ROOT, readEnv, runDir, runId } from "./lib/env.js";
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
export function isComplete(id: string): boolean {
  return fs.existsSync(path.join(runDir(id), "metrics.json"));
}

interface Cli {
  profile: string;
  tasksFile: string;
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
  const concurrency = Math.min(3, Math.max(1, Number(flag(argv, "concurrency") ?? "1")));
  return {
    profile,
    tasksFile: path.resolve(REPO_ROOT, flag(argv, "tasks") ?? "tasks/tasks.json"),
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
  const parsed = parseTaskFile(JSON.parse(fs.readFileSync(cli.tasksFile, "utf8")));

  let tasks = parsed.tasks;
  if (cli.only.length > 0) tasks = tasks.filter((t) => cli.only.includes(t.id));
  if (tasks.length === 0) throw new Error(`no tasks selected from ${cli.tasksFile}`);
  const placeholders = tasks.filter((t) => t.placeholder);
  if (placeholders.length > 0 && !cli.allowPlaceholder) {
    throw new Error(
      `${placeholders.length} selected task(s) are placeholders (${placeholders.map((t) => t.id).join(", ")}). ` +
        `Pass --allow-placeholder to run them anyway; they must never appear in a real measurement.`,
    );
  }
  if (!fs.existsSync(cli.corpus)) throw new Error(`corpus not found: ${cli.corpus}`);
  for (const condition of cli.conditions) {
    const dir = path.join(cli.overlays, condition);
    if (!fs.existsSync(dir)) throw new Error(`overlay not found for condition "${condition}": ${dir}`);
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

  let index = 0;
  let failures = 0;
  const startedAll = Date.now();

  const worker = async (): Promise<void> => {
    for (;;) {
      const i = index++;
      const cell = pending[i];
      if (!cell) return;
      const started = Date.now();
      const meta = await executeRun({
        task: cell.task,
        condition: cell.condition,
        rep: cell.rep,
        corpusDir: cli.corpus,
        overlaysDir: cli.overlays,
        tasksDir: path.dirname(cli.tasksFile),
      });
      let metricsSummary = "metrics=failed";
      try {
        const m = collectRun(cell.id);
        metricsSummary = `uncached=${m.uncached_equivalent ?? "-"} cost=${(m.total_cost_usd ?? 0).toFixed(4)} turns=${m.num_turns ?? "-"}`;
      } catch (err) {
        meta.error = meta.error ?? `collect failed: ${String(err)}`;
      }
      if (meta.error) failures++;
      console.log(
        `[${i + 1}/${pending.length}] ${cell.id} ${((Date.now() - started) / 1000).toFixed(1)}s ` +
          `${metricsSummary}${meta.error ? ` ERROR: ${meta.error.split("\n")[0]}` : ""}`,
      );
    }
  };

  await Promise.all(Array.from({ length: Math.min(cli.concurrency, pending.length || 1) }, worker));
  console.log(
    `[matrix] done in ${((Date.now() - startedAll) / 60_000).toFixed(1)} min; ${pending.length - failures} ok, ${failures} with errors`,
  );
  if (failures > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
