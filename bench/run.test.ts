import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { mcpToolsFromTranscript, provisionMcp } from "./run.js";
import type { ConditionSpec } from "./conditions.js";

const temps: string[] = [];
function tmpRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bench-run-test-"));
  temps.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/** A repo root with a fake pre-built index and a fake server executable. */
function fixture(): { repoRoot: string; exe: string; spec: ConditionSpec } {
  const repoRoot = tmpRoot();
  const index = path.join(repoRoot, ".palaces", "palace-v1");
  fs.mkdirSync(path.join(index, "sub"), { recursive: true });
  fs.writeFileSync(path.join(index, "chroma.sqlite3"), "index-bytes");
  fs.writeFileSync(path.join(index, "sub", "segment.bin"), "more");

  const exe = path.join(repoRoot, "mempalace-mcp");
  fs.writeFileSync(exe, "#!/bin/sh\n");
  fs.chmodSync(exe, 0o755);

  return {
    repoRoot,
    exe,
    spec: {
      name: "mempalace",
      overlays: ["mempalace"],
      mcp: {
        name: "mempalace",
        command: exe,
        args: ["--palace", "${PALACE}"],
        envTemplate: { MEMPALACE_PALACE_PATH: "${PALACE}" },
        resourceDir: ".palaces/palace-v1",
        exeEnvHint: "MEMPALACE_MCP_EXE",
      },
    },
  };
}

describe("provisionMcp", () => {
  it("returns null for an arm with no MCP block", () => {
    expect(provisionMcp({ name: "baseline", overlays: ["baseline"] }, tmpRoot(), tmpRoot())).toBeNull();
  });

  it("clones the index into the run's own directory rather than sharing it", () => {
    const { repoRoot, spec } = fixture();
    const mcpDir = path.join(tmpRoot(), "run.mcp");
    const out = provisionMcp(spec, mcpDir, repoRoot)!;

    expect(out.provision.palace_dir).toBe(path.join(mcpDir, "palace"));
    expect(fs.readFileSync(path.join(out.provision.palace_dir, "chroma.sqlite3"), "utf8")).toBe("index-bytes");
    // ChromaDB opens its sqlite read-write even to answer a query, so a clone
    // that aliased the source would make three concurrent runs three writers.
    fs.writeFileSync(path.join(out.provision.palace_dir, "chroma.sqlite3"), "mutated");
    expect(fs.readFileSync(path.join(repoRoot, ".palaces/palace-v1/chroma.sqlite3"), "utf8")).toBe("index-bytes");
  });

  it("renders a config whose palace path is the clone, in both arg and env", () => {
    const { repoRoot, spec } = fixture();
    const mcpDir = path.join(tmpRoot(), "run.mcp");
    const out = provisionMcp(spec, mcpDir, repoRoot)!;
    const config = JSON.parse(fs.readFileSync(out.provision.config_file, "utf8")) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    const server = config.mcpServers.mempalace!;
    expect(server.args).toEqual(["--palace", out.provision.palace_dir]);
    expect(server.env.MEMPALACE_PALACE_PATH).toBe(out.provision.palace_dir);
    expect(out.env.MEMPALACE_PALACE_PATH).toBe(out.provision.palace_dir);
  });

  it("passes --strict-mcp-config so the host's own servers cannot leak in", () => {
    const { repoRoot, spec } = fixture();
    const out = provisionMcp(spec, path.join(tmpRoot(), "run.mcp"), repoRoot)!;
    expect(out.extraArgs[0]).toBe("--mcp-config");
    expect(out.extraArgs[1]).toBe(out.provision.config_file);
    expect(out.extraArgs[2]).toBe("--strict-mcp-config");
  });

  it("records a content hash and size that identify the index", () => {
    const { repoRoot, spec } = fixture();
    const a = provisionMcp(spec, path.join(tmpRoot(), "a.mcp"), repoRoot)!;
    const b = provisionMcp(spec, path.join(tmpRoot(), "b.mcp"), repoRoot)!;
    expect(a.provision.source_files).toBe(2);
    expect(a.provision.source_bytes).toBe("index-bytes".length + "more".length);
    // Same index, different run directory: the hash must not move.
    expect(b.provision.source_hash).toBe(a.provision.source_hash);

    fs.writeFileSync(path.join(repoRoot, ".palaces/palace-v1/chroma.sqlite3"), "different");
    const c = provisionMcp(spec, path.join(tmpRoot(), "c.mcp"), repoRoot)!;
    expect(c.provision.source_hash).not.toBe(a.provision.source_hash);
  });

  // A missing index or executable means the server never starts, and `claude -p`
  // exits 0 regardless — the arm would silently become an expensive baseline.
  it("refuses to run when the pre-built index is missing", () => {
    const { repoRoot, spec } = fixture();
    fs.rmSync(path.join(repoRoot, ".palaces"), { recursive: true });
    expect(() => provisionMcp(spec, path.join(tmpRoot(), "run.mcp"), repoRoot)).toThrow(/palace:build v1/);
  });

  it("refuses to run when the server executable is missing", () => {
    const { repoRoot, spec, exe } = fixture();
    fs.rmSync(exe);
    expect(() => provisionMcp(spec, path.join(tmpRoot(), "run.mcp"), repoRoot)).toThrow(/MEMPALACE_MCP_EXE/);
  });
});

describe("mcpToolsFromTranscript", () => {
  const line = (o: unknown): string => JSON.stringify(o);

  it("counts tools announced as deferred names", () => {
    const jsonl = line({
      attachment: { type: "deferred_tools_delta", addedNames: ["mcp__mempalace__mempalace_search", "WebFetch"] },
    });
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__")).toEqual({ count: 1, connected: true });
  });

  it("counts a tool that was called even if it was never announced", () => {
    const jsonl = line({
      type: "assistant",
      message: { content: [{ type: "tool_use", id: "t1", name: "mcp__mempalace__mempalace_search" }] },
    });
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__").connected).toBe(true);
  });

  it("counts each distinct tool once across announcement and use", () => {
    const jsonl = [
      line({ attachment: { addedNames: ["mcp__mempalace__a", "mcp__mempalace__b"] } }),
      line({ type: "assistant", message: { content: [{ type: "tool_use", id: "t", name: "mcp__mempalace__a" }] } }),
    ].join("\n");
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__").count).toBe(2);
  });

  // Observed: Haiku called `mcp__mempalace__memplacem_search`, transposing the
  // server's name. Counting the union of announced and called would report a
  // 46-tool server that never existed, so `count` is what was ADVERTISED.
  it("ignores a called tool the server never advertised", () => {
    const jsonl = [
      line({ attachment: { addedNames: ["mcp__mempalace__mempalace_search"] } }),
      line({
        type: "assistant",
        message: { content: [{ type: "tool_use", id: "t", name: "mcp__mempalace__memplacem_search" }] },
      }),
    ].join("\n");
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__").count).toBe(1);
  });

  // The failure this exists to catch: a run whose server never came up looks
  // exactly like a successful run except that no tool is ever mentioned.
  it("reports not-connected when the server contributed nothing", () => {
    const jsonl = [
      line({ attachment: { addedNames: ["mcp__other__thing", "WebSearch"] } }),
      line({ type: "assistant", message: { content: [{ type: "tool_use", id: "t", name: "Read" }] } }),
    ].join("\n");
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__")).toEqual({ count: 0, connected: false });
  });

  it("survives a malformed line rather than losing the whole transcript", () => {
    const jsonl = ["{not json", line({ attachment: { addedNames: ["mcp__mempalace__x"] } })].join("\n");
    expect(mcpToolsFromTranscript(jsonl, "mcp__mempalace__").count).toBe(1);
  });
});
