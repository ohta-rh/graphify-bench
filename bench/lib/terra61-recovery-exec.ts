import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CODEX_BIN, codexArgs, type TerraEffort } from "./terra61-exec.js";
export { CODEX_BIN, TERRA61_MODEL, TERRA61_EFFORTS, TERRA61_PRICING, parseCodexEvents, quotaResetAt } from "./terra61-exec.js";
export type { TerraEffort } from "./terra61-exec.js";

/** Recovery protocol only: no solver deadline; preserve evidence during suspension/crash. */
export async function runCodex(cwd: string, effort: TerraEffort, prompt: string, evidenceDir: string,
  command = CODEX_BIN, overrideArgs?: string[], heartbeatMs = 30_000) {
  const argv = overrideArgs ?? codexArgs(cwd, effort);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const started = Date.now();
  const events = fs.openSync(path.join(evidenceDir, "events.live.jsonl"), "w");
  const errors = fs.openSync(path.join(evidenceDir, "stderr.live.txt"), "w");
  let stdout = "", stderr = "", lastOutputAt = started, previousHeartbeat = started;
  const gaps: Array<{ observed_at: string; heartbeat_gap_ms: number }> = [];
  const status = (state: string, extra: Record<string, unknown> = {}) => {
    const now = Date.now();
    fs.writeFileSync(path.join(evidenceDir, "live-status.json"), JSON.stringify({ state,
      pid: child.pid, started_at: new Date(started).toISOString(), checked_at: new Date(now).toISOString(),
      wall_ms: now - started, output_idle_ms: now - lastOutputAt, wall_cap_ms: null,
      host_scheduling_gaps: gaps, ...extra }, null, 2) + "\n");
  };
  const child = spawn(command, argv, { cwd, env: process.env, stdio: ["pipe", "pipe", "pipe"], detached: true });
  status("running");
  const heartbeat = setInterval(() => {
    const now = Date.now();
    if (now - previousHeartbeat > Math.max(60_000, heartbeatMs * 3)) {
      gaps.push({ observed_at: new Date(now).toISOString(), heartbeat_gap_ms: now - previousHeartbeat });
    }
    previousHeartbeat = now;
    status("running");
  }, heartbeatMs);
  child.stdout.on("data", (c: Buffer) => { stdout += c.toString(); fs.writeSync(events, c); lastOutputAt = Date.now(); });
  child.stderr.on("data", (c: Buffer) => { stderr += c.toString(); fs.writeSync(errors, c); lastOutputAt = Date.now(); });
  child.stdin.on("error", () => {});
  child.stdin.end(prompt);
  child.on("error", e => { stderr += String(e); fs.writeSync(errors, String(e)); });
  return await new Promise<{ argv: string[]; stdout: string; stderr: string; wallMs: number;
    exitCode: number | null; timedOut: boolean }>(resolve => {
    child.on("close", exitCode => {
      clearInterval(heartbeat);
      status("exited", { exit_code: exitCode });
      fs.closeSync(events); fs.closeSync(errors);
      resolve({ argv, stdout, stderr, wallMs: Date.now() - started, exitCode, timedOut: false });
    });
  });
}
