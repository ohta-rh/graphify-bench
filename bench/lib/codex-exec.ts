import { spawn } from "node:child_process";
import type { ClaudeResult } from "./claude-p.js";

export const SOL61_MODEL = "gpt-6.1-sol";
export const SOL61_EFFORTS = ["low", "medium", "high"] as const;
export type SolEffort = typeof SOL61_EFFORTS[number];
export const CODEX_BIN = process.env.BENCH_CODEX_BIN || "/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex";
export const SOL61_PRICING = { input: 2, cached: 0.1, write: 2.5, output: 10,
  source: "https://developers.openai.com/api/docs/models/gpt-6.1-sol", date: "2026-09-30" };

/** Codex's quota message uses the local CLI clock (Asia/Tokyo for this experiment). */
export function quotaResetAt(message: string, now: number, explicitReset = 0): number {
  const match = message.match(/try again at\s+(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
  if (match) {
    const rawHour = Number(match[1]), minute = Number(match[2]);
    if (rawHour >= 1 && rawHour <= 12 && minute < 60) {
      const hour = rawHour % 12 + (match[3]!.toUpperCase() === "PM" ? 12 : 0);
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const part = (type: string) => parts.find(p => p.type === type)!.value;
      let reset = Date.parse(`${part("year")}-${part("month")}-${part("day")}T${String(hour).padStart(2, "0")}:${match[2]}:00+09:00`);
      if (reset <= now) reset += 24 * 60 * 60_000;
      return Math.max(reset, explicitReset > now ? explicitReset : 0);
    }
  }
  return explicitReset > now ? explicitReset : now + 30 * 60_000;
}

export function codexArgs(cwd: string, effort: SolEffort): string[] {
  return ["--no-daemon", "exec", "--ignore-user-config", "--ephemeral", "--skip-git-repo-check",
    "--json", "--color", "never", "-s", "workspace-write", "-c", 'approval_policy="never"',
    "-c", `model_reasoning_effort="${effort}"`, "-c", 'web_search="disabled"',
    "-c", "features.multi_agent=false", "-m", SOL61_MODEL, "-C", cwd, "-"];
}

/** Retain native events; normalize only fields with matching semantics for existing graders. */
export function parseCodexEvents(jsonl: string, wallMs: number) {
  const events: any[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    try { events.push(JSON.parse(line)); } catch { /* a truncated last line is not completion */ }
  }
  const terminal = events.findLast(e => e.type === "turn.completed" || e.type === "turn.failed");
  const usage = terminal?.type === "turn.completed" ? terminal.usage : null;
  const completed = terminal?.type === "turn.completed" && usage &&
    [usage.input_tokens, usage.cached_input_tokens, usage.output_tokens].every(v => Number.isFinite(v));
  const input = completed ? usage.input_tokens : null;
  const cached = completed ? usage.cached_input_tokens : null;
  const write = completed ? (usage.cache_write_input_tokens ?? 0) : null;
  const output = completed ? usage.output_tokens : null;
  const uncached = completed ? input - cached - write : null;
  if (completed && (uncached! < 0 || cached < 0 || write < 0 || output < 0)) throw new Error("invalid Codex token usage");
  const cost = completed ? (uncached! * SOL61_PRICING.input + cached * SOL61_PRICING.cached +
    write * SOL61_PRICING.write + output * SOL61_PRICING.output) / 1e6 : null;
  const items = events.filter(e => e.type === "item.completed").map(e => e.item);
  const messages = items.filter(i => i?.type === "agent_message");
  const answer = messages.at(-1)?.text ?? "";
  const normalized: any[] = [];
  for (const item of items) {
    if (item.type === "command_execution") {
      normalized.push({ type: "assistant", message: { content: [{ type: "tool_use", id: item.id,
        name: "Bash", input: { command: item.command } }] } });
      normalized.push({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: item.id,
        content: item.aggregated_output ?? "" }] } });
    } else if (item.type === "file_change") {
      normalized.push({ type: "assistant", message: { content: [{ type: "tool_use", id: item.id,
        name: "Edit", input: { changes: item.changes } }] } });
    } else if (item.type === "agent_message") {
      normalized.push({ type: "assistant", message: { content: [{ type: "text", text: item.text }] } });
    }
  }
  const result: ClaudeResult = {
    type: "result", subtype: completed ? "success" : "error", is_error: !completed,
    terminal_reason: completed ? "completed" : "api_error", result: answer,
    session_id: events.find(e => e.type === "thread.started")?.thread_id,
    duration_ms: wallMs, total_cost_usd: cost ?? undefined,
    // Codex emits one user turn, not the model/API turn count used by Claude Code.
    // Leave num_turns absent rather than reporting a misleading 1.
    usage: completed ? { input_tokens: uncached!, output_tokens: output,
      cache_creation_input_tokens: write, cache_read_input_tokens: cached,
      output_tokens_details: { thinking_tokens: usage.reasoning_output_tokens } } : undefined,
    modelUsage: completed ? { [SOL61_MODEL]: { inputTokens: uncached!, outputTokens: output,
      cacheReadInputTokens: cached, cacheCreationInputTokens: write, costUSD: cost! } } : undefined,
    subagent_stats: { spawned: 0 },
    runtime: "codex", cost_basis: "estimated_standard_list_price", native_usage: usage,
  };
  return { result, completed: Boolean(completed), nativeUsage: usage,
    normalizedTranscript: normalized.map(e => JSON.stringify(e)).join("\n") + "\n",
    error: completed ? null : JSON.stringify(terminal?.error ?? events.filter(e => e.type === "error").at(-1) ?? "no completed turn") };
}

export async function runCodex(cwd: string, effort: SolEffort, prompt: string) {
  const argv = codexArgs(cwd, effort);
  const started = Date.now();
  return await new Promise<{ argv: string[]; stdout: string; stderr: string; wallMs: number;
    exitCode: number | null; timedOut: boolean }>((resolve) => {
    const child = spawn(CODEX_BIN, argv, { cwd, env: process.env, stdio: ["pipe", "pipe", "pipe"], detached: true });
    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid!, "SIGKILL"); } catch { child.kill("SIGKILL"); }
    }, 30 * 60_000);
    child.stdout.on("data", c => { stdout += c.toString(); });
    child.stderr.on("data", c => { stderr += c.toString(); });
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
    child.on("error", e => { stderr += String(e); });
    child.on("close", exitCode => {
      clearTimeout(timer);
      resolve({ argv, stdout, stderr, wallMs: Date.now() - started, exitCode, timedOut });
    });
  });
}
