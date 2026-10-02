import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ClaudePInvocation, ClaudeResult } from "./claude-p.js";
import { GROK_MODEL } from "../conditions.js";

export { GROK_MODEL };

/**
 * Grok Build headless runner.
 *
 * `grok -p --output-format streaming-messages-json` emits Claude-shaped
 * transcript lines plus a terminal `result`. The harness keeps that result,
 * with two corrections the stream does not make for us:
 *
 * - A reported cost of 0 alongside real token usage is the stream's fallback
 *   for an unpriced call, not a free run. The cost field is then omitted.
 * - User skills, rules, plugins and MCP servers are turned off. Claude arms
 *   pass `--setting-sources project` for the same reason. Bundled Grok skills
 *   stay; they are part of the product, as Claude Code's built-ins are.
 *
 * Grok has no `--max-budget-usd`. The turn cap is the one the set already uses.
 * There is no xhigh arm: that effort was declined for this comparison.
 */
export const GROK_BIN = process.env.BENCH_GROK_BIN || "grok";
export const GROK_EFFORTS = ["low", "medium", "high"] as const;
export type GrokEffort = (typeof GROK_EFFORTS)[number];

/** Skill names `grok inspect` reported as bundled on grok 1.0.46. Anything else is a leak. */
export const GROK_BUNDLED_SKILLS = [
  "build-with-ai",
  "code-review",
  "create-skill",
  "create-workflow",
  "design",
  "docx",
  "execute-plan",
  "game-assets",
  "imagine",
  "implement",
  "learn",
  "long-running-background-tasks",
  "pdf",
  "pptx",
  "pr-babysit",
  "resume-claude",
  "resume-codex",
  "resume-cursor",
  "review",
  "skill-design-principles",
  "statusline",
  "threejs-frame-conventions",
] as const;

const BUNDLED = new Set<string>(GROK_BUNDLED_SKILLS);

/** Plugins discovered from this machine's ~/.claude when compat is on. Named so the isolated config can skip them. */
const USER_PLUGINS = [
  "claude-md-management",
  "frontend-design",
  "code-simplifier",
  "magi",
  "superpowers",
  "genshijin",
  "obsidian",
  "example-skills",
  "document-skills",
];

export function isGrokModel(model: string): boolean {
  return model === GROK_MODEL || model.startsWith("grok-");
}

export function unexpectedSkills(skills: readonly string[]): string[] {
  return skills.filter((name) => {
    // The init line tags product skills as `bundled:<name>`. Those are the
    // Grok Build defaults, not the user's Claude skills.
    if (name.startsWith("bundled:")) return false;
    return !BUNDLED.has(name);
  });
}

const COMPAT_OFF: Record<string, string> = {
  GROK_CLAUDE_SKILLS_ENABLED: "false",
  GROK_CLAUDE_RULES_ENABLED: "false",
  GROK_CLAUDE_AGENTS_ENABLED: "false",
  GROK_CLAUDE_MCPS_ENABLED: "false",
  GROK_CLAUDE_HOOKS_ENABLED: "false",
  GROK_CURSOR_SKILLS_ENABLED: "false",
  GROK_CURSOR_RULES_ENABLED: "false",
  GROK_CURSOR_AGENTS_ENABLED: "false",
  GROK_CURSOR_MCPS_ENABLED: "false",
  GROK_CURSOR_HOOKS_ENABLED: "false",
};

/** Env for one measured process. Drops the parent session so a bench run cannot join this conversation. */
export function grokChildEnv(base: NodeJS.ProcessEnv, home: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, ...COMPAT_OFF, GROK_HOME: home };
  for (const key of ["GROK_SESSION_ID", "GROK_AGENT", "GROK_LEADER_SOCKET", "GROK_LEADER_PID"]) delete env[key];
  return env;
}

export function grokArgs(o: {
  prompt: string;
  sessionId: string;
  model: string;
  effort?: string;
  maxTurns?: number;
  leaderSocket: string;
}): string[] {
  const args = [
    "-p",
    o.prompt,
    "--output-format",
    "streaming-messages-json",
    "--model",
    o.model,
    "--verbatim",
    "--trust",
    "--no-auto-update",
    "--permission-mode",
    "bypassPermissions",
    "--session-id",
    o.sessionId,
    "--leader-socket",
    o.leaderSocket,
  ];
  if (o.effort) args.push("--effort", o.effort);
  if (o.maxTurns !== undefined) args.push("--max-turns", String(o.maxTurns));
  return args;
}

function configToml(): string {
  const disabled = USER_PLUGINS.map((name) => `"${name}"`).join(", ");
  return `[cli]
use_leader = false

[compat.claude]
skills = false
rules = false
agents = false
mcps = false
hooks = false
sessions = false

[compat.cursor]
skills = false
rules = false
agents = false
mcps = false
hooks = false
sessions = false

[compat.codex]
sessions = false

[plugins]
disabled = [${disabled}]
`;
}

/** A fresh Grok home: this login's credentials, no user rules, skills, or plugins. */
export function prepareGrokHome(home: string): void {
  const auth = path.join(os.homedir(), ".grok", "auth.json");
  if (!fs.existsSync(auth)) throw new Error(`grok credentials not found: ${auth}`);
  fs.mkdirSync(home, { recursive: true });
  const link = path.join(home, "auth.json");
  if (!fs.existsSync(link)) fs.symlinkSync(auth, link);
  fs.writeFileSync(path.join(home, "config.toml"), configToml());
}

interface StreamRow {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  session_id?: string;
  num_turns?: number;
  duration_ms?: number;
  duration_api_ms?: number;
  total_cost_usd?: number;
  usage?: ClaudeResult["usage"] & { reasoning_tokens?: number };
  modelUsage?: ClaudeResult["modelUsage"];
  skills?: string[];
  message?: { content?: Array<Record<string, unknown>> };
}

function tokenTotal(usage: StreamRow["usage"]): number {
  if (!usage) return 0;
  return (
    (usage.input_tokens ?? 0) +
    (usage.output_tokens ?? 0) +
    (usage.cache_read_input_tokens ?? 0) +
    (usage.cache_creation_input_tokens ?? 0)
  );
}

/**
 * Reduce a streaming-messages-json log to the Claude result the rest of the harness reads.
 * `wallMs` fills duration when the process died before a result line.
 */
export function parseGrokStream(stdout: string, wallMs: number, timedOut: boolean): {
  result: ClaudeResult | null;
  parseError: string | null;
  skills: string[];
  leakedSkills: string[];
  subagents: number;
} {
  const rows: StreamRow[] = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as StreamRow);
    } catch {
      /* a torn last line is not a result */
    }
  }
  const init = rows.find((row) => row.type === "system" && row.subtype === "init");
  const skills = Array.isArray(init?.skills) ? init.skills.filter((s) => typeof s === "string") : [];
  const leakedSkills = unexpectedSkills(skills);
  let subagents = 0;
  for (const row of rows) {
    if (row.type !== "assistant" || !Array.isArray(row.message?.content)) continue;
    for (const block of row.message.content) {
      if (block.type === "tool_use" && block.name === "spawn_subagent") subagents += 1;
    }
  }
  const terminal = [...rows].reverse().find((row) => row.type === "result");
  if (!terminal) {
    return {
      result: timedOut
        ? {
            type: "result",
            subtype: "error",
            is_error: true,
            terminal_reason: "wall_timeout",
            duration_ms: wallMs,
            result: "",
          }
        : null,
      parseError: timedOut ? null : "no result line in grok streaming-messages-json",
      skills,
      leakedSkills,
      subagents,
    };
  }
  const usage = terminal.usage ? { ...terminal.usage } : undefined;
  if (usage && usage.reasoning_tokens != null && !usage.output_tokens_details) {
    usage.output_tokens_details = { thinking_tokens: usage.reasoning_tokens };
  }
  const text = typeof terminal.result === "string" ? terminal.result : "";
  // A finished answer often names a product's rate limit. That prose is not an
  // account quota. Only a failed turn is allowed to pause the matrix.
  const failed =
    terminal.is_error === true ||
    (typeof terminal.subtype === "string" && terminal.subtype !== "success");
  let terminalReason = "completed";
  if (timedOut) terminalReason = "wall_timeout";
  else if (terminal.subtype === "error_max_turns") terminalReason = "error_max_turns";
  else if (failed) terminalReason = "api_error";
  const tokens = tokenTotal(usage);
  const reported = typeof terminal.total_cost_usd === "number" ? terminal.total_cost_usd : undefined;
  const cost = reported === 0 && tokens > 0 ? undefined : reported;
  const modelUsage = terminal.modelUsage ? { ...terminal.modelUsage } : undefined;
  if (cost === undefined && modelUsage) {
    for (const row of Object.values(modelUsage)) {
      if (row && typeof row === "object" && "costUSD" in row) delete row.costUSD;
    }
  }
  const result: ClaudeResult = {
    type: "result",
    subtype: terminal.subtype,
    is_error: terminalReason !== "completed",
    terminal_reason: terminalReason,
    duration_ms: typeof terminal.duration_ms === "number" ? terminal.duration_ms : wallMs,
    duration_api_ms: terminal.duration_api_ms,
    num_turns: terminal.num_turns,
    result: text,
    session_id: terminal.session_id,
    total_cost_usd: cost,
    usage,
    modelUsage,
    subagent_stats: { spawned: subagents },
    runtime: "grok",
    cost_basis: cost == null ? "unreported" : "grok_reported",
    requested_model: GROK_MODEL,
  };
  if (leakedSkills.length > 0) {
    result.is_error = true;
    result.terminal_reason = "config_error";
    result.subtype = "error";
  }
  return { result, parseError: null, skills, leakedSkills, subagents };
}

export interface GrokPOptions {
  prompt: string;
  cwd: string;
  sessionId: string;
  model: string;
  effort?: string;
  maxTurns?: number;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

export async function runGrokP(o: GrokPOptions): Promise<ClaudePInvocation & { skills: string[]; leakedSkills: string[] }> {
  const home = path.join(os.tmpdir(), "bench-grok-home", o.sessionId);
  prepareGrokHome(home);
  const leaderSocket = path.join(home, "leader.sock");
  const argv = grokArgs({ ...o, leaderSocket });
  const env = grokChildEnv(o.env ?? process.env, home);
  const started = Date.now();
  return await new Promise((resolve) => {
    const child = spawn(GROK_BIN, argv, {
      cwd: o.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, o.timeoutMs ?? 30 * 60_000);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      clearTimeout(timer);
      const parsed = parseGrokStream(stdout, Date.now() - started, timedOut);
      if (parsed.leakedSkills.length > 0) {
        stderr += `\nuser skills leaked into the grok session: ${parsed.leakedSkills.join(", ")}`;
      }
      resolve({
        argv,
        exitCode,
        signal,
        stdout,
        stderr,
        timedOut,
        result: parsed.result,
        parseError: parsed.parseError,
        wallMs: Date.now() - started,
        skills: parsed.skills,
        leakedSkills: parsed.leakedSkills,
      });
    };
    child.on("error", (err) => {
      stderr += `\nspawn error: ${String(err)}`;
      finish(null, null);
    });
    child.on("close", finish);
  });
}
