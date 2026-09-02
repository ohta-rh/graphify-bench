import fs from "node:fs";
import path from "node:path";
import { RUNS_DIR, runDir } from "./lib/env.js";
import type { ClaudeModelUsage, ClaudeResult } from "./lib/claude-p.js";

/** Metrics for one run — exactly the fields of architecture.md §5. */
export interface Metrics {
  run_id: string;
  task_id: string | null;
  condition: string | null;
  rep: number | null;

  // result JSON: usage
  input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
  output_tokens: number | null;
  /**
   * input + cache_creation + cache_read from `usage.*`. **Main session only** —
   * the pilot showed `usage.*` excludes subagent traffic while `total_cost_usd`
   * includes it, so this understates any run that spawned a subagent. Kept as
   * the SECONDARY figure; use `uncached_equivalent_all` for headline numbers.
   */
  uncached_equivalent: number | null;
  thinking_tokens: number | null;

  // result JSON: modelUsage (all models = main session + subagents)
  /**
   * Σ over `modelUsage[*]` of (inputTokens + cacheReadInputTokens +
   * cacheCreationInputTokens). **PRIMARY information-volume metric**: unlike
   * `uncached_equivalent` this covers subagent traffic too, so it is
   * commensurable with `total_cost_usd`.
   */
  uncached_equivalent_all: number | null;
  /** Σ over `modelUsage[*]` of `outputTokens` — all models, subagents included. */
  output_tokens_all: number | null;

  // result JSON: cost / shape
  total_cost_usd: number | null;
  num_turns: number | null;
  duration_ms: number | null;
  duration_api_ms: number | null;
  modelUsage: Record<string, ClaudeModelUsage> | null;
  subagents_spawned: number | null;

  // JSONL derived
  tool_calls: Record<string, number>;
  tool_result_bytes: Record<string, number>;
  /** Agent opened graphify-out/graph.json directly — the counter-productive case. */
  read_graph_json: boolean;
  read_graph_json_events: number;
  skill_attributions: number;
  skill_attribution_names: Record<string, number>;
  /**
   * MCP tool name -> call count. Present only from the MemPalace measurement
   * set onward; earlier runs' `metrics.json` predate the field, so readers must
   * treat it as optional rather than as "zero calls".
   */
  mcp_tool_calls?: Record<string, number>;
  /** Calls to any `mcp__mempalace__*` tool. Optional for the same reason. */
  mempalace_calls?: number;
  /** cache_creation_input_tokens of the first assistant message: the fixed overhead. */
  first_turn_cache_creation: number | null;

  // status
  is_error: boolean | null;
  terminal_reason: string | null;
  subtype: string | null;
  permission_denials: number | null;

  transcript_messages: number | null;
  collect_error?: string;
}

const GRAPH_JSON_RE = /graphify-out[/\\]graph\.json/;

/** `Bash` is split out by command so `graphify query` is countable on its own. */
export function classifyToolCall(name: string, input: unknown): string {
  if (name !== "Bash") return name;
  const cmd = typeof (input as { command?: unknown })?.command === "string"
    ? ((input as { command: string }).command)
    : "";
  const trimmed = cmd.trim();
  if (/^graphify\s/.test(trimmed) || /(^|[;&|(]\s*)graphify\s/.test(trimmed)) return "Bash(graphify)";
  return "Bash";
}

function textLength(content: unknown): number {
  if (content == null) return 0;
  if (typeof content === "string") return Buffer.byteLength(content, "utf8");
  return Buffer.byteLength(JSON.stringify(content), "utf8");
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface TranscriptStats {
  tool_calls: Record<string, number>;
  tool_result_bytes: Record<string, number>;
  read_graph_json: boolean;
  read_graph_json_events: number;
  skill_attributions: number;
  skill_attribution_names: Record<string, number>;
  first_turn_cache_creation: number | null;
  messages: number;
}

export function parseTranscript(jsonl: string): TranscriptStats {
  const stats: TranscriptStats = {
    tool_calls: {},
    tool_result_bytes: {},
    read_graph_json: false,
    read_graph_json_events: 0,
    skill_attributions: 0,
    skill_attribution_names: {},
    first_turn_cache_creation: null,
    messages: 0,
  };
  /** tool_use_id -> classified tool name, so tool_result bytes attribute correctly. */
  const toolNameById = new Map<string, string>();

  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    stats.messages += 1;

    const skill = row.attributionSkill;
    if (typeof skill === "string" && skill.length > 0) {
      stats.skill_attributions += 1;
      stats.skill_attribution_names[skill] = (stats.skill_attribution_names[skill] ?? 0) + 1;
    }

    const message = row.message as Record<string, unknown> | undefined;
    if (row.type === "assistant" && message) {
      const usage = message.usage as Record<string, unknown> | undefined;
      if (stats.first_turn_cache_creation === null && usage) {
        stats.first_turn_cache_creation = num(usage.cache_creation_input_tokens);
      }
    }

    const content = message?.content;
    if (!Array.isArray(content)) continue;
    for (const rawBlock of content) {
      const block = rawBlock as Record<string, unknown>;
      if (block.type === "tool_use") {
        const name = typeof block.name === "string" ? block.name : "unknown";
        const key = classifyToolCall(name, block.input);
        stats.tool_calls[key] = (stats.tool_calls[key] ?? 0) + 1;
        if (typeof block.id === "string") toolNameById.set(block.id, key);
        const serialized = JSON.stringify(block.input ?? {});
        if (GRAPH_JSON_RE.test(serialized)) {
          stats.read_graph_json = true;
          stats.read_graph_json_events += 1;
        }
      } else if (block.type === "tool_result") {
        const id = typeof block.tool_use_id === "string" ? block.tool_use_id : "";
        const key = toolNameById.get(id) ?? "unknown";
        stats.tool_result_bytes[key] = (stats.tool_result_bytes[key] ?? 0) + textLength(block.content);
      }
    }
  }
  return stats;
}

interface RunMetaLike {
  task_id?: string;
  condition?: string;
  rep?: number;
}

export function computeMetrics(
  id: string,
  result: ClaudeResult | null,
  transcript: string | null,
  meta: RunMetaLike | null,
): Metrics {
  const usage = result?.usage ?? {};
  const input = num(usage.input_tokens);
  const cacheCreate = num(usage.cache_creation_input_tokens);
  const cacheRead = num(usage.cache_read_input_tokens);
  const uncached =
    input === null && cacheCreate === null && cacheRead === null
      ? null
      : (input ?? 0) + (cacheCreate ?? 0) + (cacheRead ?? 0);

  const models = result?.modelUsage ? Object.values(result.modelUsage) : null;
  const sumModels = (f: (u: ClaudeModelUsage) => number | null): number | null => {
    if (!models || models.length === 0) return null;
    let total = 0;
    let sawAny = false;
    for (const u of models) {
      const v = f(u);
      if (v !== null) {
        total += v;
        sawAny = true;
      }
    }
    return sawAny ? total : null;
  };
  const uncachedAll = sumModels(
    (u) => {
      const i = num(u.inputTokens);
      const r = num(u.cacheReadInputTokens);
      const c = num(u.cacheCreationInputTokens);
      return i === null && r === null && c === null ? null : (i ?? 0) + (r ?? 0) + (c ?? 0);
    },
  );
  const outputAll = sumModels((u) => num(u.outputTokens));

  const t = transcript
    ? parseTranscript(transcript)
    : {
        tool_calls: {},
        tool_result_bytes: {},
        read_graph_json: false,
        read_graph_json_events: 0,
        skill_attributions: 0,
        skill_attribution_names: {},
        first_turn_cache_creation: null,
        messages: null as number | null,
      };

  // MCP tools keep their namespaced name through `classifyToolCall` (only Bash
  // is rewritten), so the counts are already in `tool_calls` — this pulls them
  // out under their own key so a reader does not have to know the prefix rule.
  const mcpToolCalls: Record<string, number> = {};
  for (const [name, count] of Object.entries(t.tool_calls)) {
    if (name.startsWith("mcp__")) mcpToolCalls[name] = count;
  }
  const mempalaceCalls = Object.entries(mcpToolCalls)
    .filter(([name]) => name.startsWith("mcp__mempalace__"))
    .reduce((a, [, count]) => a + count, 0);

  return {
    run_id: id,
    task_id: meta?.task_id ?? null,
    condition: meta?.condition ?? null,
    rep: meta?.rep ?? null,

    input_tokens: input,
    cache_creation_input_tokens: cacheCreate,
    cache_read_input_tokens: cacheRead,
    output_tokens: num(usage.output_tokens),
    uncached_equivalent: uncached,
    thinking_tokens: num(usage.output_tokens_details?.thinking_tokens),

    uncached_equivalent_all: uncachedAll,
    output_tokens_all: outputAll,

    total_cost_usd: num(result?.total_cost_usd),
    num_turns: num(result?.num_turns),
    duration_ms: num(result?.duration_ms),
    duration_api_ms: num(result?.duration_api_ms),
    modelUsage: result?.modelUsage ?? null,
    subagents_spawned: num(result?.subagent_stats?.spawned),

    tool_calls: t.tool_calls,
    tool_result_bytes: t.tool_result_bytes,
    read_graph_json: t.read_graph_json,
    read_graph_json_events: t.read_graph_json_events,
    skill_attributions: t.skill_attributions,
    skill_attribution_names: t.skill_attribution_names,
    mcp_tool_calls: mcpToolCalls,
    mempalace_calls: mempalaceCalls,
    first_turn_cache_creation: t.first_turn_cache_creation,

    is_error: typeof result?.is_error === "boolean" ? result.is_error : null,
    terminal_reason: typeof result?.terminal_reason === "string" ? result.terminal_reason : null,
    subtype: typeof result?.subtype === "string" ? result.subtype : null,
    permission_denials: Array.isArray(result?.permission_denials) ? result.permission_denials.length : null,

    transcript_messages: t.messages,
  };
}

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Read one run directory and write its metrics.json. Returns the metrics. */
export function collectRun(id: string): Metrics {
  const dir = runDir(id);
  const result = readJson<ClaudeResult>(path.join(dir, "result.json"));
  const transcriptPath = path.join(dir, "transcript.jsonl");
  const transcript = fs.existsSync(transcriptPath) ? fs.readFileSync(transcriptPath, "utf8") : null;
  const meta = readJson<RunMetaLike>(path.join(dir, "run.meta.json"));
  const metrics = computeMetrics(id, result, transcript, meta);
  if (!result) metrics.collect_error = "result.json missing or unparseable";
  fs.writeFileSync(path.join(dir, "metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  return metrics;
}

export function listRunIds(): string[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function main(): Promise<void> {
  const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const ids = only.length > 0 ? only : listRunIds();
  if (ids.length === 0) {
    console.log("no runs under results/runs/");
    return;
  }
  for (const id of ids) {
    const m = collectRun(id);
    console.log(
      `${id}  uncached_all=${m.uncached_equivalent_all ?? "-"}  uncached_main=${m.uncached_equivalent ?? "-"}  subagents=${m.subagents_spawned ?? "-"}  cost=${m.total_cost_usd ?? "-"}  turns=${m.num_turns ?? "-"}  tools=${JSON.stringify(m.tool_calls)}${m.collect_error ? `  ERROR: ${m.collect_error}` : ""}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
