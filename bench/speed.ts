import fs from "node:fs";
import path from "node:path";
import { median, quantile } from "./analyze.js";
import type { ClaudeResult } from "./lib/claude-p.js";

/**
 * Latency, kept deliberately separate from the token analysis.
 *
 * Every other figure this harness reports is a property of the measurement:
 * tokens and cost do not change if the machine is busy. Wall-clock does, and
 * the whole matrix ran at concurrency 3 on one laptop, so these numbers carry a
 * noise floor nothing here can quantify. That is the reason for a separate
 * module and a separate opt-in flag rather than four more columns in the main
 * condition table: a reader who has not been told about the concurrency cannot
 * safely read a duration next to a token count, and putting them side by side
 * invites exactly that.
 *
 * What IS comparatively safe here is the per-tool-call latency: a tool call's
 * duration is dominated by the tool, not by how many sessions share the CPU,
 * and the arms interleave throughout the run so scheduling noise lands on all
 * of them alike. That is the number the `--speed` section exists for — is
 * querying a prebuilt index actually faster than reading files, per call.
 */

/** Tool groups reported separately, in the order they are printed. */
export const TOOL_GROUPS = [
  "mempalace_search",
  "other MCP",
  "Bash(graphify)",
  "Read",
  "Grep",
  "Glob",
  "Bash",
  "Agent",
] as const;
export type ToolGroup = (typeof TOOL_GROUPS)[number];

const GRAPHIFY_CALL_RE = /(?:^|[;&|(]|&&|\|\|)\s*(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)*(?:\S*\/)?graphify\s/;

/**
 * Bucket one tool call. `Bash` splits on whether it invoked graphify, exactly
 * as `collect.ts::classifyToolCall` does, so a latency row and a call-count row
 * for the same label describe the same set of calls.
 */
export function toolGroup(name: string, input: unknown): ToolGroup | null {
  if (name === "mcp__mempalace__mempalace_search") return "mempalace_search";
  if (name.startsWith("mcp__")) return "other MCP";
  if (name === "Bash") {
    const command = (input as { command?: unknown } | undefined)?.command;
    return typeof command === "string" && GRAPHIFY_CALL_RE.test(command.trim()) ? "Bash(graphify)" : "Bash";
  }
  if (name === "Read" || name === "Grep" || name === "Glob" || name === "Agent") return name;
  return null;
}

function parseTs(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Per-tool-call latencies, in ms, from one transcript.
 *
 * A call is timed from the entry carrying its `tool_use` block to the entry
 * carrying the matching `tool_result`. Both are written locally by the same
 * process, so the pair is a self-consistent interval even though the absolute
 * clock is not meaningful. Calls whose result never arrived (the run hit its
 * turn cap mid-call) are simply absent rather than counted as zero.
 */
export function parseToolLatencies(jsonl: string): Record<string, number[]> {
  const pending = new Map<string, { group: ToolGroup; at: number }>();
  const out: Record<string, number[]> = {};
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const at = parseTs(row.timestamp);
    const content = (row.message as { content?: unknown } | undefined)?.content;
    if (at === null || !Array.isArray(content)) continue;
    for (const rawBlock of content) {
      const block = rawBlock as Record<string, unknown>;
      if (block.type === "tool_use") {
        const name = typeof block.name === "string" ? block.name : "";
        const id = typeof block.id === "string" ? block.id : "";
        const group = toolGroup(name, block.input);
        if (group && id) pending.set(id, { group, at });
      } else if (block.type === "tool_result") {
        const id = typeof block.tool_use_id === "string" ? block.tool_use_id : "";
        const started = pending.get(id);
        if (!started) continue;
        pending.delete(id);
        // Clock skew inside one process should be impossible, but a negative
        // interval would silently drag a median down, so drop it rather than
        // report a tool that finished before it started.
        const dt = at - started.at;
        if (dt >= 0) (out[started.group] ??= []).push(dt);
      }
    }
  }
  return out;
}

/**
 * Milliseconds from the transcript's first entry to the first one advertising a
 * tool from `prefix`.
 *
 * This is NOT the MCP server's startup cost, and the report must not present it
 * as one: Claude Code connects its configured servers before it writes the
 * first transcript entry, so by the time anything is recorded the server is
 * already up and the measured delta collapses to a few milliseconds of
 * bookkeeping. The startup cost lands earlier, in `time_to_request_ms`, which
 * covers everything before the first API request. Both are reported so the
 * distinction is visible instead of being quietly resolved the wrong way.
 */
export function mcpAnnounceDelayMs(jsonl: string, prefix: string): number | null {
  let start: number | null = null;
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
    const at = parseTs(row.timestamp);
    if (at === null) continue;
    if (start === null) start = at;
    const added = (row.attachment as { addedNames?: unknown } | undefined)?.addedNames;
    if (!Array.isArray(added)) continue;
    if (added.some((n) => typeof n === "string" && n.startsWith(prefix))) return at - start;
  }
  return null;
}

/** Session-level timings, straight from the run's own `result.json`. */
export interface RunSpeed {
  duration_ms: number | null;
  duration_api_ms: number | null;
  ttft_ms: number | null;
  /** Everything before the first API request — where MCP server startup lands. */
  time_to_request_ms: number | null;
  latencies: Record<string, number[]>;
  mcp_announce_ms: number | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Read one run's speed data.
 *
 * Deliberately reads `result.json` and `transcript.jsonl` rather than
 * `metrics.json`: `ttft_ms` and `time_to_request_ms` were never collected into
 * the metrics file, and back-filling them would mean rewriting the metrics of
 * every already-committed measurement set. The raw artifacts are committed for
 * every run, so the older sets can be read for speed without being touched.
 */
export function speedForRun(runDir: string, mcpPrefix = "mcp__mempalace__"): RunSpeed {
  let result: ClaudeResult | null = null;
  try {
    result = JSON.parse(fs.readFileSync(path.join(runDir, "result.json"), "utf8")) as ClaudeResult;
  } catch {
    result = null;
  }
  const transcriptFile = path.join(runDir, "transcript.jsonl");
  let jsonl = "";
  try {
    jsonl = fs.existsSync(transcriptFile) ? fs.readFileSync(transcriptFile, "utf8") : "";
  } catch {
    jsonl = "";
  }
  return {
    duration_ms: num(result?.duration_ms),
    duration_api_ms: num(result?.duration_api_ms),
    ttft_ms: num((result as Record<string, unknown> | null)?.ttft_ms),
    time_to_request_ms: num((result as Record<string, unknown> | null)?.time_to_request_ms),
    latencies: jsonl ? parseToolLatencies(jsonl) : {},
    mcp_announce_ms: jsonl ? mcpAnnounceDelayMs(jsonl, mcpPrefix) : null,
  };
}

export interface Spread {
  n: number;
  median: number | null;
  q1: number | null;
  q3: number | null;
}

export function spread(xs: readonly number[]): Spread {
  return { n: xs.length, median: median(xs), q1: quantile(xs, 0.25), q3: quantile(xs, 0.75) };
}

export interface ConditionSpeed {
  condition: string;
  runs: number;
  duration_ms: Spread;
  duration_api_ms: Spread;
  ttft_ms: Spread;
  time_to_request_ms: Spread;
  /** Tool group -> latency spread over every call of that group in the arm. */
  tools: Record<string, Spread>;
  mcp_announce_ms: Spread;
}

/** Aggregate per-run speed into one row per condition. */
export function summarizeSpeed(runs: Array<{ condition: string; speed: RunSpeed }>): ConditionSpeed[] {
  const byCondition = new Map<string, RunSpeed[]>();
  for (const r of runs) {
    const list = byCondition.get(r.condition) ?? [];
    list.push(r.speed);
    byCondition.set(r.condition, list);
  }
  const defined = (xs: Array<number | null>): number[] => xs.filter((v): v is number => v !== null);
  return [...byCondition.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([condition, list]) => {
      const tools: Record<string, Spread> = {};
      for (const group of TOOL_GROUPS) {
        // Pooled over calls, not over per-run medians: a run that made twelve
        // Reads says more about Read latency than one that made a single call,
        // and the question is per-call cost rather than per-run behaviour.
        const all = list.flatMap((s) => s.latencies[group] ?? []);
        if (all.length > 0) tools[group] = spread(all);
      }
      return {
        condition,
        runs: list.length,
        duration_ms: spread(defined(list.map((s) => s.duration_ms))),
        duration_api_ms: spread(defined(list.map((s) => s.duration_api_ms))),
        ttft_ms: spread(defined(list.map((s) => s.ttft_ms))),
        time_to_request_ms: spread(defined(list.map((s) => s.time_to_request_ms))),
        tools,
        mcp_announce_ms: spread(defined(list.map((s) => s.mcp_announce_ms))),
      };
    });
}
