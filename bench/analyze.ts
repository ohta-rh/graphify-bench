import fs from "node:fs";
import path from "node:path";
import { listRunIds } from "./collect.js";
import { featureUsageForRun, summarizeFeatureUsage, type ConditionFeatureUsage } from "./features.js";
import { REPO_ROOT, RESULTS_DIR, RUNS_DIR, runDir } from "./lib/env.js";
import { mulberry32 } from "./lib/rng.js";
import type { Metrics } from "./collect.js";
import type { Grade } from "./grade.js";

export const BASELINE = "baseline";
export const TREATMENT = "graphify";

/** One run flattened for analysis. */
export interface RunRow {
  run_id: string;
  /**
   * Directory the run's artifacts live in. Carried on the row (rather than
   * derived from the global `RUNS_DIR`) so an analysis can span several runs
   * directories — that is what makes the combined 45-task report possible.
   */
  run_dir: string;
  /** Which measurement set the run belongs to, e.g. `set1` / `ext`. */
  set: string;
  /** Task carries a `DELIBERATELY EASY` note — a designed zero-advantage control. */
  easy: boolean;
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
  /** Condition the difference is measured FROM (the reference arm). */
  baseline_condition: string;
  /** Condition the difference is measured TO (the arm under test). */
  treatment_condition: string;
  /**
   * Per-task mean(treatment) − mean(baseline). Negative = the treatment used
   * less. The `baseline`/`graphify` field names are historical: they are the
   * left and right sides of whatever pair this result compares.
   */
  perTask: Array<{ task_id: string; baseline: number | null; graphify: number | null; diff: number | null; relative: number | null }>;
  ci: BootstrapCI;
  relativeCi: BootstrapCI;
}

/** A named A-vs-B comparison to run in addition to the default graphify−baseline. */
export interface ComparisonSpec {
  /** Reference arm. */
  baseline: string;
  /** Arm under test. */
  treatment: string;
  /** Optional one-line question this comparison answers, echoed in the report. */
  question?: string;
}

export interface ComparisonResult extends ComparisonSpec {
  name: string;
  n_tasks: number;
  /** Tasks with a graded, fully-successful run in BOTH arms. */
  iso_accuracy_tasks: string[];
  by_condition: ConditionSummary[];
  paired: PairedResult[];
  paired_iso: PairedResult[];
  by_category: Array<{ category: string; tasks: string[]; paired: PairedResult[] }>;
}

export function comparisonName(spec: ComparisonSpec): string {
  return `${spec.treatment} vs ${spec.baseline}`;
}

/** A named subset of the runs, summarized exactly like the whole. */
export interface SubgroupResult {
  group: string;
  n_runs: number;
  n_tasks: number;
  tasks: string[];
  by_condition: ConditionSummary[];
  paired: PairedResult[];
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
  /**
   * One entry per measurement set when the analysis spans more than one, so
   * drift between independently-authored task sets stays visible instead of
   * being averaged away by the pooled numbers.
   */
  by_set: SubgroupResult[];
  /**
   * `easy` = the designed zero-advantage controls (tasks whose notes carry
   * `DELIBERATELY EASY`), `rest` = everything else. Empty when no task file was
   * supplied, since the flag lives in the task definitions, not the run dirs.
   */
  by_easy: SubgroupResult[];
  failures: Array<{ run_id: string; condition: string; task_id: string; terminal_reason: string | null; is_error: boolean | null }>;
  counter_productive: { read_graph_json: string[]; graphify_never_invoked: string[] };
  /**
   * Named A-vs-B comparisons beyond the headline `graphify − baseline`. Absent
   * from analyses produced before Phase 6, so every consumer must treat it as
   * optional — that is what keeps the pre-existing combined report reproducible.
   */
  comparisons?: ComparisonResult[];
  /** Per-condition graphify feature usage, when the caller supplied it. */
  feature_usage?: ConditionFeatureUsage[];
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

export function pairByTask(
  rows: RunRow[],
  metric: PairedMetric,
  seed: string,
  B: number,
  baselineCondition: string = BASELINE,
  treatmentCondition: string = TREATMENT,
): PairedResult {
  const taskIds = [...new Set(rows.map((r) => r.task_id))].sort();
  const perTask: PairedResult["perTask"] = [];
  for (const task_id of taskIds) {
    const b = mean(rows.filter((r) => r.task_id === task_id && r.condition === baselineCondition).map((r) => pick(r, metric)).filter((v): v is number => v !== null));
    const g = mean(rows.filter((r) => r.task_id === task_id && r.condition === treatmentCondition).map((r) => pick(r, metric)).filter((v): v is number => v !== null));
    const diff = b === null || g === null ? null : g - b;
    const relative = b === null || g === null || b === 0 ? null : (g - b) / b;
    perTask.push({ task_id, baseline: b, graphify: g, diff, relative });
  }
  const diffs = perTask.map((p) => p.diff).filter((v): v is number => v !== null);
  const rels = perTask.map((p) => p.relative).filter((v): v is number => v !== null);
  return {
    metric,
    baseline_condition: baselineCondition,
    treatment_condition: treatmentCondition,
    perTask,
    ci: bootstrapMeanCI(diffs, B, `${seed}:${metric}:abs`),
    relativeCi: bootstrapMeanCI(rels, B, `${seed}:${metric}:rel`),
  };
}

/** Tasks where every graded run of BOTH named arms succeeded. */
export function isoAccuracyTasks(rows: RunRow[], baseline: string, treatment: string): string[] {
  const taskIds = [...new Set(rows.map((r) => r.task_id))].sort();
  return taskIds.filter((t) => {
    const forTask = rows.filter((r) => r.task_id === t && r.success !== null);
    const b = forTask.filter((r) => r.condition === baseline);
    const g = forTask.filter((r) => r.condition === treatment);
    return b.length > 0 && g.length > 0 && [...b, ...g].every((r) => r.success === true);
  });
}

/**
 * Run one named A-vs-B comparison with the same machinery as the headline pair:
 * overall paired CIs, an iso-accuracy subset scoped to these two arms, and a
 * per-category breakdown. Rows of other conditions are ignored throughout, so a
 * six-arm results directory yields six clean two-arm comparisons.
 */
export function compare(rows: RunRow[], spec: ComparisonSpec, seed: string, B: number): ComparisonResult {
  const { baseline, treatment } = spec;
  const own = rows.filter((r) => r.condition === baseline || r.condition === treatment);
  const iso = isoAccuracyTasks(own, baseline, treatment);
  const isoRows = own.filter((r) => iso.includes(r.task_id));
  const key = `${seed}:cmp:${treatment}:${baseline}`;
  const categories = [...new Set(own.map((r) => r.category).filter((c): c is string => !!c))].sort();
  return {
    ...spec,
    name: comparisonName(spec),
    n_tasks: new Set(own.map((r) => r.task_id)).size,
    iso_accuracy_tasks: iso,
    by_condition: [baseline, treatment].map((c) => summarizeCondition(c, own)),
    paired: METRIC_KEYS.map((m) => pairByTask(own, m, key, B, baseline, treatment)),
    paired_iso: METRIC_KEYS.map((m) => pairByTask(isoRows, m, `${key}:iso`, B, baseline, treatment)),
    by_category: categories.map((category) => {
      const sub = own.filter((r) => r.category === category);
      return {
        category,
        tasks: [...new Set(sub.map((r) => r.task_id))].sort(),
        paired: METRIC_KEYS.map((m) => pairByTask(sub, m, `${key}:${category}`, B, baseline, treatment)),
      };
    }),
  };
}

/** Summarize an arbitrary named subset of rows with the same machinery as the whole. */
export function subgroup(
  group: string,
  rows: RunRow[],
  conditions: string[],
  seed: string,
  B: number,
  treatment: string = TREATMENT,
): SubgroupResult {
  // Only arms that actually appear in this subset. Once a results directory
  // holds arms that were not run on every measurement set, listing the global
  // condition set here would print rows of zeros for arms the subgroup never
  // contained — a table that looks like a result but is an absence.
  const present = conditions.filter((c) => rows.some((r) => r.condition === c));
  return {
    group,
    n_runs: rows.length,
    n_tasks: new Set(rows.map((r) => r.task_id)).size,
    tasks: [...new Set(rows.map((r) => r.task_id))].sort(),
    by_condition: present.map((c) => summarizeCondition(c, rows)),
    paired: METRIC_KEYS.map((m) => pairByTask(rows, m, `${seed}:${group}`, B, BASELINE, treatment)),
  };
}

export interface AnalyzeOptions {
  /** Extra named A-vs-B comparisons; the headline pair is always computed. */
  comparisons?: ComparisonSpec[];
  /** Include per-condition graphify feature usage (reads each run's transcript). */
  featureUsage?: boolean;
  /**
   * Which arm the headline sections (§3 paired, §4 iso-accuracy, §5 by-category,
   * the per-set and easy/rest subgroups) treat as the treatment. Defaults to
   * `graphify`, the arm every earlier measurement set used.
   *
   * It has to be settable because the arm under test is not always named
   * `graphify`: the docs set runs `graphify-v2` and no `graphify` at all, and a
   * hardcoded name there would silently pair the baseline against nothing and
   * render every headline table as "n too small" — an empty result that reads
   * like a harness fault rather than the missing-arm it is.
   */
  treatment?: string;
}

export function analyze(
  rows: RunRow[],
  seed = "graphify-bench-bootstrap",
  B = 2000,
  opts: AnalyzeOptions = {},
): Analysis {
  const conditions = [...new Set(rows.map((r) => r.condition))].sort();
  const taskIds = [...new Set(rows.map((r) => r.task_id))].sort();
  const treatment = opts.treatment ?? TREATMENT;

  // iso-accuracy: keep only tasks where both conditions were graded and every
  // graded run succeeded. Comparing tokens across arms that answered differently
  // would credit an arm for giving up early.
  const isoTasks = isoAccuracyTasks(rows, BASELINE, treatment);
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
    paired: METRIC_KEYS.map((m) => pairByTask(rows, m, seed, B, BASELINE, treatment)),
    paired_iso: METRIC_KEYS.map((m) => pairByTask(isoRows, m, `${seed}:iso`, B, BASELINE, treatment)),
    by_category: categories.map((category) => {
      const sub = rows.filter((r) => r.category === category);
      return {
        category,
        tasks: [...new Set(sub.map((r) => r.task_id))].sort(),
        paired: METRIC_KEYS.map((m) => pairByTask(sub, m, `${seed}:${category}`, B, BASELINE, treatment)),
      };
    }),
    // Only meaningful across >1 set; a single-set analysis would just restate §2.
    by_set: (() => {
      const sets = [...new Set(rows.map((r) => r.set))].sort();
      return sets.length < 2
        ? []
        : sets.map((s) => subgroup(s, rows.filter((r) => r.set === s), conditions, `${seed}:set`, B, treatment));
    })(),
    // Needs the task definitions; with none supplied every row is easy=false.
    by_easy: (() => {
      const easyRows = rows.filter((r) => r.easy);
      if (easyRows.length === 0) return [];
      return [
        subgroup("easy", easyRows, conditions, `${seed}:easy`, B, treatment),
        subgroup("rest", rows.filter((r) => !r.easy), conditions, `${seed}:easy`, B, treatment),
      ];
    })(),
    failures: rows
      .filter((r) => r.is_error === true || r.success === false || r.success === null)
      .map((r) => ({ run_id: r.run_id, condition: r.condition, task_id: r.task_id, terminal_reason: r.terminal_reason, is_error: r.is_error })),
    counter_productive: {
      read_graph_json: rows.filter((r) => r.read_graph_json).map((r) => r.run_id),
      graphify_never_invoked: rows
        .filter((r) => r.condition === treatment && (r.tool_calls["Bash(graphify)"] ?? 0) === 0)
        .map((r) => r.run_id),
    },
    // Both fields stay absent unless asked for, so an analysis of the original
    // two-arm data serializes byte-for-byte as it did before Phase 6.
    ...(opts.comparisons?.length
      ? { comparisons: opts.comparisons.map((c) => compare(rows, c, seed, B)) }
      : {}),
    ...(opts.featureUsage
      ? {
          feature_usage: summarizeFeatureUsage(
            rows.map((r) => ({ condition: r.condition, usage: featureUsageForRun(r.run_dir) })),
          ),
        }
      : {}),
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

/** A runs directory plus the label its runs are tagged with. */
export interface RunSource {
  label: string;
  dir: string;
}

/**
 * Parse `--runs`. Entries are `dir` or `label=dir`; an unlabelled entry takes
 * the name of the directory *containing* `runs/`, with the repository's own
 * top-level `results/runs` reading as `set1`.
 */
export function parseRunSources(spec: string | undefined, root: string): RunSource[] {
  const entries = (spec ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (entries.length === 0) return [{ label: "set1", dir: RUNS_DIR }];
  return entries.map((entry) => {
    const eq = entry.indexOf("=");
    const label = eq > 0 ? entry.slice(0, eq).trim() : "";
    const dir = path.resolve(root, eq > 0 ? entry.slice(eq + 1).trim() : entry);
    if (label) return { label, dir };
    const parent = path.basename(path.dirname(dir));
    return { label: parent === "results" ? "set1" : parent, dir };
  });
}

/**
 * Task ids whose notes mark them as designed zero-advantage controls. The
 * marker is the literal `DELIBERATELY EASY` string the task authors used; no
 * other heuristic is applied, so the subset is exactly what the task file says.
 */
export function easyTaskIds(taskFiles: string[], root: string): Set<string> {
  const ids = new Set<string>();
  for (const file of taskFiles) {
    const parsed = readJson<{ tasks?: Array<{ id?: string; notes?: string }> }>(path.resolve(root, file));
    for (const t of parsed?.tasks ?? []) {
      if (t.id && /DELIBERATELY EASY/i.test(t.notes ?? "")) ids.add(t.id);
    }
  }
  return ids;
}

function listRunIdsIn(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

/** Load every run under each source directory, tagging rows with set and easy-flag. */
export function loadRowsFromSources(sources: RunSource[], easy: Set<string> = new Set()): RunRow[] {
  const rows: RunRow[] = [];
  for (const src of sources) {
    for (const id of listRunIdsIn(src.dir)) {
      rows.push(...loadRows([id], { dir: path.join(src.dir, id), set: src.label, easy }));
    }
  }
  return rows;
}

export function loadRows(
  ids: string[] = listRunIds(),
  opts?: { dir?: string; set?: string; easy?: Set<string> },
): RunRow[] {
  const rows: RunRow[] = [];
  for (const id of ids) {
    const dir = opts?.dir ?? runDir(id);
    const m = readJson<Metrics>(path.join(dir, "metrics.json"));
    if (!m) continue;
    const g = readJson<Grade>(path.join(dir, "grade.json"));
    const meta = readJson<{ category?: string; condition?: string; rep?: number; task_id?: string }>(path.join(dir, "run.meta.json"));
    const task_id = m.task_id ?? meta?.task_id ?? id.split("__")[0] ?? id;
    rows.push({
      run_id: id,
      run_dir: dir,
      set: opts?.set ?? "set1",
      easy: opts?.easy?.has(task_id) ?? false,
      task_id,
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

/**
 * `--runs a,b` (each `dir` or `label=dir`), `--tasks f1,f2` (for the easy flag)
 * and `--out dir` are what let one invocation aggregate several measurement
 * sets into a single combined analysis.
 */
export function resolveCli(argv: string[]): {
  sources: RunSource[];
  easy: Set<string>;
  outDir: string;
  comparisons: ComparisonSpec[];
  featureUsage: boolean;
  treatment: string;
  corpusLabel: string;
} {
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && i + 1 < argv.length && !argv[i + 1]!.startsWith("--") ? argv[i + 1] : undefined;
  };
  const out = flag("out");
  return {
    sources: parseRunSources(flag("runs"), REPO_ROOT),
    easy: easyTaskIds((flag("tasks") ?? "").split(",").map((s) => s.trim()).filter(Boolean), REPO_ROOT),
    outDir: out ? path.resolve(REPO_ROOT, out) : RESULTS_DIR,
    comparisons: parseComparisons(flag("compare")),
    featureUsage: argv.includes("--feature-usage"),
    treatment: flag("treatment") ?? TREATMENT,
    // Which corpus generation the runs were measured against. It cannot be
    // inferred: `baseline` ships no graph and is registered `v1` precisely
    // because it is corpus-independent, so the same arm appears in both a
    // corpus-v1 and a corpus-v2 measurement. The caller states it.
    corpusLabel: flag("corpus-label") ?? "corpus-v1",
  };
}

/**
 * Parse `--compare "treatment:baseline,other:baseline"`. Each entry names the
 * arm under test first and the reference second, matching how the resulting
 * difference is signed (treatment − baseline).
 */
export function parseComparisons(spec: string | undefined): ComparisonSpec[] {
  const entries = (spec ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return entries.map((entry) => {
    const parts = entry.split(":").map((s) => s.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`--compare entry must be "treatment:baseline", got ${JSON.stringify(entry)}`);
    }
    return { treatment: parts[0]!, baseline: parts[1]! };
  });
}

async function main(): Promise<void> {
  const { sources, easy, outDir, comparisons, featureUsage, treatment } = resolveCli(process.argv.slice(2));
  const rows = loadRowsFromSources(sources, easy);
  if (rows.length === 0) {
    console.log(`no metrics.json under ${sources.map((s) => s.dir).join(", ")} — run bench:collect first`);
    return;
  }
  const analysis = analyze(rows, undefined, undefined, { comparisons, featureUsage, treatment });
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "analysis.json");
  fs.writeFileSync(out, `${JSON.stringify(analysis, null, 2)}\n`);
  console.log(`wrote ${out}: ${analysis.n_runs} runs over ${analysis.n_tasks} tasks`);
  for (const p of analysis.paired) {
    const { point, lo, hi, crossesZero } = p.ci;
    console.log(
      `  ${p.metric}: mean diff ${point?.toFixed(3) ?? "-"} [${lo?.toFixed(3) ?? "-"}, ${hi?.toFixed(3) ?? "-"}]${crossesZero ? "  (CI crosses 0 — no detectable difference)" : ""}`,
    );
  }
  for (const c of analysis.comparisons ?? []) {
    console.log(`  [${c.name}] ${c.n_tasks} tasks, iso subset ${c.iso_accuracy_tasks.length}`);
    for (const p of c.paired) {
      const { point, lo, hi, crossesZero } = p.ci;
      console.log(
        `    ${p.metric}: ${point?.toFixed(3) ?? "-"} [${lo?.toFixed(3) ?? "-"}, ${hi?.toFixed(3) ?? "-"}]${crossesZero ? "  (crosses 0)" : ""}`,
      );
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
