import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root (this file lives at <root>/bench/lib/env.ts). */
export const REPO_ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

export const RESULTS_DIR = path.join(REPO_ROOT, "results");
export const RUNS_DIR = path.join(RESULTS_DIR, "runs");

/** Environment knobs, per implementation-plan.md §9. */
export interface BenchEnv {
  model: string;
  effort: string;
  maxBudgetUsd: number;
  maxTurns: number;
  scratch: string;
  reps: number;
  hookStrict: boolean;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  return parsed;
}

export function readEnv(): BenchEnv {
  return {
    model: process.env.BENCH_MODEL?.trim() || "claude-sonnet-5",
    effort: process.env.BENCH_EFFORT?.trim() || "high",
    maxBudgetUsd: num("BENCH_MAX_BUDGET_USD", 4),
    maxTurns: num("BENCH_MAX_TURNS", 60),
    // Deliberately outside the repo: a run dir nested under the repo would let
    // `--setting-sources project` walk up into graphify-bench's own .claude/.
    scratch: process.env.BENCH_SCRATCH?.trim() || path.join(os.tmpdir(), "graphify-bench-scratch"),
    reps: num("BENCH_REPS", 3),
    hookStrict: process.env.GRAPHIFY_HOOK_STRICT === "1",
  };
}

export function runId(taskId: string, condition: string, rep: number): string {
  return `${taskId}__${condition}__r${rep}`;
}

export function runDir(id: string): string {
  return path.join(RUNS_DIR, id);
}
