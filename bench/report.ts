import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { analyze, loadRowsFromSources, median, resolveCli, TREATMENT, type Analysis, type ComparisonResult, type ConditionSummary, type PairedResult, type RunRow, type SubgroupResult } from "./analyze.js";
import { resolveCondition } from "./conditions.js";
import { TRACKED_SUBCOMMANDS } from "./features.js";
import { REPO_ROOT } from "./lib/env.js";
import { TOOL_GROUPS, speedForRun, summarizeSpeed, type ConditionSpeed, type Spread } from "./speed.js";

const CSV_COLUMNS = [
  "run_id",
  "set",
  "task_id",
  "category",
  "easy",
  "condition",
  "rep",
  "uncached_equivalent_all",
  "uncached_equivalent",
  "input_tokens",
  "cache_creation_input_tokens",
  "cache_read_input_tokens",
  "output_tokens_all",
  "output_tokens",
  "subagents_spawned",
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

function readExtras(dir: string): RawMetricsExtras {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, "metrics.json"), "utf8")) as RawMetricsExtras;
  } catch {
    return {};
  }
}

export function buildCsv(rows: RunRow[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const r of rows) {
    const x = readExtras(r.run_dir);
    const tc = r.tool_calls;
    const record: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      run_id: r.run_id,
      set: r.set,
      task_id: r.task_id,
      category: r.category,
      easy: r.easy,
      condition: r.condition,
      rep: r.rep,
      uncached_equivalent_all: r.uncached_equivalent_all,
      uncached_equivalent: r.uncached_equivalent,
      input_tokens: x.input_tokens ?? null,
      cache_creation_input_tokens: x.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: x.cache_read_input_tokens ?? null,
      output_tokens_all: r.output_tokens_all,
      output_tokens: r.output_tokens,
      subagents_spawned: r.subagents_spawned,
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
  // Analyses written before Phase 6 carry no condition names on the pair; they
  // were always graphify−baseline, so that is the fallback.
  const treat = p.treatment_condition ?? TREATMENT;
  const verdict = crossesZero === null ? "n too small" : crossesZero ? "**CI crosses 0 — no detectable difference**" : point !== null && point < 0 ? `${treat} lower` : `${treat} higher`;
  return `| ${p.metric} | ${n} | ${fmt(point, digits)} | [${fmt(lo, digits)}, ${fmt(hi, digits)}] | ${rel === null ? "–" : `${(rel * 100).toFixed(1)}%`} | ${verdict} |`;
}

/** The single sentence a reader should take away from one comparison. */
export function comparisonVerdict(c: ComparisonResult): string {
  const primary = c.paired.find((p) => p.metric === "uncached_equivalent_all");
  const cost = c.paired.find((p) => p.metric === "total_cost_usd");
  const turns = c.paired.find((p) => p.metric === "num_turns");
  const b = c.by_condition.find((s) => s.condition === c.baseline);
  const t = c.by_condition.find((s) => s.condition === c.treatment);
  const acc =
    b && t && b.accuracy !== null && t.accuracy !== null
      ? `accuracy ${pct(t.accuracy)} vs ${pct(b.accuracy)} (${t.successes}/${t.graded} vs ${b.successes}/${b.graded})`
      : "accuracy not comparable";
  const describe = (p: PairedResult | undefined, label: string, digits: number): string => {
    if (!p) return `${label} –`;
    if (p.ci.crossesZero !== false) return `${label} no detectable difference`;
    const dir = (p.ci.point ?? 0) < 0 ? "lower" : "higher";
    return `${label} ${dir} by ${fmt(Math.abs(p.ci.point ?? 0), digits)} (95% CI [${fmt(p.ci.lo, digits)}, ${fmt(p.ci.hi, digits)}])`;
  };
  return (
    `**Verdict.** \`${c.treatment}\` vs \`${c.baseline}\` over ${c.n_tasks} paired tasks: ` +
    `${describe(primary, "tokens", 0)}; ${describe(cost, "cost", 4)}; ${describe(turns, "turns", 1)}; ${acc}.`
  );
}

function comparisonBlock(c: ComparisonResult, heading: string): string[] {
  const out: string[] = [];
  out.push(`### ${heading}\n`);
  if (c.question) out.push(`_${c.question}_\n`);
  out.push(conditionTable(c.by_condition));
  out.push("");
  out.push(`Paired difference (\`${c.treatment}\` − \`${c.baseline}\`), all ${c.n_tasks} tasks:\n`);
  out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const p of c.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
  out.push("");
  if (c.iso_accuracy_tasks.length === 0) {
    out.push("_No task succeeded in every run of both arms, so there is no iso-accuracy subset._\n");
  } else {
    out.push(`Iso-accuracy subset (${c.iso_accuracy_tasks.length}/${c.n_tasks} tasks where every graded run of both arms succeeded):\n`);
    out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
    out.push("|---|---|---|---|---|---|");
    for (const p of c.paired_iso) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
    out.push("");
  }
  out.push("Per category (primary metric `uncached_equivalent_all`):\n");
  out.push("| category | tasks | mean diff | 95% CI | mean relative | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const cat of c.by_category) {
    const p = cat.paired.find((x) => x.metric === "uncached_equivalent_all");
    if (!p) continue;
    out.push(`| ${cat.category} | ${cat.tasks.length} |${ciLine(p, 1).split("|").slice(3).join("|")}`);
  }
  out.push("");
  out.push(comparisonVerdict(c));
  out.push("");
  return out;
}

function conditionTable(summaries: ConditionSummary[]): string {
  const head =
    "| condition | runs | **uncached_all median (IQR)** | uncached_main median | cost USD median | turns median | subagents | Read | Grep | Glob | Bash | Bash(graphify) | accuracy | T2S (all) |\n" +
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|";
  const body = summaries.map((s) => {
    const ua = s.metrics.uncached_equivalent_all;
    const um = s.metrics.uncached_equivalent;
    const c = s.metrics.total_cost_usd;
    const t = s.metrics.num_turns;
    return `| ${s.condition} | ${s.runs} | **${fmt(ua?.median)}** (${fmt(ua?.q1)}–${fmt(ua?.q3)}) | ${fmt(um?.median)} | ${fmt(c?.median, 3)} | ${fmt(t?.median, 1)} | ${s.subagents_spawned_total} in ${s.subagent_runs} run(s) | ${s.tool_calls.Read ?? 0} | ${s.tool_calls.Grep ?? 0} | ${s.tool_calls.Glob ?? 0} | ${s.tool_calls.Bash ?? 0} | ${s.tool_calls["Bash(graphify)"] ?? 0} | ${pct(s.accuracy)} (${s.successes}/${s.graded}) | ${fmt(s.t2s)} |`;
  });
  return [head, ...body].join("\n");
}

/** The frozen corpus's sha256 tree hash, read from its own record in docs/plan/CORPUS.md. */
export function corpusTreeHash(): string {
  try {
    const md = fs.readFileSync(path.join(REPO_ROOT, "docs/plan/CORPUS.md"), "utf8");
    return /`([0-9a-f]{64})`/.exec(md)?.[1] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Hash of the corpus-v2 documentation layer, by the same definition
 * `scripts/freeze-corpus.sh` uses for `src`+`tests`. Computed here rather than
 * read from a document because no freeze record covers `docs/`, and it is
 * written to reproduce exactly, from the repository root:
 *
 *   find corpus/taskflow/docs -type f | sort | xargs shasum -a 256 | shasum -a 256
 *
 * Paths are therefore repo-relative — an absolute path would make the value
 * depend on where the checkout happens to live.
 */
export function docsTreeHash(): string {
  const rel = "corpus/taskflow/docs";
  const root = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(root)) return "unknown";
  const files = fs
    .readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(rel, path.relative(root, path.join(e.parentPath, e.name))))
    .sort();
  const inner = files
    .map((f) => `${createHash("sha256").update(fs.readFileSync(path.join(REPO_ROOT, f))).digest("hex")}  ${f}\n`)
    .join("");
  return createHash("sha256").update(inner).digest("hex");
}

function versionsBlock(rows: RunRow[]): string {
  for (const r of rows) {
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(r.run_dir, "run.meta.json"), "utf8")) as {
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

interface RunMetaLite {
  condition?: string;
  condition_spec?: {
    overlays?: string[];
    effective_model?: string;
    extraClaudeArgs?: string[];
    note?: string;
  };
}

/**
 * One row per arm describing what was actually varied — overlays, model, extra
 * CLI args — read from `run.meta.json`. Returns null when no run records a
 * `condition_spec`, which is the case for measurement sets captured before the
 * condition registry existed; the section is then omitted entirely rather than
 * printed full of "unknown".
 */
export function conditionsBlock(rows: RunRow[]): string | null {
  const specs = new Map<string, NonNullable<RunMetaLite["condition_spec"]>>();
  for (const r of rows) {
    if (specs.has(r.condition)) continue;
    try {
      const meta = JSON.parse(fs.readFileSync(path.join(r.run_dir, "run.meta.json"), "utf8")) as RunMetaLite;
      if (meta.condition_spec) specs.set(r.condition, meta.condition_spec);
    } catch {
      continue;
    }
  }
  if (specs.size === 0) return null;
  // Notes are free text and legitimately contain `|` (matchers like "Read|Glob"),
  // which would otherwise split the markdown cell and shift every later column.
  const cell = (s: string): string => s.replace(/\|/g, "\\|");
  const lines = [
    "| condition | model | overlays | extra `claude` args | what it isolates |",
    "|---|---|---|---|---|",
  ];
  for (const name of [...specs.keys()].sort()) {
    const s = specs.get(name)!;
    const args = s.extraClaudeArgs?.length ? `\`${s.extraClaudeArgs.join(" ")}\`` : "–";
    lines.push(
      `| \`${name}\` | \`${s.effective_model ?? "?"}\` | ${(s.overlays ?? []).map((o) => `\`${o}\``).join(" + ") || "–"} | ${cell(args)} | ${cell(s.note ?? "–")} |`,
    );
  }
  return lines.join("\n");
}

/** Accuracy per arm, so a model-strength comparison reads at a glance. */
function accuracyTable(summaries: ConditionSummary[]): string {
  const lines = ["| condition | graded | successes | accuracy |", "|---|---|---|---|"];
  for (const s of summaries) lines.push(`| \`${s.condition}\` | ${s.graded} | ${s.successes} | ${pct(s.accuracy)} |`);
  return lines.join("\n");
}

/**
 * Answer quality per (arm × category): how often each arm cleared the task's
 * own success threshold, and the mean grader score behind that verdict.
 *
 * §5 reports what each category cost, not whether it was answered. That was
 * adequate while every gradeable category shared a 0.9 threshold and the
 * interesting variation was in tokens. The docs set breaks both assumptions:
 * `discrepancy` passes at 0.6, so a success there means something different
 * from a success elsewhere, and its whole point is whether an arm *finds* the
 * planted contradictions. A pass/fail count alone would hide the difference
 * between a near miss and nothing at all, so the mean score is printed beside
 * it — for a `set-f1` category that score is the set-F1 against the key.
 */
function qualityByCategoryTable(rows: RunRow[]): string {
  const cats = [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort();
  const arms = [...new Set(rows.map((r) => r.condition))].sort();
  const lines = [`| condition | ${cats.map((c) => `**${c}**`).join(" | ")} |`, `|---|${cats.map(() => "---").join("|")}|`];
  for (const arm of arms) {
    const cells = cats.map((c) => {
      const own = rows.filter((r) => r.condition === arm && r.category === c && r.success !== null);
      if (own.length === 0) return "–";
      const ok = own.filter((r) => r.success === true).length;
      const scores = own.map((r) => r.score).filter((v): v is number => v !== null);
      const meanScore = scores.length === 0 ? null : scores.reduce((a, b) => a + b, 0) / scores.length;
      return `${ok}/${own.length} · ${meanScore === null ? "–" : meanScore.toFixed(3)}`;
    });
    lines.push(`| \`${arm}\` | ${cells.join(" | ")} |`);
  }
  return lines.join("\n");
}

/** Render one named subgroup (a measurement set, or the easy/rest split). */
function subgroupBlock(g: SubgroupResult, label: string): string[] {
  const out: string[] = [];
  out.push(`### ${label} — ${g.n_runs} runs over ${g.n_tasks} task${g.n_tasks === 1 ? "" : "s"}\n`);
  out.push(conditionTable(g.by_condition));
  out.push("");
  out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const p of g.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
  out.push("");
  return out;
}

/** One arm pair to line up across two measurement sets. */
interface CrossSetPair {
  label: string;
  /** Comparison name in the *other* analysis, or null to use its headline pair. */
  other: string | null;
  /** Comparison name in *this* analysis, or null to use its headline pair. */
  own: string | null;
}

/**
 * Put this report's paired differences beside another analysis's, arm pair by
 * arm pair.
 *
 * A reader looking at the docs set alone cannot tell whether a result is a
 * property of the documentation layer or just what this harness always
 * produces. The only way to answer that is to show the same comparison on the
 * other task set at the same time — so the two columns are the whole point of
 * the section, and it renders nothing at all unless a second analysis was
 * supplied.
 */
function crossSetBlock(own: Analysis, other: Analysis, otherLabel: string, ownLabel: string): string[] {
  const pick = (a: Analysis, name: string | null): { paired: PairedResult[]; n: number } | null => {
    if (name === null) return { paired: a.paired, n: a.n_tasks };
    const c = (a.comparisons ?? []).find((x) => x.name === name);
    return c ? { paired: c.paired, n: c.n_tasks } : null;
  };
  const ownTreat = own.paired[0]?.treatment_condition ?? TREATMENT;
  const otherTreat = other.paired[0]?.treatment_condition ?? TREATMENT;
  const pairs: CrossSetPair[] = [
    {
      // The two sides need not name the same arm — the code set's treatment is
      // `graphify` and this one's is `graphify-v2` — so the heading names both
      // rather than borrowing one column's label for the other.
      label:
        ownTreat === otherTreat
          ? `${ownTreat} − baseline (headline)`
          : `${otherTreat} / ${ownTreat} − baseline (headline)`,
      other: null,
      own: null,
    },
    {
      label: "haiku graphify − haiku baseline",
      other: `haiku-graphify vs haiku-baseline`,
      own: `haiku-graphify-v2 vs haiku-baseline`,
    },
  ];
  const cell = (p: PairedResult | undefined, digits: number): string => {
    if (!p) return "–";
    const { point, lo, hi, crossesZero } = p.ci;
    return `${fmt(point, digits)} [${fmt(lo, digits)}, ${fmt(hi, digits)}]${crossesZero ? " — crosses 0" : ""}`;
  };

  const out: string[] = [];
  for (const pr of pairs) {
    const o = pick(other, pr.other);
    const s = pick(own, pr.own);
    if (!o || !s) continue;
    out.push(`### ${pr.label}\n`);
    out.push(`| metric | ${otherLabel} (n=${o.n}) | ${ownLabel} (n=${s.n}) |`);
    out.push("|---|---|---|");
    for (const m of ["uncached_equivalent_all", "total_cost_usd", "num_turns"] as const) {
      const d = m === "total_cost_usd" ? 4 : 1;
      out.push(
        `| \`${m}\` | ${cell(o.paired.find((p) => p.metric === m), d)} | ${cell(s.paired.find((p) => p.metric === m), d)} |`,
      );
    }
    out.push("");
  }
  return out;
}

/** `12,345` with an interquartile range, or an em dash when nothing was measured. */
function spreadCell(s: Spread | undefined, digits = 0): string {
  if (!s || s.median === null) return "–";
  return `${fmt(s.median, digits)} (${fmt(s.q1, digits)}–${fmt(s.q3, digits)})`;
}

/**
 * Wall-clock and per-call latency, reported as a clearly secondary result.
 *
 * The section leads with its own caveat because the caveat is load-bearing: the
 * whole matrix ran three-at-a-time on one laptop, so a session duration is
 * partly a statement about CPU contention. Per-tool-call latency survives that
 * much better — a call's duration is dominated by the tool, and the arms
 * interleave throughout the run so contention lands on all of them alike — and
 * it is the number that actually answers "is querying an index faster than
 * reading files".
 */
export function speedBlock(rows: RunRow[]): string[] {
  const summaries = summarizeSpeed(
    rows.map((r) => ({ condition: r.condition, speed: speedForRun(r.run_dir) })),
  );
  const out: string[] = [];
  out.push(
    "> **Secondary, and noisy.** Every run in every set was measured at **concurrency 3** on a single " +
      "machine, so session wall-clock includes contention this harness never controlled for and cannot " +
      "quantify. Tokens and cost are properties of the measurement; durations are not. Read the session " +
      "rows as an order of magnitude only.\n",
  );
  out.push("Session timings, median (IQR) in ms:\n");
  out.push("| condition | runs | wall `duration_ms` | API `duration_api_ms` | `ttft_ms` | pre-request `time_to_request_ms` |");
  out.push("|---|---|---|---|---|---|");
  for (const s of summaries) {
    out.push(
      `| \`${s.condition}\` | ${s.runs} | ${spreadCell(s.duration_ms)} | ${spreadCell(s.duration_api_ms)} | ` +
        `${spreadCell(s.ttft_ms)} | ${spreadCell(s.time_to_request_ms)} |`,
    );
  }
  out.push("");
  out.push(
    "`time_to_request_ms` covers everything before the first API request, which is where **MCP server " +
      "startup lands**: it is the only column in which an arm that must spawn and handshake with a server " +
      "can differ from one that does not. The transcript itself cannot show that cost — Claude Code " +
      "connects its configured servers *before* writing the first transcript entry, so the delay between " +
      "the first entry and the one advertising the server's tools collapses to a few milliseconds of " +
      "bookkeeping rather than measuring the spawn.\n",
  );
  const announced = summaries.filter((s) => s.mcp_announce_ms.median !== null);
  if (announced.length > 0) {
    out.push(
      `For the record, that bookkeeping delay was ${announced
        .map((s) => `\`${s.condition}\` ${fmt(s.mcp_announce_ms.median)} ms`)
        .join(", ")} — reported so it is not mistaken for the startup cost.\n`,
    );
  }

  const groups = TOOL_GROUPS.filter((g) => summaries.some((s) => s.tools[g]));
  if (groups.length > 0) {
    out.push("Per-tool-call latency, median (IQR) in ms, pooled over calls:\n");
    out.push(`| condition | ${groups.map((g) => `\`${g}\``).join(" | ")} |`);
    out.push(`|---|${groups.map(() => "---").join("|")}|`);
    for (const s of summaries) {
      out.push(`| \`${s.condition}\` | ${groups.map((g) => spreadCell(s.tools[g])).join(" | ")} |`);
    }
    out.push("");
    out.push(
      "Each cell is timed from the transcript entry carrying the `tool_use` block to the entry carrying " +
        "its matching `tool_result`, both written locally by the same process. Calls whose result never " +
        "arrived — a run that hit its turn cap mid-call — are absent rather than counted as zero. `n` per " +
        "cell is the number of calls, not the number of runs, so an arm that called a tool once " +
        "contributes one observation.\n",
    );
  }

  out.push(
    "**Index build cost, for scale.** graphify v1: **4.6 s** total (`update` 3.4 s + `cluster-only` " +
      "1.2 s, AST-only, no API calls). graphify v2: a comparable AST pass plus roughly **35 min** of " +
      "LLM-backed document extraction. MemPalace v1: **49 s**; v2: **97 s** (embedding + indexing, " +
      "`--no-llm`, no API calls). All are one-off costs paid before any run, and none is included in any " +
      "figure above — they are listed only so a per-query latency can be read against what producing the " +
      "index cost in the first place.\n",
  );
  return out;
}

/**
 * Where each arm's thinking and each arm's tokens actually went.
 *
 * The two halves answer the two runtime levers directly. `--effort` is supposed
 * to move thinking tokens, which bill as output but are invisible in every
 * other table in this report; the share column is the lever's own dose–response
 * curve, and an `effort-low` arm whose share did not fall would mean the flag
 * never took effect. The per-model split is the audit for `haiku-explore`: the
 * arm's claim is that exploration moved to Haiku while the main session stayed
 * on Sonnet, and `modelUsage` is the only field that sees a subagent's traffic
 * at all, so this is the difference between a measurement and an assumption.
 */
export function modelMixBlock(a: Analysis): string[] {
  const out: string[] = [];
  const models = [...new Set(a.by_condition.flatMap((s) => Object.keys(s.model_tokens ?? {})))].sort();
  out.push(
    "Thinking tokens are billed as output and are a **subset** of `output_tokens`, not an addition to it, so " +
      "the share is the honest reading of an effort change: an arm that merely wrote less prose would move the " +
      "absolute count without touching the lever. The figure is main-session only — `usage.output_tokens_details` " +
      "does not see a subagent — so an arm that delegates reports the *parent's* thinking, and its explorer's " +
      "thinking appears only as tokens against that explorer's model in the second table.\n",
  );
  out.push("| condition | runs | thinking tokens | main-session output | thinking share |");
  out.push("|---|---|---|---|---|");
  for (const s of a.by_condition) {
    out.push(
      `| \`${s.condition}\` | ${s.runs} | ${fmt(s.thinking_tokens_total ?? null)} | ${fmt(s.thinking_output_tokens ?? null)} | ` +
        `${s.thinking_share === null || s.thinking_share === undefined ? "–" : pct(s.thinking_share)} |`,
    );
  }
  out.push("");
  if (models.length > 0) {
    out.push(
      "**Which model spent the tokens.** Summed from `modelUsage` over every run of the arm, on the same " +
        "definition as `uncached_equivalent_all` (input + cache read + cache creation), so the row totals " +
        "reconcile with the headline volume rather than describing some adjacent quantity. Note that a " +
        "~1k-token Haiku entry appears in **every** arm, including plain `baseline`: that is Claude Code's own " +
        "background helper call, not delegated exploration. Only an arm whose Haiku row is orders of magnitude " +
        "larger than that has actually moved work onto Haiku.\n\n" +
        "That helper's size is a deterministic function of the task prompt, so every Sonnet arm running the same " +
        "task set reports the **identical** Haiku total. Rows agreeing to the token are therefore the expected " +
        "result here, not a copy-paste fault — and they are what makes the figure usable as a baseline to read " +
        "a genuinely delegating arm against.\n",
    );
    out.push(`| condition | ${models.map((m) => `\`${m}\` tokens`).join(" | ")} | ${models.map((m) => `\`${m}\` cost`).join(" | ")} |`);
    out.push(`|---|${models.map(() => "---").join("|")}|${models.map(() => "---").join("|")}|`);
    for (const s of a.by_condition) {
      const tokens = models.map((m) => fmt(s.model_tokens?.[m] ?? 0));
      const cost = models.map((m) => fmt(s.model_cost?.[m] ?? 0, 2));
      out.push(`| \`${s.condition}\` | ${tokens.join(" | ")} | ${cost.map((c) => `$${c}`).join(" | ")} |`);
    }
    out.push("");
  }
  return out;
}

/**
 * Where an arm's tokens actually went: fixed context re-sent every turn, versus
 * everything else.
 *
 * By Phase 12 the cheapest arms are close enough to the floor that "reduce
 * tokens" stops being actionable advice unless the reader can see which half is
 * left. The split is arithmetic on two quantities each run already records:
 *
 *   fixed  = first_turn_cache_creation × num_turns
 *   moving = uncached_equivalent_all − fixed
 *
 * `first_turn_cache_creation` is the system prompt plus the tool definitions —
 * the block that is identical on turn 1 and turn 12 — and every turn re-sends
 * it, as a cache read rather than a fresh write but still as tokens the
 * `uncached_equivalent_all` definition counts at face value. So `fixed` is the
 * cost of merely *having* a session of that length, and `moving` is the file
 * contents, tool results and reasoning that are actually about the task.
 *
 * Two honest caveats, stated here rather than in the prose because they bound
 * what the numbers can be used for:
 *  - `uncached_equivalent_all` covers subagents while `first_turn_cache_creation`
 *    and `num_turns` are main-session only, so on a delegating arm `fixed` is an
 *    UNDER-estimate. On the arms this section exists for (`--disallowedTools
 *    Agent` throughout) there are no subagents and the two agree.
 *  - Cache reads bill at a tenth of fresh input, so `fixed` is a share of
 *    information volume, not of dollars. It is deliberately not converted.
 *
 * The medians are taken per run and then over runs, not as a ratio of medians,
 * so each run contributes one observation of its own split.
 */
export function tokenDecompositionBlock(rows: RunRow[], conditions: readonly string[]): string[] {
  const out: string[] = [];
  out.push(
    "`uncached_all` is one number; this section splits it in two, because at this end of the range the " +
      "remaining question is no longer *how much* an arm spends but *on what*. **fixed = " +
      "`first_turn_cache_creation` × `num_turns`** — the system prompt and tool definitions, re-sent on " +
      "every single turn — and **moving = `uncached_all` − fixed**, which is the file contents, tool " +
      "results and reasoning that are actually about the task. Both are per-run medians, so the two " +
      "columns need not sum to the `uncached_all` median exactly.\n\n" +
      "Caveats that bound the reading: `first_turn_cache_creation` and `num_turns` are main-session only " +
      "while `uncached_all` counts subagents too, so on a delegating arm `fixed` is an under-estimate " +
      "(the arms below spawn none). And cache reads bill at a tenth of fresh input, so this is a split of " +
      "**information volume, not of dollars** — a 60% fixed share does not mean 60% of the bill.\n",
  );
  out.push("| condition | runs | uncached_all (med) | turns (med) | first-turn fixed | fixed = ft×turns (med) | moving (med) | fixed share |");
  out.push("|---|---|---|---|---|---|---|---|");
  for (const cond of conditions) {
    const own = rows.filter(
      (r) =>
        r.condition === cond &&
        r.uncached_equivalent_all !== null &&
        r.num_turns !== null &&
        r.first_turn_cache_creation !== null,
    );
    if (own.length === 0) continue;
    const fixed = own.map((r) => (r.first_turn_cache_creation as number) * (r.num_turns as number));
    const moving = own.map((r, i) => (r.uncached_equivalent_all as number) - (fixed[i] as number));
    const shares = own.map((r, i) => (fixed[i] as number) / (r.uncached_equivalent_all as number));
    out.push(
      `| \`${cond}\` | ${own.length} | ${fmt(median(own.map((r) => r.uncached_equivalent_all as number)))} | ` +
        `${fmt(median(own.map((r) => r.num_turns as number)))} | ` +
        `${fmt(median(own.map((r) => r.first_turn_cache_creation as number)))} | ` +
        `${fmt(median(fixed))} | ${fmt(median(moving))} | ${pct(median(shares) ?? 0)} |`,
    );
  }
  out.push("");
  return out;
}

export interface ReportOptions {
  /**
   * Corpus generation the runs were measured against, printed in §1. It is a
   * caller statement rather than something derived from the rows: `baseline`
   * ships no graph and reads whatever corpus it is pointed at, so the same arm
   * appears in a corpus-v1 and a corpus-v2 measurement alike.
   */
  corpusLabel?: string;
  /** Per-(arm × category) accuracy and mean grader score. Off by default. */
  qualityByCategory?: boolean;
  /** Wall-clock and per-tool-call latency. Off by default, and secondary. */
  speed?: boolean;
  /**
   * Thinking-token share and the per-model split of tokens and cost. Off by
   * default and behind its own flag rather than folded into the headline
   * table, so every report written before the runtime-lever arms existed
   * regenerates byte for byte.
   */
  modelMix?: boolean;
  /**
   * Split each arm's `uncached_all` into fixed per-turn context and the rest.
   * Off by default and behind its own flag, for the same reason `modelMix` is:
   * the six reports written before Phase 12 must regenerate byte for byte.
   */
  tokenDecomposition?: boolean;
  /** A second analysis to line this one up against, and the name to print for it. */
  vs?: { label: string; ownLabel: string; analysis: Analysis } | null;
}

export function buildReport(a: Analysis, rows: RunRow[], opts: ReportOptions = {}): string {
  const out: string[] = [];
  // The headline arm is read back off the analysis rather than assumed: the
  // paired results record which arm they were computed against, so a report
  // rendered from a stored analysis.json cannot label it as a different one.
  const treatment = a.paired[0]?.treatment_condition ?? TREATMENT;
  const corpusLabel = opts.corpusLabel ?? "corpus-v1";
  let sectionNo = 0;
  const sec = (title: string): string => `## ${++sectionNo}. ${title}\n`;
  out.push("# graphify-bench results\n");
  out.push(`Generated ${a.generated_at}. ${a.n_runs} runs over ${a.n_tasks} tasks, conditions: ${a.conditions.join(", ")}.\n`);

  out.push(sec("Environment"));
  out.push(versionsBlock(rows));
  out.push(`\n- Bootstrap: B=${a.bootstrap_B}, percentile 95% CI, seed \`${a.seed}\`, resampled over **tasks**.`);
  out.push(
    `- Corpus: \`${corpusLabel}\`, tree hash (sha256) \`${corpusTreeHash()}\` (source: \`docs/plan/CORPUS.md\`).` +
      (corpusLabel === "corpus-v1"
        ? ""
        : ` That hash pins \`src\`+\`tests\`, which \`${corpusLabel}\` leaves frozen; its addition is the ` +
          `\`docs/\` layer, hashed the same way: \`${docsTreeHash()}\`.`),
  );
  out.push(`- Report generated: ${a.generated_at.slice(0, 10)}.\n`);
  const conditions = conditionsBlock(rows);
  if (conditions) {
    out.push(
      "The `Model` line above is the harness default; arms that override it are listed here. " +
        "Every field comes from the run's own `run.meta.json`, not from the report's assumptions.\n",
    );
    out.push(conditions);
    out.push("");
  }

  out.push(sec("Overall"));
  out.push(conditionTable(a.by_condition));
  out.push("");
  out.push(
    "**`uncached_all` (PRIMARY) = Σ over every entry of `modelUsage` of (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)** — " +
      "it covers the main session *and* any subagent, so it is commensurable with `total_cost_usd`. " +
      "`uncached_main` (secondary) is the same sum taken from `usage.*`, which the result JSON populates for the **main session only**; " +
      "a run that spawned a subagent therefore reports less information volume there than it actually consumed. " +
      "The `subagents` column lets the two be reconciled. Tool columns are totals across all runs of the condition. " +
      "T2S (tokens-to-success) = total `uncached_all` of successful runs / number of successful runs.\n",
  );
  out.push("Fixed overhead, reported separately so readers can subtract it (architecture.md §5):\n");
  out.push("| condition | first-turn cache_creation (median) |");
  out.push("|---|---|");
  for (const s of a.by_condition) out.push(`| ${s.condition} | ${fmt(s.first_turn_cache_creation_median)} |`);
  out.push("");

  out.push(sec(`Paired difference (${treatment} − baseline), all tasks`));
  out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
  out.push("|---|---|---|---|---|---|");
  for (const p of a.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
  out.push("");
  const subBase = a.by_condition.find((s) => s.condition === "baseline");
  const subTreat = a.by_condition.find((s) => s.condition === treatment);
  if (subBase && subTreat && subBase.subagent_runs !== subTreat.subagent_runs) {
    out.push(
      `> **Why the two token rows disagree.** Subagent use is asymmetric between the arms ` +
        `(baseline ${subBase.subagent_runs}/${subBase.runs} runs, ${treatment} ${subTreat.subagent_runs}/${subTreat.runs}). ` +
        `\`uncached_equivalent\` cannot see a subagent's tokens, so it charges that work to nobody and makes the ` +
        `subagent-spawning arm look cheap; \`uncached_equivalent_all\` counts it. **Read the \`_all\` row** — the ` +
        `main-only row is retained only to show the size of the distortion.\n`,
    );
  }

  out.push(sec("Iso-accuracy subset"));
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

  out.push(sec("By category"));
  for (const cat of a.by_category) {
    out.push(`### ${cat.category} (${cat.tasks.length} task${cat.tasks.length === 1 ? "" : "s"})\n`);
    out.push("| metric | tasks | mean diff | 95% CI | mean relative | verdict |");
    out.push("|---|---|---|---|---|---|");
    for (const p of cat.paired) out.push(ciLine(p, p.metric === "total_cost_usd" ? 4 : 1));
    out.push("");
  }

  if (opts.qualityByCategory) {
    out.push(sec("Answer quality by category"));
    out.push(
      "Section 5 reports what each category *cost*. This one reports whether it was *answered*: each cell is " +
        "`successes/graded · mean grader score`. The two are not interchangeable — an arm that gives up early " +
        "looks cheap in section 5 and is exposed here.\n",
    );
    out.push(qualityByCategoryTable(rows));
    out.push("");
    const disc = rows.filter((r) => r.category === "discrepancy" && r.success !== null);
    if (disc.length > 0) {
      const tasks = new Set(disc.map((r) => r.task_id)).size;
      out.push(
        `**\`discrepancy\` — the doc-vs-code contradiction hunt.** ${tasks} tasks partition the ` +
          "**12** contradictions planted into corpus-v2 when it was written and recorded in " +
          "`tasks/keys/docs-discrepancies.json`. The prompts name no document, path or id: each describes a " +
          "domain in prose and asks which documents the code contradicts. Its `success_threshold` is **0.6**, " +
          "not the 0.9 the other set categories use — finding two of three planted contradictions is a " +
          "genuinely useful result, and at 0.9 the category would report an almost uniform zero and measure " +
          "nothing. A success here therefore means something weaker than a success elsewhere, which is why " +
          "the mean score is printed beside it rather than the pass count alone.\n",
      );
    }
  }

  if (opts.vs) {
    out.push(sec("This set beside the other one"));
    out.push(
      "The same arm pairs, measured on both task sets. One set alone cannot separate a property of the " +
        "corpus under test from a property of the harness; two columns can. Both sides are paired mean " +
        "differences with a 95% percentile bootstrap CI over tasks, computed by the same code — only the " +
        "tasks, and on this side the documentation layer, differ.\n",
    );
    out.push(...crossSetBlock(a, opts.vs.analysis, opts.vs.label, opts.vs.ownLabel));
  }

  const comparisons = a.comparisons ?? [];
  if (comparisons.length > 0) {
    out.push(sec("Structural comparisons"));
    out.push(
      "Each block below is an independent paired comparison between two arms, computed with the same " +
        "machinery as §3: per-task pairing over the same task set, percentile bootstrap over tasks, an " +
        "iso-accuracy subset scoped to just those two arms, and a per-category breakdown. Arms that are " +
        "not part of a block are excluded from it entirely.\n",
    );
    for (const c of comparisons) out.push(...comparisonBlock(c, `\`${c.treatment}\` vs \`${c.baseline}\``));

    // A model-strength table only makes sense when arms actually differ by model.
    const haiku = a.by_condition.filter((s) => s.condition.startsWith("haiku-"));
    if (haiku.length > 0) {
      out.push("### Accuracy by model strength\n");
      out.push(
        "The token comparisons above are only meaningful alongside accuracy: an arm that answers fewer " +
          "tasks correctly can always look cheaper. This table puts every arm's accuracy side by side so a " +
          "Haiku-vs-Sonnet reading is not mistaken for an efficiency result.\n",
      );
      out.push(accuracyTable(a.by_condition));
      out.push("");
    }
  }

  const usage = a.feature_usage ?? [];
  if (usage.length > 0) {
    out.push(sec("Features never exercised"));
    out.push(
      "graphify exposes more than `query`. The table counts, per arm, how many times each subcommand was " +
        "invoked across all runs (and, in parentheses, how many runs used it at least once). A zero column " +
        "is the point: it means the benchmark never put that feature under measurement, so nothing here — " +
        "positive or negative — can be read as evidence about it.\n",
    );
    const cols = [...TRACKED_SUBCOMMANDS];
    out.push(`| condition | runs | ${cols.map((c) => `\`${c}\``).join(" | ")} |`);
    out.push(`|---|---|${cols.map(() => "---").join("|")}|`);
    for (const u of usage) {
      const cells = cols.map((c) => {
        const total = u.subcommands[c] ?? 0;
        return total === 0 ? "**0**" : `${total} (${u.runs_using[c] ?? 0})`;
      });
      out.push(`| \`${u.condition}\` | ${u.runs} | ${cells.join(" | ")} |`);
    }
    out.push("");
    out.push("| condition | runs reading `graph.json` directly | runs that never invoked the CLI (nudge ignored) | strict denials: total (median/run) |");
    out.push("|---|---|---|---|");
    for (const u of usage) {
      // "The nudge was ignored" is only a statement about an arm that HAS a
      // graph and a hook to ignore; on a baseline arm the same count would read
      // as 100% ignored, which would be nonsense rather than a finding.
      const hasGraph = resolveCondition(u.condition).overlays.includes("graphify");
      out.push(
        `| \`${u.condition}\` | ${u.graph_json_read_runs} | ${hasGraph ? u.never_invoked_runs : "n/a (no graph)"} | ${u.strict_denials_total} (${u.strict_denials_median ?? "–"}) |`,
      );
    }
    out.push("");
    // The strict arm's whole premise is that the block fires. If it never did,
    // saying so is the finding — otherwise the arm reads as "strict changes
    // nothing", when the truth is "strict never engaged".
    const strictArms = usage.filter((u) => resolveCondition(u.condition).overlays.includes("graphify-strict"));
    const inertStrict = strictArms.filter((u) => u.runs > 0 && u.strict_denials_total === 0);
    if (inertStrict.length > 0) {
      out.push(
        `> **The strict block never fired.** Across ${inertStrict.map((u) => `${u.runs} \`${u.condition}\``).join(" and ")} ` +
          "runs the hook denied **zero** reads, confirmed three ways: no `permissionDecision` in any transcript, no deny " +
          "text, and `permission_denials` = 0 in every `result.json`. The cause is in graphify's own guard " +
          "(`cli.py::_query_stamp_fresh`): strict suppresses its block while a query/explain/path ran within the last " +
          "30 minutes, and the overlay's `CLAUDE.md` already steers the agent to `graphify query` **before** its first " +
          "raw `Read`. The soft nudge wins the race every time, so the strict flag is inert under this overlay — " +
          "`graphify-strict` vs `graphify` is therefore a null result about a knob that never engaged, **not** " +
          "evidence that forcing graph-first exploration does nothing.\n",
      );
    }
    // MCP-backed arms only. Rendered from what the analysis actually carries, so
    // a measurement set with no MCP arm — every set before MemPalace — prints
    // nothing here and regenerates byte-identically.
    const mcpArms = usage.filter((u) => Object.keys(u.mcp_calls ?? {}).length > 0 || (u.mempalace_calls_total ?? 0) > 0);
    if (mcpArms.length > 0) {
      const tools = [...new Set(mcpArms.flatMap((u) => Object.keys(u.mcp_calls ?? {})))].sort();
      out.push("**MCP retrieval tools.** The same question asked of the other retrieval mechanism.\n");
      out.push(
        "The `mempalace` arms have no CLI to invoke, so every zero in the table above is structural for them " +
          "rather than a finding. What they do have is a server exposing **45** tools, of which the nudge in " +
          "`CLAUDE.md` points at exactly one. The columns below count what was actually called, and the " +
          "`bytes returned` column is the efficiency claim itself: a prebuilt index only pays for itself if " +
          "what it hands back is smaller than reading the files would have been.\n",
      );
      out.push(`| condition | runs | ${tools.map((t) => `\`${t.replace(/^mcp__/, "")}\``).join(" | ")} | total calls | median/run | runs using | bytes returned |`);
      out.push(`|---|---|${tools.map(() => "---").join("|")}|---|---|---|---|`);
      for (const u of mcpArms) {
        const cells = tools.map((t) => {
          const n = u.mcp_calls?.[t] ?? 0;
          return n === 0 ? "**0**" : String(n);
        });
        out.push(
          `| \`${u.condition}\` | ${u.runs} | ${cells.join(" | ")} | ${u.mempalace_calls_total ?? 0} | ` +
            `${u.mempalace_calls_median ?? "–"} | ${u.mempalace_runs_using ?? 0}/${u.runs} | ${fmt(u.mcp_result_bytes_total ?? 0)} |`,
        );
      }
      out.push("");
      const ignored = mcpArms.filter((u) => (u.mempalace_never_called_runs ?? 0) > 0);
      if (ignored.length > 0) {
        out.push(
          `> **The retrieval nudge was ignored in some runs.** ` +
            `${ignored.map((u) => `\`${u.condition}\` ${u.mempalace_never_called_runs}/${u.runs}`).join(", ")} ` +
            "run(s) never called `mempalace_search` at all, despite `CLAUDE.md` telling the agent to search " +
            "before grepping. Those runs are a baseline in everything but name and their tokens are still " +
            "pooled into the arm, so the arm's measured effect is diluted by exactly that fraction — the same " +
            "caveat the `never invoked the CLI` column records for graphify.\n",
        );
      }
      out.push(
        "> **The 45 tool definitions are a fixed cost, and it is in §2.** Every `mempalace` run carries the " +
          "server's full tool schema — ~32 KB of JSON, roughly 8k tokens — in its first request, whether or " +
          "not it ever calls a tool. That lands in `first_turn_cache_creation`, so the fixed-overhead table " +
          "in §2 is where the arms are separable on it; it is **not** subtracted from any figure in this " +
          "report. Note also that these arms run with `--strict-mcp-config` while the others do not, so they " +
          "are the only arms that do *not* also carry the measuring host's own MCP servers — those appear in " +
          "the other arms as deferred names only, which is far cheaper than a loaded schema but not zero.\n",
      );
    }
    out.push(
      "> **Cross-session memory was never measured.** `save-result`, `reflect` and `affected` are the " +
        "mechanisms by which graphify is supposed to compound across sessions, and they were invoked **zero " +
        "times in every arm**. Each benchmark run is a fresh corpus copy with a fresh session, so there is no " +
        "second session for a saved result to pay off in — the design that would exercise them is a different " +
        "experiment, not a variation of this one. The honest statement is that this benchmark measures " +
        "single-session retrieval only.\n",
    );
  }

  if (opts.speed) {
    out.push(sec("Speed"));
    out.push(...speedBlock(rows));
  }

  if (opts.modelMix) {
    out.push(sec("Thinking tokens and model mix"));
    out.push(...modelMixBlock(a));
  }

  if (opts.tokenDecomposition) {
    out.push(sec("Where the remaining tokens go"));
    out.push(...tokenDecompositionBlock(rows, a.conditions));
  }

  out.push(sec("Counter-productive cases and subagent use"));
  const cp = a.counter_productive;
  for (const s of a.by_condition) {
    out.push(
      `- \`${s.condition}\`: **${s.subagents_spawned_total}** subagent(s) spawned across **${s.subagent_runs}**/${s.runs} run(s). ` +
        `T2S all-model ${fmt(s.t2s)} vs main-session-only ${fmt(s.t2s_main)}.`,
    );
  }
  out.push(`- Runs that opened \`graphify-out/graph.json\` directly: **${cp.read_graph_json.length}**${cp.read_graph_json.length ? ` (${cp.read_graph_json.map((r) => `\`${r}\``).join(", ")})` : ""}`);
  out.push(`- graphify-condition runs that never invoked the \`graphify\` CLI (nudge ignored): **${cp.graphify_never_invoked.length}**${cp.graphify_never_invoked.length ? ` (${cp.graphify_never_invoked.map((r) => `\`${r}\``).join(", ")})` : ""}`);
  out.push("");

  out.push(sec("Failed and ungraded runs"));
  const harnessFailures = a.failures.filter((f) => f.is_error === true || (f.terminal_reason !== null && f.terminal_reason !== "completed"));
  out.push(
    `Harness failures (\`is_error\`, or \`terminal_reason\` other than \`completed\`): **${harnessFailures.length}**. ` +
      `The table below also lists runs that completed normally but did not meet their grader's success threshold — ` +
      `those are accuracy results, not execution problems.\n`,
  );
  if (a.failures.length === 0) {
    out.push("_None._\n");
  } else {
    out.push("| run_id | condition | task | is_error | terminal_reason |");
    out.push("|---|---|---|---|---|");
    for (const f of a.failures) out.push(`| \`${f.run_id}\` | ${f.condition} | ${f.task_id} | ${f.is_error ?? "–"} | ${f.terminal_reason ?? "–"} |`);
    out.push("");
  }

  if (a.by_set.length > 0) {
    out.push(sec("Per-set breakdown (drift between measurement sets)"));
    out.push(
      "The two task sets were authored separately. Pooling them is only legitimate if they behave alike, " +
        "so each set is re-analysed on its own here: a large gap between the two blocks means the pooled " +
        "numbers above are averaging over a real difference in task design, not just sampling noise.\n",
    );
    for (const g of a.by_set) out.push(...subgroupBlock(g, `set \`${g.group}\``));
  }

  if (a.by_easy.length > 0) {
    out.push(sec("Deliberately-easy controls vs the rest"));
    const easy = a.by_easy.find((g) => g.group === "easy");
    out.push(
      "Some tasks were written as **designed zero-advantage controls**: their answer is reproduced exactly by a " +
        "single literal `grep`, so a structural index has nothing to add and the expected effect is zero or negative. " +
        "They are marked `DELIBERATELY EASY` in the task notes and are separated out here so they neither flatter " +
        "nor drag the headline number." +
        (easy ? ` Easy tasks: ${easy.tasks.map((t) => `\`${t}\``).join(", ")}.` : "") +
        "\n",
    );
    for (const g of a.by_easy) out.push(...subgroupBlock(g, g.group === "easy" ? "easy (zero-advantage controls)" : "rest"));
  }

  out.push(sec("Limitations"));
  out.push(`- N = ${a.n_runs} runs over ${a.n_tasks} tasks; a single corpus and a single model. These results do not generalize to other codebases or models.`);
  out.push("- Bootstrap resamples tasks, so the interval reflects task-to-task variation, not within-task run noise.");
  out.push("- Where a CI crosses zero the honest reading is \"no difference detected at this N\", not \"no difference exists\".");
  out.push("- The fixed ~21k-token system-prompt/tool-definition overhead is included in both arms and not subtracted (see §2).");
  out.push("- **1 repetition per (task × condition)**: within-task run-to-run variance is unmeasured, so any single per-task difference may be run noise.");
  out.push("- Subagent traffic is counted in `uncached_all`, but a subagent's tool calls never reach the parent transcript, so the tool-call columns stay main-session-only.");
  out.push(
    `- Raw per-run data lives in ${[...new Set(rows.map((r) => `\`${path.relative(REPO_ROOT, path.dirname(r.run_dir))}/<run-id>/\``))].join(", ")} and the \`summary.csv\` beside this report.\n`,
  );
  return out.join("\n");
}

async function main(): Promise<void> {
  const { sources, easy, outDir, comparisons, featureUsage, treatment, corpusLabel } = resolveCli(process.argv.slice(2));
  const wantsModelMix = process.argv.includes("--model-mix");
  const rows = loadRowsFromSources(sources, easy);
  if (rows.length === 0) {
    console.log(`no metrics under ${sources.map((s) => s.dir).join(", ")} — run bench:collect first`);
    return;
  }
  fs.mkdirSync(outDir, { recursive: true });
  const analysisPath = path.join(outDir, "analysis.json");
  // An analysis.json written by `bench:analyze` is reused verbatim so the report
  // and the machine-readable analysis can never disagree — but only if it already
  // carries what this invocation asks for. Requesting comparisons or feature usage
  // that the stored analysis lacks means it was produced by a different question,
  // so re-analyse rather than silently dropping the requested sections.
  const stored = fs.existsSync(analysisPath)
    ? (JSON.parse(fs.readFileSync(analysisPath, "utf8")) as Analysis)
    : null;
  const storedIsEnough =
    stored !== null &&
    (comparisons.length === 0 || (stored.comparisons?.length ?? 0) >= comparisons.length) &&
    (!featureUsage || (stored.feature_usage?.length ?? 0) > 0) &&
    // An analysis.json written before the runtime-lever arms carries no
    // per-model split, so reusing it under `--model-mix` would print an empty
    // table instead of the audit the flag was asked for.
    (!wantsModelMix || stored.by_condition.every((s) => s.model_tokens !== undefined)) &&
    // A stored analysis computed against a different headline arm answers a
    // different question; reusing it would print `treatment` in the heading over
    // numbers paired against something else.
    (stored.paired[0]?.treatment_condition ?? TREATMENT) === treatment;
  const analysis: Analysis = storedIsEnough
    ? stored
    : analyze(rows, undefined, undefined, { comparisons, featureUsage, treatment });
  const csvPath = path.join(outDir, "summary.csv");
  const mdPath = path.join(outDir, "REPORT.md");
  fs.writeFileSync(csvPath, buildCsv(rows));
  // `--vs "code-45=results/structural/analysis.json"` lines this report's arm
  // pairs up against an analysis produced by an earlier measurement set.
  const argv = process.argv.slice(2);
  const vsFlagIndex = argv.indexOf("--vs");
  const vsSpec = vsFlagIndex >= 0 && vsFlagIndex + 1 < argv.length ? argv[vsFlagIndex + 1] : undefined;
  let vs: { label: string; ownLabel: string; analysis: Analysis } | null = null;
  if (vsSpec) {
    const eq = vsSpec.indexOf("=");
    if (eq < 0) throw new Error(`--vs must be "label=path/to/analysis.json", got ${JSON.stringify(vsSpec)}`);
    const label = vsSpec.slice(0, eq);
    const file = path.resolve(REPO_ROOT, vsSpec.slice(eq + 1));
    // Fail loudly: a silently-skipped comparison would leave the section absent
    // and look like the report simply chose not to print it.
    if (!fs.existsSync(file)) throw new Error(`--vs analysis not found: ${file}`);
    const ownLabelFlag = argv.indexOf("--vs-own-label");
    vs = {
      label,
      ownLabel: ownLabelFlag >= 0 && ownLabelFlag + 1 < argv.length ? argv[ownLabelFlag + 1]! : "this set",
      analysis: JSON.parse(fs.readFileSync(file, "utf8")) as Analysis,
    };
  }
  fs.writeFileSync(
    mdPath,
    buildReport(analysis, rows, {
      corpusLabel,
      qualityByCategory: argv.includes("--quality-by-category"),
      speed: argv.includes("--speed"),
      modelMix: argv.includes("--model-mix"),
      tokenDecomposition: argv.includes("--token-decomposition"),
      vs,
    }),
  );
  console.log(`wrote ${csvPath} (${rows.length} rows) and ${mdPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
