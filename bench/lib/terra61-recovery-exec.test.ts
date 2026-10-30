import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCodex } from "./terra61-recovery-exec.js";

describe("Terra timeout recovery process", () => {
  it("persists output while a solver is still running, then retains its terminal event", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terra-recovery-test-"));
    try {
      const script = 'process.stdout.write("first\\n");setTimeout(()=>{process.stderr.write("diagnostic\\n");process.stdout.write(JSON.stringify({type:"turn.completed",usage:{input_tokens:1,cached_input_tokens:0,output_tokens:1}})+"\\n")},400)';
      const pending = runCodex(dir, "low", "prompt", dir, process.execPath, ["-e", script], 20);
      for (let i = 0; i < 100 && !fs.readFileSync(path.join(dir, "events.live.jsonl"), "utf8").includes("first"); i++) {
        await new Promise(r => setTimeout(r, 10));
      }
      expect(fs.readFileSync(path.join(dir, "events.live.jsonl"), "utf8")).toContain("first");
      expect(JSON.parse(fs.readFileSync(path.join(dir, "live-status.json"), "utf8")).state).toBe("running");
      const result = await pending;
      expect(result.exitCode).toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.stdout).toContain('"turn.completed"');
      expect(fs.readFileSync(path.join(dir, "stderr.live.txt"), "utf8")).toContain("diagnostic");
      expect(JSON.parse(fs.readFileSync(path.join(dir, "live-status.json"), "utf8")).wall_cap_ms).toBeNull();
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  it("records startup failures without inventing a timeout or completion", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "terra-recovery-test-"));
    try {
      const result = await runCodex(dir, "low", "prompt", dir, "/nonexistent/terra-recovery-test");
      expect(result.exitCode).not.toBe(0);
      expect(result.timedOut).toBe(false);
      expect(result.stderr).toContain("ENOENT");
      expect(result.stdout).toBe("");
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
