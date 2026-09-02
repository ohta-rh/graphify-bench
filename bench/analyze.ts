import fs from "node:fs";
import path from "node:path";
import { listRunIds } from "./collect.js";
import { RESULTS_DIR, runDir } from "./lib/env.js";
import { mulberry32 } from "./lib/rng.js";
import type { Metrics } from "./collect.js";
import type { Grade } from "./grade.js";

export const BASELINE = "baseline";
export const TREATMENT = "graphify";

/** One run flattened for analysis. */
export interface RunRow {
  run_id: string;
  task_id: string;
  category: string | null;
  condition: string;
  rep: number;
  /** PRIMARY information volume: all models, subagents included. */
  uncached_equivalent_all: number | null;
  /** SECONDARY: main session only (`usage.*`), understates runs with subagents. */
  uncached_equivalent: number | null;
  total_cost_usd: number | null;
  num_turns: number | null;
  output_tokens_all: number | null;
  output_tokens: number | null;
  subagents_spawned: number | null;
  duration_ms: number | null;
  first_turn_cache_creation: number | null;
  tool_calls: Record<string, number>;
  tool_result_bytes: Record<string, number>;
  read_graph_json: boolean;
  skill_attributions: number;
  is_error: boolean | null;
  terminal_reason: string | null;
  score: number | null;
  success: boolean | null;
}

// --- statistics --------------------------------------------------------------

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}

export function quantile(xs: readonly number[], q: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo] as number;
  return (s[lo] as number) + ((s[hi] as number) - (s[lo] as number)) * (pos - lo);
}

export function mean(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface BootstrapCI {
  n: number;
  point: number | null;
  lo: number | null;
  hi: number | null;
  /** True when the 95% interval contains 0 — report as "no detectable difference". */
  crossesZero: boolean | null;
  B: number;
  seed: string;
}

/**
 * Percentile bootstrap over the *task-level paired differences*. Resampling
 * tasks (not runs) is what keeps the interval honest: repetitions of the same
 * task are not independent observations.
 */
export function bootstrapMeanCI(values: readonly number[], B = 2000, seed = "graphify-bench-bootstrap"): BootstrapCI {
  const n = values.length;
  const point = mean(values);
  if (n < 2) return { n, point, lo: null, hi: null, crossesZero: null, B, seed };
  const rnd = mulberry32(seed);
  const means: number[] = new Array(B);
  for (let b = 0; b < B; b++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += values[Math.floor(rnd() * n)] as number;
    means[b] = sum / n;
  }
  const lo = quantile(means, 0.025);
  const hi = quantile(means, 0.975);
  return { n, point, lo, hi, crossesZero: lo !== null && hi !== null ? lo <= 0 && hi >= 0 : null, B, seed };
}

// --- aggregation -------------------------------------------------------------

/**
 * Paired-analysis metrics. `uncached_equivalent_all` leads because it is the
 * only information-volume figure commensurable with `total_cost_usd`;
 * `uncached_equivalent` (main session only) follows as the secondary reading.
 */
const METRIC_KEYS = ["uncached_equivalent_all", "uncached_equivalent", "total_cost_usd", "num_turns"] as const;
export type PairedMetric = (typeof METRIC_KEYS)[number];

export interface ConditionSummary {
  condition: string;
  runs: number;
  errors: number;
  accuracy: number | null;
  successes: number;
  graded: number;
  /** Tokens-to-Success (PRIMARY, all models): total uncached_equivalent_all of successful runs / successes. */
  t2s: number | null;
  /** Tokens-to-Success on the main-session-only figure (secondary). */
  t2s_main: number | null;
  /** Runs that spawned at least one subagent, and the total spawned. */
  subagent_runs: number;
  subagents_spawned_total: number;
  metrics: Record<string, { median: number | null; q1: number | null; q3: number | null; mean: number | null; n: number }>;
  tool_calls: Record<string, number>;
  tool_result_bytes: Record<string, number>;
  read_graph_json_runs: number;
  skill_attribution_runs: number;
  first_turn_cache_creation_median: number | null;
}

export interface PairedResult {
  metric: PairedMetric;
  /** Per-task mean(graphify) - mean(baseline). Negative = graphify used less. */
  perTask: Array<{ task_id: string; baseline: number | null; graphify: number | null; diff: number | null; relative: number | null }>;
  ci: BootstrapCI;
  relativeCi: BootstrapCI;
}

export interface Analysis {
  generated_at: string;
  seed: string;
  bootstrap_B: number;
  conditions: string[];
  n_runs: number;
  n_tasks: number;
  by_condition: ConditionSummary[];
  by_condition_iso: ConditionSummary[];
  /** Tasks where every run of both conditions succeeded — the iso-accuracy subset. */
  iso_accuracy_tasks: string[];
  paired: PairedResult[];
  paired_iso: PairedResult[];
  by_category: Array<{ category: string; tasks: string[]; paired: PairedResult[] }>;
  failures: Array<{ run_id: string; condition: string; task_id: string; terminal_reason: string | null; is_error: boolean | null }>;
  counter_productive: { read_graph_json: string[]; graphify_never_invoked: string[] };
}

function sumInto(target: Record<string, number>, source: Record<string, number> | undefined): void {
  for (const [k, v] of Object.entries(source ?? {})) target[k] = (target[k] ?? 0) + v;
}

function pick(row: RunRow, key: PairedMetric): number | null {
  return row[key];
}

export function summarizeCondition(condition: string, rows: RunRow[]): ConditionSummary {
  const own = rows.filter((r) => r.condition === condition);
  const graded = own.filter((r) => r.success !== null);
  const successes = graded.filter((r) => r.success === true);
  const tokensOfSuccesses = successes.map((r) => r.uncached_equivalent_all).filter((v): v is number => v !== null);
  const tokensOfSuccessesMain = successes.map((r) => r.uncached_equivalent).filter((v): v is number => v !== null);
  const metrics: ConditionSummary["metrics"] = {};
  for (const key of [...METRIC_KEYS, "output_tokens_all", "output_tokens", "duration_ms"] as const) {
    const xs = own.map((r) => r[key as keyof RunRow] as number | null).filter((v): v is number => typeof v === "number");
    metrics[key] = { median: median(xs), q1: quantile(xs, 0.25), q3: quantile(xs, 0.75), mean: mean(xs), n: xs.length };
  }
  const toolCalls: Record<string, number> = {};
  const toolBytes: Record<string, number> = {};
  for (const r of own) {
    sumInto(toolCalls, r.tool_calls);
    sumInto(toolBytes, r.tool_result_bytes);
  }
  return {
    condition,
    runs: own.length,
    errors: own.filter((r) => r.is_error === true).length,
    accuracy: graded.length === 0 ? null : successes.length / graded.length,
    successes: successes.length,
    graded: graded.length,
    t2s: successes.length === 0 ? null : tokensOfSuccesses.reduce((a, b) => a + b, 0) / successes.length,
    t2s_main: successes.length === 0 ? null : tokensOfSuccessesMain.reduce((a, b) => a + b, 0) / successes.length,
    subagent_runs: own.filter((r) => (r.subagents_spawned ?? 0) > 0).length,
    subagents_spawned_total: own.reduce((a, r) => a + (r.subagents_spawned ?? 0), 0),
    metrics,
    tool_calls: toolCalls,
    tool_result_bytes: toolBytes,
    read_graph_json_runs: own.filter((r) => r.read_graph_json).length,
    skill_attribution_runs: own.filter((r) => r.skill_attributions > 0).length,
    first_turn_cache_creation_median: median(
      own.map((r) => r.first_turn_cache_creation).filter((v): v is number => v !== null),
    ),
  };
}

export function pairByTask(rows: RunRow[], metric: PairedMetric, seed: string, B: number): PairedResult {
  const taskIds = [...new Set(rows.map((r) => r.task_id))].sort();
  const perTask: PairedResult["perTask"] = [];
  for (const task_id of taskIds) {
    const b = mean(rows.filter((r) => r.task_id === task_id && r.condition === BASELINE).map((r) => pick(r, metric)).filter((v): v is number => v !== null));
    const g = mean(rows.filter((r) => r.task_id === task_id && r.condition === TREATMENT).map((r) => pick(r, metric)).filter((v): v is number => v !== null));
    const diff = b === null || g === null ? null : g - b;
    const relative = b === null || g === null || b === 0 ? null : (g - b) / b;
    perTask.push({ task_id, baseline: b, graphify: g, diff, relative });
  }
  const diffs = perTask.map((p) => p.diff).filter((v): v is number => v !== null);
  const rels = perTask.map((p) => p.relative).filter((v): v is number => v !== null);
  return {
    metric,
    perTask,
    ci: bootstrapMeanCI(diffs, B, `${seed}:${metric}:abs`),
    relativeCi: bootstrapMeanCI(rels, B, `${seed}:${metric}:rel`),
  };
}

export function analyze(rows: RunRow[], seed = "graphify-bench-bootstrap", B = 2000): Analysis {
  const conditions = [...new Set(rows.map((r) => r.condition))].sort();
  const taskIds = [...new Set(rows.map((r) => r.task_id))].sort();

  // iso-accuracy: keep only tasks where both conditions were graded and every
  // graded run succeeded. Comparing tokens across arms that answered differently
  // would credit an arm for giving up early.
  const isoTasks = taskIds.filter((t) => {
    const forTask = rows.filter((r) => r.task_id === t && r.success !== null);
    const b = forTask.filter((r) => r.condition === BASELINE);
    const g = forTask.filter((r) => r.condition === TREATMENT);
    return b.length > 0 && g.length > 0 && [...b, ...g].every((r) => r.success === true);
  });
  const isoRows = rows.filter((r) => isoTasks.includes(r.task_id));

  const categories = [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort();

  return {
    generated_at: new Date().toISOString(),
    seed,
    bootstrap_B: B,
    conditions,
    n_runs: rows.length,
    n_tasks: taskIds.length,
    by_condition: conditions.map((c) => summarizeCondition(c, rows)),
    by_condition_iso: conditions.map((c) => summarizeCondition(c, isoRows)),
    iso_accuracy_tasks: isoTasks,
    paired: METRIC_KEYS.map((m) => pairByTask(rows, m, seed, B)),
    paired_iso: METRIC_KEYS.map((m) => pairByTask(isoRows, m, `${seed}:iso`, B)),
    by_category: categories.map((category) => {
      const sub = rows.filter((r) => r.category === category);
      return {
        category,
        tasks: [...new Set(sub.map((r) => r.task_id))].sort(),
        paired: METRIC_KEYS.map((m) => pairByTask(sub, m, `${seed}:${category}`, B)),
      };
    }),
    failures: rows
      .filter((r) => r.is_error === true || r.success === false || r.success === null)
      .map((r) => ({ run_id: r.run_id, condition: r.condition, task_id: r.task_id, terminal_reason: r.terminal_reason, is_error: r.is_error })),
    counter_productive: {
      read_graph_json: rows.filter((r) => r.read_graph_json).map((r) => r.run_id),
      graphify_never_invoked: rows
        .filter((r) => r.condition === TREATMENT && (r.tool_calls["Bash(graphify)"] ?? 0) === 0)
        .map((r) => r.run_id),
    },
  };
}

// --- loading -----------------------------------------------------------------

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

export function loadRows(ids: string[] = listRunIds()): RunRow[] {
  const rows: RunRow[] = [];
  for (const id of ids) {
    const dir = runDir(id);
    const m = readJson<Metrics>(path.join(dir, "metrics.json"));
    if (!m) continue;
    const g = readJson<Grade>(path.join(dir, "grade.json"));
    const meta = readJson<{ category?: string; condition?: string; rep?: number; task_id?: string }>(path.join(dir, "run.meta.json"));
    rows.push({
      run_id: id,
      task_id: m.task_id ?? meta?.task_id ?? id.split("__")[0] ?? id,
      category: meta?.category ?? null,
      condition: m.condition ?? meta?.condition ?? id.split("__")[1] ?? "unknown",
      rep: m.rep ?? meta?.rep ?? 1,
      uncached_equivalent_all: m.uncached_equivalent_all ?? null,
      uncached_equivalent: m.uncached_equivalent,
      total_cost_usd: m.total_cost_usd,
      num_turns: m.num_turns,
      output_tokens_all: m.output_tokens_all ?? null,
      output_tokens: m.output_tokens,
      subagents_spawned: m.subagents_spawned ?? null,
      duration_ms: m.duration_ms,
      first_turn_cache_creation: m.first_turn_cache_creation,
      tool_calls: m.tool_calls ?? {},
      tool_result_bytes: m.tool_result_bytes ?? {},
      read_graph_json: m.read_graph_json ?? false,
      skill_attributions: m.skill_attributions ?? 0,
      is_error: m.is_error,
      terminal_reason: m.terminal_reason,
      score: g?.score ?? null,
      success: g?.success ?? null,
    });
  }
  return rows;
}

async function main(): Promise<void> {
  const rows = loadRows();
  if (rows.length === 0) {
    console.log("no metrics.json under results/runs/ — run bench:collect first");
    return;
  }
  const analysis = analyze(rows);
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const out = path.join(RESULTS_DIR, "analysis.json");
  fs.writeFileSync(out, `${JSON.stringify(analysis, null, 2)}\n`);
  console.log(`wrote ${out}: ${analysis.n_runs} runs over ${analysis.n_tasks} tasks`);
  for (const p of analysis.paired) {
    const { point, lo, hi, crossesZero } = p.ci;
    console.log(
      `  ${p.metric}: mean diff ${point?.toFixed(3) ?? "-"} [${lo?.toFixed(3) ?? "-"}, ${hi?.toFixed(3) ?? "-"}]${crossesZero ? "  (CI crosses 0 — no detectable difference)" : ""}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
