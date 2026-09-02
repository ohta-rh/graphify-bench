import fs from "node:fs";
import path from "node:path";
import { analyze, loadRows, type Analysis, type ConditionSummary, type PairedResult, type RunRow } from "./analyze.js";
import { RESULTS_DIR, runDir } from "./lib/env.js";

const CSV_COLUMNS = [
  "run_id",
  "task_id",
  "category",
  "condition",
  "rep",
  "uncached_equivalent",
  "input_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
  "output_tokens",
  "first_turn_cache_creation",
  "total_cost_usd",
  "num_turns",
  "duration_ms",
  "duration_api_ms",
  "tool_read",
  "tool_grep",
  "tool_glob",
  "tool_bash",
  "tool_bash_graphify",
  "tool_calls_total",
  "tool_result_bytes_total",
  "read_graph_json",
  "skill_attributions",
  "is_error",
  "terminal_reason",
  "permission_denials",
  "score",
  "success",
] as const;

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface RawMetricsExtras {
  input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  duration_api_ms?: number | null;
  permission_denials?: number | null;
}

function readExtras(id: string): RawMetricsExtras {
  try {
    return JSON.parse(fs.readFileSync(path.join(runDir(id), "metrics.json"), "utf8")) as RawMetricsExtras;
  } catch {
    return {};
  }
}

export function buildCsv(rows: RunRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    const x = readExtras(r.run_id);
    const tc = r.tool_calls;
    const record: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      run_id: r.run_id,
      task_id: r.task_id,
      category: r.category,
      condition: r.condition,
      rep: r.rep,
      uncached_equivalent: r.uncached_equivalent,
      input_tokens: x.input_tokens ?? null,
      cache_creation_input_tokens: x.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: x.cache_read_input_tokens ?? null,
      output_tokens: r.output_tokens,
      first_turn_cache_creation: r.first_turn_cache_creation,
      total_cost_usd: r.total_cost_usd,
      num_turns: r.num_turns,
      duration_ms: r.duration_ms,
      duration_api_ms: x.duration_api_ms ?? null,
      tool_read: tc.Read ?? 0,
      tool_grep: tc.Grep ?? 0,
      tool_glob: tc.Glob ?? 0,
      tool_bash: tc.Bash ?? 0,
      tool_bash_graphify: tc["Bash(graphify)"] ?? 0,
      tool_calls_total: Object.values(tc).reduce((a, b) => a + b, 0),
      tool_result_bytes_total: Object.values(r.tool_result_bytes).reduce((a, b) => a + b, 0),
      read_graph_json: r.read_graph_json,
      skill_attributions: r.skill_attributions,
      is_error: r.is_error,
      terminal_reason: r.terminal_reason,
      permission_denials: x.permission_denials ?? null,
      score: r.score,
      success: r.success,
    };
    lines.push(CSV_COLUMNS.map((c) => csvCell(record[c])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

const fmt = (v: number | null | undefined, digits = 0): string =>
  v === null || v === undefined ? "–" : v.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });

const pct = (v: number | null): string => (v === null ? "–" : `${(v * 100).toFixed(1)}%`);

function ciLine(p: PairedResult, digits: number): string {
  const { point, lo, hi, crossesZero, n } = p.ci;
  const rel = p.relativeCi.point;
  const verdict = crossesZero === null ? "n too small" : crossesZero ? "**CI crosses 0 — no detectable difference**" : point !== null && point < 0 ? "graphify lower" : "graphify higher";
  return `| ${p.metric} | ${n} | ${fmt(point, digits)} | [${fmt(lo, digits)}, ${fmt(hi, digits)}] | ${rel === null ? "–" : `${(rel * 100).toFixed(1)}%`} | ${verdict} |`;
}

function conditionTable(summaries: ConditionSummary[]): string {
  const head =
    "| condition | runs | uncached_equiv median (IQR) | cost USD median | turns median | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S |\n" +
    "|---|---|---|---|---|---|---|---|---|---|---|---|";
  const body = summaries.map((s) => {
    const u = s.metrics.uncached_equivalent;
    const c = s.metrics.total_cost_usd;
    const t = s.metrics.num_turns;
    return `| ${s.condition} | ${s.runs} | ${fmt(u?.median)} (${fmt(u?.q1)}–${fmt(u?.q3)}) | ${fmt(c?.median, 3)} | ${fmt(t?.median, 1)} | ${s.tool_calls.Read ?? 0} | ${s.tool_calls.Grep ?? 0} | ${s.tool_calls.Glob ?? 0} | ${s.tool_calls.Bash ?? 0} | ${s.tool_calls["Bash(graphify)"] ?? 0} | ${pct(s.accuracy)} (${s.successes}/${s.graded}) | ${fmt(s.t2s)} |`;
  });
  return [head, ...body].join("\n");
}

function versionsBlock(rows: RunRow[]): string {
  for (const r of rows) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(runDir(r.run_id), "run.meta.json"), "utf8")) as {
        versions?: Record<string, string | null>;
        env?: { model?: string; effort?: string; maxTurns?: number; maxBudgetUsd?: number };
      };
      const v = meta.versions ?? {};
      return [
        `- Claude Code: \`${v.claude ?? "unknown"}\``,
        `- graphify: \`${v.graphify ?? "unknown"}\``,
        `- Node: \`${v.node ?? "unknown"}\` / pnpm \`${v.pnpm ?? "unknown"}\``,
        `- Platform: \`${v.platform ?? "unknown"}\``,
        `- Model: \`${meta.env?.model ?? "unknown"}\`, effort \`${meta.env?.effort ?? "unknown"}\`, --max-turns ${meta.env?.maxTurns ?? "?"}, --max-budget-usd ${meta.env?.maxBudgetUsd ?? "?"}`,
      ].join("\n");
    } catch {
      continue;
    }
  }
  return "- (no run.meta.json available)";
}

export function buildReport(a: Analysis, rows: RunRow[]): string {
  const out: string[] = [];
  out.push("# graphify-bench results\n");
  out.push(`Generated ${a.generated_at}. ${a.n_runs} runs over ${a.n_tasks} tasks, conditions: ${a.conditions.join(", ")}.\n`);

  out.push("## 1. Environment\n");
  out.push(versionsBlock(rows));
  out.push(`\n- Bootstrap: B=${a.bootstrap_B}, percentile 95% CI, seed \`${a.seed}\`, resampled over **tasks**.`);
  out.push("- Corpus tree hash: see `docs/plan/CORPUS.md`.\n");

  out.push("## 2. Overall\n");
  out.push(conditionTable(a.by_condition));
  out.push("");
  out.push(
    "`uncached_equivalent` = input + cache_creation + cache_read. Tool columns are totals across all runs of the condition. " +
      "T2S (tokens-to-success) = total `uncached_equivalent` of successful runs / number of successful runs.\n",
  );
  out.push("Fixed overhead, reported separately so readers can subtract it (architecture.md §5):\n");
  out.push("| condition | first-turn cache_creation (median) |");
  out.push("|---|---|");
  for (const s of a.by_condition) out.push(`| ${s.condition} | ${fmt(s.first_turn_cache_creation_median)} |`);
  out.push("");

  out.push("## 3. Paired difference (graphify − baseline), all tasks\n");
  out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const p of a.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
  out.push("");

  out.push("## 4. Iso-accuracy subset\n");
  out.push(
    a.iso_accuracy_tasks.length === 0
      ? "_No task succeeded in every run of both conditions, so there is no iso-accuracy subset._\n"
      : `Tasks where every graded run of both conditions succeeded (${a.iso_accuracy_tasks.length}/${a.n_tasks}): ${a.iso_accuracy_tasks.map((t) => `\`${t}\``).join(", ")}\n`,
  );
  if (a.iso_accuracy_tasks.length > 0) {
    out.push(conditionTable(a.by_condition_iso));
    out.push("");
    out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
    out.push("|---|---|---|---|---|---|");
    for (const p of a.paired_iso) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
    out.push("");
  }

  out.push("## 5. By category\n");
  for (const cat of a.by_category) {
    out.push(`### ${cat.category} (${cat.tasks.length} task${cat.tasks.length === 1 ? "" : "s"})\n`);
    out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
    out.push("|---|---|---|---|---|---|");
    for (const p of cat.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
    out.push("");
  }

  out.push("## 6. Counter-productive cases\n");
  const cp = a.counter_productive;
  out.push(`- Runs that opened \`graphify-out/graph.json\` directly: **${cp.read_graph_json.length}**${cp.read_graph_json.length ? ` (${cp.read_graph_json.map((r) => `\`${r}\``).join(", ")})` : ""}`);
  out.push(`- graphify-condition runs that never invoked the \`graphify\` CLI (nudge ignored): **${cp.graphify_never_invoked.length}**${cp.graphify_never_invoked.length ? ` (${cp.graphify_never_invoked.map((r) => `\`${r}\``).join(", ")})` : ""}`);
  out.push("");

  out.push("## 7. Failed and ungraded runs\n");
  if (a.failures.length === 0) {
    out.push("_None._\n");
  } else {
    out.push("| run_id | condition | task | is_error | terminal_reason |");
    out.push("|---|---|---|---|---|");
    for (const f of a.failures) out.push(`| \`${f.run_id}\` | ${f.condition} | ${f.task_id} | ${f.is_error ?? "–"} | ${f.terminal_reason ?? "–"} |`);
    out.push("");
  }

  out.push("## 8. Limitations\n");
  out.push(`- N = ${a.n_runs} runs over ${a.n_tasks} tasks; a single corpus and a single model. These results do not generalize to other codebases or models.`);
  out.push("- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.");
  out.push("- Where a CI crosses zero the honest reading is \"no difference detected at this N\", not \"no difference exists\".");
  out.push("- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).");
  out.push("- Raw per-run data lives in `results/runs/<run-id>/` and `results/summary.csv`.\n");
  return out.join("\n");
}

async function main(): Promise<void> {
  const rows = loadRows();
  if (rows.length === 0) {
    console.log("no metrics under results/runs/ — run bench:collect first");
    return;
  }
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
  const analysisPath = path.join(RESULTS_DIR, "analysis.json");
  const analysis: Analysis = fs.existsSync(analysisPath)
    ? (JSON.parse(fs.readFileSync(analysisPath, "utf8")) as Analysis)
    : analyze(rows);
  const csvPath = path.join(RESULTS_DIR, "summary.csv");
  const mdPath = path.join(RESULTS_DIR, "REPORT.md");
  fs.writeFileSync(csvPath, buildCsv(rows));
  fs.writeFileSync(mdPath, buildReport(analysis, rows));
  console.log(`wrote ${csvPath} (${rows.length} rows) and ${mdPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
