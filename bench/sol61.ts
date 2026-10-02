/** Code-45 or extreme on Codex. Existing Claude measurements remain untouched. */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { cloneDir } from "./lib/copy.js";
import { CODEX_BIN, SOL61_MODEL, SOL61_EFFORTS, SOL61_PRICING, runCodex, parseCodexEvents, quotaResetAt, type SolEffort } from "./lib/codex-exec.js";
import { REPO_ROOT, RUNS_DIR, RESULTS_DIR } from "./lib/env.js";
import { computeMetrics } from "./collect.js";
import { gradeRun } from "./grade.js";
import { installHidden } from "./run.js";
import { parseTaskFile, type Task } from "../tasks/tasks.schema.js";

const write = (file: string, data: unknown) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
const scratch = process.env.BENCH_SCRATCH || path.join(os.tmpdir(), "bench-scratch");
const concurrency = Number(process.env.BENCH_CONCURRENCY || 3);
const set = process.env.BENCH_SET || "code45";
if (!["code45", "extreme"].includes(set)) throw new Error("invalid BENCH_SET");
const taskFiles = set === "extreme" ? ["tasks/tasks-extreme.json"] : ["tasks/tasks.json", "tasks/tasks-ext.json"];
const reps = set === "extreme" ? 2 : 1;
const tasks = taskFiles.flatMap(f => parseTaskFile(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, f), "utf8"))).tasks);
const taskMap = new Map(tasks.map(t => [t.id, t]));
const contract = fs.readFileSync(path.join(REPO_ROOT, "overlays/baseline/CLAUDE.md"), "utf8");
const corpus = process.env.BENCH_CORPUS_V1;
if (!corpus || !fs.existsSync(corpus) || fs.existsSync(path.join(corpus, "docs"))) throw new Error("BENCH_CORPUS_V1 must be a code-only snapshot");
if (tasks.length !== (set === "extreme" ? 12 : 45) || !Number.isInteger(concurrency) || concurrency < 1) throw new Error("invalid task count/concurrency");
for (const task of tasks) for (const file of task.hidden ?? []) {
  if (fs.existsSync(path.join(corpus, file.to))) throw new Error(`hidden grading file already present in corpus: ${file.to}`);
}
const versions = { codex: execFileSync(CODEX_BIN, ["--version"], { encoding: "utf8" }).trim(), node: process.version,
  platform: `${os.platform()} ${os.release()} ${os.arch()}` };
fs.mkdirSync(RUNS_DIR, { recursive: true });
const only = process.env.BENCH_TASK_IDS?.split(",");
const efforts = process.env.BENCH_EFFORTS?.split(",") || [...SOL61_EFFORTS];
if (efforts.some(e => !SOL61_EFFORTS.includes(e as SolEffort))) throw new Error("invalid effort");
const cells = tasks.filter(t => !only || only.includes(t.id)).flatMap(task => efforts.flatMap(effort =>
  Array.from({ length: reps }, (_, i) => ({ task, effort: effort as SolEffort, rep: i + 1 }))));
let pausedUntil = 0;
async function waitForQuotaReset() {
  while (Date.now() < pausedUntil) await new Promise(resolve => setTimeout(resolve, Math.min(60_000, pausedUntil - Date.now())));
}
// Stable random interleaving avoids all low runs sharing the earliest cache/load conditions.
cells.sort((a, b) => crypto.createHash("sha256").update(a.task.id + a.effort + (reps > 1 ? a.rep : "")).digest("hex").localeCompare(crypto.createHash("sha256").update(b.task.id + b.effort + (reps > 1 ? b.rep : "")).digest("hex")));
const experimentPath = path.join(RESULTS_DIR, "experiment.json");
const previousExperiment = fs.existsSync(experimentPath) ? JSON.parse(fs.readFileSync(experimentPath, "utf8")) : {};
write(experimentPath, { ...previousExperiment, model: SOL61_MODEL, set, task_files: taskFiles, efforts, tasks: tasks.map(t => t.id), reps,
  runtime: "codex", versions, concurrency, corpus, contract_sha256: crypto.createHash("sha256").update(contract).digest("hex"),
  caps: { wall_ms: 30 * 60_000, model_turns: null, budget_usd: null }, pricing: SOL61_PRICING,
  caveats: [`Codex JSONL does not expose per-model-turn usage; Claude's ${set === "extreme" ? "120-turn/$8" : "60-turn/$4"} caps cannot be enforced by this adapter.`,
    "Cost is standard list-price equivalent, not a subscription charge. Native input tokens include cache reads/writes.",
    "Personal user configuration, web search and multi-agent tools are disabled; workspace-write sandbox, fresh clone per run."] });

async function execute(task: Task, effort: SolEffort, rep: number) {
  const condition = `sol61-effort-${effort}`, id = `${task.id}__${condition}__r${rep}`;
  const dir = path.join(RUNS_DIR, id);
  if (fs.existsSync(path.join(dir, "result.json")) && fs.existsSync(path.join(dir, "run.meta.json"))) {
    const existing = JSON.parse(fs.readFileSync(path.join(dir, "result.json"), "utf8"));
    if (existing.is_error === false || existing.terminal_reason === "wall_timeout") {
      if (!fs.existsSync(path.join(dir, "grade.json")) || JSON.parse(fs.readFileSync(path.join(dir, "grade.json"), "utf8")).success === null) {
        const grade = await gradeRun(id, taskMap, path.join(REPO_ROOT, "tasks"));
        write(path.join(dir, "grade.json"), grade);
      }
      console.log(`skip ${id}`); return;
    }
  }
  for (let attempt = 1; attempt <= 5; attempt++) {
    await waitForQuotaReset();
    const work = path.join(scratch, crypto.randomUUID());
    const start = new Date();
    fs.mkdirSync(dir, { recursive: true });
    console.log(`start ${id} attempt=${attempt}`);
    const copied = cloneDir(corpus!, work);
    // Same contract bytes, loaded natively by Codex; CLAUDE.md remains for the unchanged task wording.
    fs.writeFileSync(path.join(work, "AGENTS.md"), contract);
    fs.writeFileSync(path.join(work, "CLAUDE.md"), contract);
    let patch: any = null;
    try {
      if (task.patch) {
        const p = spawnSync("patch", ["-p1", "--batch", "--forward", "-i", path.join(REPO_ROOT, "tasks", task.patch)], { cwd: work, encoding: "utf8" });
        patch = { applied: p.status === 0, method: "patch -p1", file: task.patch };
        if (!patch.applied) throw new Error(`bug patch failed: ${p.stdout} ${p.stderr}`);
      }
      const baseline = task.grader === "vitest" ? path.join(scratch, crypto.randomUUID()) : null;
      if (baseline) cloneDir(work, baseline);
      const inv = await runCodex(work, effort, task.prompt);
      const parsed = parseCodexEvents(inv.stdout, inv.wallMs);
      if (inv.timedOut) {
        parsed.result.is_error = true;
        parsed.result.subtype = "error";
        parsed.result.terminal_reason = "wall_timeout";
      }
      fs.writeFileSync(path.join(dir, "events.jsonl"), inv.stdout);
      fs.writeFileSync(path.join(dir, "transcript.jsonl"), parsed.normalizedTranscript);
      fs.writeFileSync(path.join(dir, "stderr.txt"), inv.stderr);
      write(path.join(dir, "result.json"), parsed.result);
      let vitest: any = null;
      let hidden: string[] | null = null;
      if (baseline) {
        // Capture actual edits separately from the final message, before the grader runs.
        const diff = spawnSync("diff", ["-ruN", "--exclude=node_modules", "--exclude=.next", "--exclude=.git", baseline, work], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
        fs.writeFileSync(path.join(dir, "changes.patch"), diff.stdout || "");
        fs.rmSync(baseline, { recursive: true, force: true });
      }
      if (parsed.completed && task.grader === "vitest" && task.spec) {
        if (task.hidden) hidden = installHidden(task.hidden, path.join(REPO_ROOT, "tasks"), work);
        const test = spawnSync("pnpm", ["exec", "vitest", "run", task.spec], { cwd: work, encoding: "utf8", timeout: 600_000, maxBuffer: 32 * 1024 * 1024 });
        vitest = { ran: !test.error, passed: test.error ? null : test.status === 0, exitCode: test.status, spec: task.spec,
          outputTail: `${test.stdout}\n${test.stderr}`.trim().split("\n").slice(-40).join("\n") };
        fs.writeFileSync(path.join(dir, "vitest.txt"), `${test.stdout}\n${test.stderr}`);
      }
      const meta = { run_id: id, task_id: task.id, category: task.category, grader: task.grader, condition, rep,
        runtime: "codex", session_id: parsed.result.session_id, started_at: start.toISOString(), finished_at: new Date().toISOString(),
        corpus_dir: corpus, work_dir: work, condition_spec: { name: condition, overlays: ["baseline"], corpus: "v1", model: SOL61_MODEL, effort },
        env: { model: SOL61_MODEL, effort }, versions, copy_strategy: copied.strategy, patch, vitest, hidden,
        codex: { argv: inv.argv, exit_code: inv.exitCode, wall_ms: inv.wallMs, timed_out: inv.timedOut },
        error: parsed.error, attempt, pricing: SOL61_PRICING };
      write(path.join(dir, "run.meta.json"), meta);
      const metrics = computeMetrics(id, parsed.result, parsed.normalizedTranscript, meta);
      write(path.join(dir, "metrics.json"), { ...metrics, runtime: "codex", cost_basis: "estimated_standard_list_price", native_usage: parsed.nativeUsage });
      if (inv.timedOut) {
        write(path.join(dir, "grade.json"), { run_id: id, task_id: task.id, condition, grader: task.grader,
          success: false, score: 0, details: { terminal_reason: "wall_timeout", wall_cap_ms: 30 * 60_000,
            cost_unknown: !parsed.nativeUsage } });
        console.log(`done ${id} success=false wall_timeout=true; retained, not retried`);
        return;
      }
      if (!parsed.completed) {
        const quarantine = path.join(RESULTS_DIR, "quarantine", `${id}__attempt-${attempt}__${Date.now()}`);
        fs.mkdirSync(path.dirname(quarantine), { recursive: true });
        fs.renameSync(dir, quarantine);
        const quota = /usage limit|rate limit|quota|limit.*try again/i.test(parsed.error ?? "");
        if (quota) {
          const reset = Number(process.env.BENCH_QUOTA_RESET_AT_MS || 0);
          pausedUntil = Math.max(pausedUntil, quotaResetAt(parsed.error ?? "", Date.now(), reset) + 60_000);
        }
        console.log(`retry ${id}: ${parsed.error}${quota ? `; all workers paused until ${new Date(pausedUntil).toISOString()}` : ""}`);
        if (attempt === 5) throw new Error(`${id}: exhausted infrastructure retries`);
        // Transport retry only. Quota messages preserve the failure; do not score empty responses.
        await new Promise(resolve => setTimeout(resolve, 30_000 * attempt));
        continue;
      }
      const grade = await gradeRun(id, taskMap, path.join(REPO_ROOT, "tasks"));
      write(path.join(dir, "grade.json"), grade);
      console.log(`done ${id} success=${grade.success} score=${grade.score} wall=${(inv.wallMs / 1000).toFixed(1)}s cost=$${parsed.result.total_cost_usd?.toFixed(4)}`);
      return;
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
  }
}

let next = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < cells.length) { const cell = cells[next++]!; await execute(cell.task, cell.effort, cell.rep); }
}));
console.log(`matrix complete: ${cells.length} cells`);
