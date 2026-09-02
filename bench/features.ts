import fs from "node:fs";
import path from "node:path";

/**
 * Which parts of graphify a run actually used.
 *
 * `collect.ts` only distinguishes `Bash` from `Bash(graphify)`, which answers
 * "did the agent call the CLI at all" but not "which of the CLI's features did
 * it ever reach". The Phase 6 question is the second one: the pooled result
 * showed no token win, and one candidate explanation is that the arms only ever
 * exercised the read-only subset (`query` / `explain` / `path`) and never the
 * cross-session memory loop (`save-result` / `reflect`) or the impact analysis
 * (`affected`) that the design leans on.
 *
 * This reads `transcript.jsonl` directly rather than adding a field to
 * `metrics.json`, so the already-committed Sonnet measurement sets can be
 * counted without rewriting their metrics files.
 */
export interface FeatureUsage {
  /** graphify CLI subcommand -> invocation count (e.g. `query`, `save-result`). */
  subcommands: Record<string, number>;
  /** Bash calls that invoked the graphify executable at all. */
  invocations: number;
  /** Tool inputs that referenced `graphify-out/graph.json` directly. */
  graph_json_reads: number;
  /** Strict-mode `permissionDecision: deny` responses seen in tool results. */
  strict_denials: number;
}

export function emptyUsage(): FeatureUsage {
  return { subcommands: {}, invocations: 0, graph_json_reads: 0, strict_denials: 0 };
}

/**
 * Matches a `graphify` invocation at the start of a shell command segment.
 *
 * Anchored on a segment boundary (`^`, `;`, `|`, `&`, `(`) and tolerant of a
 * leading absolute/relative path and `VAR=value` prefixes, so `cd x && graphify
 * query "…"` counts while `cat graphify-out/graph.json` does not — the latter is
 * a raw read of the graph, counted separately as `graph_json_reads`.
 */
const GRAPHIFY_CALL_RE =
  /(?:^|[;&|(]|&&|\|\|)\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(?:\S*\/)?graphify\s+(--[a-z][a-z0-9-]*|[a-z][a-z0-9-]*)/g;

const GRAPH_JSON_RE = /graphify-out[/\\]graph\.json/;

/** The literal the strict hook emits in `permissionDecisionReason` (graphify 0.9.53). */
export const STRICT_DENY_MARKER = "graphify strict mode:";

/**
 * Subcommands worth reporting on even when their count is zero — the point of
 * the "features never exercised" table is the zeros, so they must be enumerated
 * rather than derived from what happened to be observed.
 */
export const TRACKED_SUBCOMMANDS = [
  "query",
  "explain",
  "path",
  "god-nodes",
  "affected",
  "save-result",
  "reflect",
  "update",
  "benchmark",
] as const;

/** Extract every graphify subcommand invoked by one shell command string. */
export function graphifySubcommands(command: string): string[] {
  const out: string[] = [];
  GRAPHIFY_CALL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GRAPHIFY_CALL_RE.exec(command)) !== null) {
    // `graphify god-nodes` and `graphify save-result` are single tokens; the
    // two-word forms the CLI has (`hook install`, `global add`, `export html`)
    // are not agent-facing query features, so the first token is enough.
    out.push(m[1]!);
  }
  return out;
}

/** Scan one run's JSONL transcript. */
export function parseFeatureUsage(jsonl: string): FeatureUsage {
  const usage = emptyUsage();
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const message = row.message as Record<string, unknown> | undefined;
    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const rawBlock of content) {
      const block = rawBlock as Record<string, unknown>;
      if (block.type === "tool_use") {
        const serialized = JSON.stringify(block.input ?? {});
        if (GRAPH_JSON_RE.test(serialized)) usage.graph_json_reads += 1;
        if (block.name !== "Bash") continue;
        const command = (block.input as { command?: unknown } | undefined)?.command;
        if (typeof command !== "string") continue;
        const subs = graphifySubcommands(command);
        if (subs.length > 0) usage.invocations += 1;
        for (const s of subs) usage.subcommands[s] = (usage.subcommands[s] ?? 0) + 1;
      } else if (block.type === "tool_result") {
        const text = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? "");
        if (text.includes(STRICT_DENY_MARKER)) usage.strict_denials += 1;
      }
    }
  }
  return usage;
}

/** Read `<runDir>/transcript.jsonl`; a missing transcript yields empty usage. */
export function featureUsageForRun(runDir: string): FeatureUsage {
  const file = path.join(runDir, "transcript.jsonl");
  if (!fs.existsSync(file)) return emptyUsage();
  try {
    return parseFeatureUsage(fs.readFileSync(file, "utf8"));
  } catch {
    return emptyUsage();
  }
}

export interface ConditionFeatureUsage {
  condition: string;
  runs: number;
  /** Subcommand -> total invocations across the condition. */
  subcommands: Record<string, number>;
  /** Subcommand -> number of runs that used it at least once. */
  runs_using: Record<string, number>;
  /** Runs that opened `graphify-out/graph.json` directly. */
  graph_json_read_runs: number;
  /** Runs that never invoked the graphify CLI at all (the nudge was ignored). */
  never_invoked_runs: number;
  /** Total / median strict denials observed per run. */
  strict_denials_total: number;
  strict_denials_median: number | null;
}

function medianOf(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? (s[mid] as number) : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}

/** Aggregate per-run usage into one row per condition. */
export function summarizeFeatureUsage(
  runs: Array<{ condition: string; usage: FeatureUsage }>,
): ConditionFeatureUsage[] {
  const byCondition = new Map<string, Array<FeatureUsage>>();
  for (const r of runs) {
    const list = byCondition.get(r.condition) ?? [];
    list.push(r.usage);
    byCondition.set(r.condition, list);
  }
  return [...byCondition.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([condition, list]) => {
      const subcommands: Record<string, number> = {};
      const runsUsing: Record<string, number> = {};
      for (const key of TRACKED_SUBCOMMANDS) {
        subcommands[key] = 0;
        runsUsing[key] = 0;
      }
      for (const u of list) {
        for (const [k, v] of Object.entries(u.subcommands)) {
          subcommands[k] = (subcommands[k] ?? 0) + v;
          if (v > 0) runsUsing[k] = (runsUsing[k] ?? 0) + 1;
        }
      }
      const denials = list.map((u) => u.strict_denials);
      return {
        condition,
        runs: list.length,
        subcommands,
        runs_using: runsUsing,
        graph_json_read_runs: list.filter((u) => u.graph_json_reads > 0).length,
        never_invoked_runs: list.filter((u) => u.invocations === 0).length,
        strict_denials_total: denials.reduce((a, b) => a + b, 0),
        strict_denials_median: medianOf(denials),
      };
    });
}
