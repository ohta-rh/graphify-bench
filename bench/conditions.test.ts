import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONDITIONS,
  HAIKU_MODEL,
  assertRegistryMatchesDisk,
  conditionNames,
  effectiveEffort,
  effectiveModel,
  expandPalace,
  getCondition,
  mcpToolPrefix,
  overlayDirs,
  renderMcpConfig,
  resolveCondition,
} from "./conditions.js";
import { buildArgs } from "./lib/claude-p.js";
import { applyOverlay } from "./lib/copy.js";
import { REPO_ROOT } from "./lib/env.js";

const OVERLAYS = path.join(REPO_ROOT, "overlays");

describe("condition registry", () => {
  it("keeps the two original arms untouched: one overlay, no overrides", () => {
    for (const name of ["baseline", "graphify"]) {
      const spec = resolveCondition(name);
      expect(spec.overlays).toEqual([name]);
      expect(spec.model).toBeUndefined();
      expect(spec.extraClaudeArgs).toBeUndefined();
      expect(spec.env).toBeUndefined();
    }
  });

  it("layers graphify-strict on top of graphify rather than duplicating it", () => {
    expect(resolveCondition("graphify-strict").overlays).toEqual(["graphify", "graphify-strict"]);
  });

  it("gives baseline-nosub the same overlay as baseline and removes only the Agent tool", () => {
    const spec = resolveCondition("baseline-nosub");
    expect(spec.overlays).toEqual(["baseline"]);
    expect(spec.extraClaudeArgs).toEqual(["--disallowedTools", "Agent"]);
    expect(spec.model).toBeUndefined();
  });

  it("overrides only the model on the haiku arms", () => {
    for (const [name, overlay] of [
      ["haiku-baseline", "baseline"],
      ["haiku-graphify", "graphify"],
    ] as const) {
      const spec = resolveCondition(name);
      expect(spec.model).toBe(HAIKU_MODEL);
      expect(spec.overlays).toEqual([overlay]);
      expect(spec.extraClaudeArgs).toBeUndefined();
    }
  });

  it("pins the exact haiku model id the Director specified", () => {
    expect(HAIKU_MODEL).toBe("claude-haiku-4-5");
  });

  it("degrades an unregistered name to a same-named overlay", () => {
    expect(resolveCondition("some-adhoc-arm")).toEqual({ name: "some-adhoc-arm", overlays: ["some-adhoc-arm"] });
  });

  it("declares no duplicate names", () => {
    expect(new Set(conditionNames()).size).toBe(CONDITIONS.length);
  });

  it("names only overlay directories that exist in the repository", () => {
    for (const spec of CONDITIONS) {
      for (const dir of overlayDirs(spec, OVERLAYS)) {
        expect(fs.existsSync(dir), `${spec.name} -> ${dir}`).toBe(true);
      }
    }
  });

  it("resolves overlay directories in application order", () => {
    expect(overlayDirs(resolveCondition("graphify-strict"), "/o")).toEqual([
      path.join("/o", "graphify"),
      path.join("/o", "graphify-strict"),
    ]);
  });
});

describe("effectiveModel", () => {
  it("prefers the arm's override and otherwise falls through to the harness default", () => {
    expect(effectiveModel(resolveCondition("haiku-graphify"), "claude-sonnet-5")).toBe(HAIKU_MODEL);
    expect(effectiveModel(resolveCondition("graphify"), "claude-sonnet-5")).toBe("claude-sonnet-5");
  });
});

describe("arg assembly", () => {
  const base = { prompt: "p", cwd: "/tmp/x", sessionId: "sid", effort: "high", maxTurns: 60, maxBudgetUsd: 4 };

  it("appends the arm's extra args after the harness's own", () => {
    const spec = resolveCondition("baseline-nosub");
    const argv = buildArgs({ ...base, model: "claude-sonnet-5", extraArgs: spec.extraClaudeArgs });
    expect(argv.slice(-2)).toEqual(["--disallowedTools", "Agent"]);
    // --session-id must still be present and precede the arm's additions.
    expect(argv.indexOf("--session-id")).toBeGreaterThan(-1);
    expect(argv.indexOf("--session-id")).toBeLessThan(argv.indexOf("--disallowedTools"));
  });

  it("passes the arm's model through as --model", () => {
    const spec = resolveCondition("haiku-baseline");
    const argv = buildArgs({ ...base, model: effectiveModel(spec, "claude-sonnet-5") });
    expect(argv[argv.indexOf("--model") + 1]).toBe(HAIKU_MODEL);
    expect(argv).not.toContain("--disallowedTools");
  });

  it("produces byte-identical args to the pre-registry harness for an arm with no overrides", () => {
    const spec = resolveCondition("graphify");
    expect(buildArgs({ ...base, model: effectiveModel(spec, "claude-sonnet-5"), extraArgs: spec.extraClaudeArgs })).toEqual(
      buildArgs({ ...base, model: "claude-sonnet-5" }),
    );
  });
});

describe("graphify-strict overlay", () => {
  const settingsOf = (overlay: string): string =>
    fs.readFileSync(path.join(OVERLAYS, overlay, ".claude", "settings.json"), "utf8");

  it("differs from the graphify overlay by exactly the --strict flag", () => {
    expect(settingsOf("graphify-strict")).toBe(
      settingsOf("graphify").replace("hook-guard read", "hook-guard read --strict"),
    );
  });

  it("carries nothing but the settings delta, so the 4.6 MB graph is not duplicated", () => {
    const files = fs
      .readdirSync(path.join(OVERLAYS, "graphify-strict"), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.relative(path.join(OVERLAYS, "graphify-strict"), path.join(e.parentPath, e.name)));
    expect(files.sort()).toEqual([path.join(".claude", "settings.json"), "README.md"]);
  });
});

describe("graphify-strict-v2 overlay", () => {
  const settingsOf = (overlay: string): string =>
    fs.readFileSync(path.join(OVERLAYS, overlay, ".claude", "settings.json"), "utf8");

  it("layers on graphify-v2 rather than duplicating the 6.4 MB graph", () => {
    expect(resolveCondition("graphify-strict-v2").overlays).toEqual(["graphify-v2", "graphify-strict-v2"]);
  });

  it("differs from the graphify-v2 overlay by exactly the --strict flag", () => {
    expect(settingsOf("graphify-strict-v2")).toBe(
      settingsOf("graphify-v2").replace("hook-guard read", "hook-guard read --strict"),
    );
  });

  it("carries nothing but the settings delta", () => {
    const root = path.join(OVERLAYS, "graphify-strict-v2");
    const files = fs
      .readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => path.relative(root, path.join(e.parentPath, e.name)));
    expect(files.sort()).toEqual([path.join(".claude", "settings.json"), "README.md"]);
  });

  it("ships no .overlay-base marker: layering is declared in the registry only", () => {
    for (const spec of CONDITIONS) {
      for (const dir of overlayDirs(spec, OVERLAYS)) {
        expect(fs.existsSync(path.join(dir, ".overlay-base")), dir).toBe(false);
      }
    }
  });
});

describe("v2 arms", () => {
  it("registers graphify-v2 as a full overlay on the v2 corpus", () => {
    const spec = getCondition("graphify-v2");
    expect(spec.overlays).toEqual(["graphify-v2"]);
    expect(spec.corpus).toBe("v2");
    expect(spec.model).toBeUndefined();
    expect(spec.extraClaudeArgs).toBeUndefined();
  });

  it("registers haiku-graphify-v2 as the v2 graph run by the weak explorer", () => {
    const spec = getCondition("haiku-graphify-v2");
    expect(spec.overlays).toEqual(["graphify-v2"]);
    expect(spec.corpus).toBe("v2");
    expect(spec.model).toBe(HAIKU_MODEL);
    expect(spec.extraClaudeArgs).toBeUndefined();
    expect(spec.env).toBeUndefined();
  });

  it("pairs haiku-graphify-v2 with haiku-baseline: same model, overlay is the only difference", () => {
    const treatment = getCondition("haiku-graphify-v2");
    const reference = getCondition("haiku-baseline");
    expect(effectiveModel(treatment, "claude-sonnet-5")).toBe(effectiveModel(reference, "claude-sonnet-5"));
    expect(treatment.extraClaudeArgs).toEqual(reference.extraClaudeArgs);
    expect(treatment.overlays).not.toEqual(reference.overlays);
  });

  it("gives haiku-graphify-v2 the same overlay chain as its sonnet twin graphify-v2", () => {
    expect(getCondition("haiku-graphify-v2").overlays).toEqual(getCondition("graphify-v2").overlays);
  });

  it("keeps the v1 arms on the v1 corpus and the v2 arms on v2", () => {
    expect(getCondition("baseline").corpus).toBe("v1");
    expect(getCondition("graphify").corpus).toBe("v1");
    expect(getCondition("graphify-strict").corpus).toBe("v1");
    expect(getCondition("graphify-strict-v2").corpus).toBe("v2");
  });

  it("declares a corpus generation for every registered arm", () => {
    for (const spec of CONDITIONS) expect(spec.corpus, spec.name).toMatch(/^v[12]$/);
  });
});

describe("registry vs disk", () => {
  it("references every overlay directory on disk, and nothing that is not there", () => {
    const onDisk = fs
      .readdirSync(OVERLAYS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    const referenced = [...new Set(CONDITIONS.flatMap((c) => c.overlays))].sort();
    expect(referenced).toEqual(onDisk);
  });

  it("passes the disk consistency assertion", () => {
    expect(() => assertRegistryMatchesDisk(OVERLAYS)).not.toThrow();
  });

  it("fails loudly when a declared overlay directory is missing", () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "bench-overlays-"));
    expect(() => assertRegistryMatchesDisk(empty)).toThrow(/missing overlay directory/);
  });
});

describe("getCondition", () => {
  it("names the unknown condition and the registered ones when asked for a typo", () => {
    expect(() => getCondition("grahpify-v2")).toThrow(/grahpify-v2/);
    expect(() => getCondition("grahpify-v2")).toThrow(/baseline/);
  });

  it("returns the same spec as resolveCondition for a registered arm", () => {
    expect(getCondition("graphify-strict")).toEqual(resolveCondition("graphify-strict"));
  });
});

describe("applyOverlay with a delta chain", () => {
  it("lets the delta win on collision and inherits the rest from its base", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bench-overlay-"));
    const dest = path.join(root, "work");
    fs.mkdirSync(dest);

    const overlays = path.join(root, "overlays");
    const base = path.join(overlays, "base");
    fs.mkdirSync(path.join(base, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(base, ".claude", "settings.json"), '{"mode":"nudge"}');
    fs.writeFileSync(path.join(base, "big.json"), "inherited");

    const delta = path.join(overlays, "delta");
    fs.mkdirSync(path.join(delta, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(delta, ".claude", "settings.json"), '{"mode":"strict"}');

    for (const dir of overlayDirs({ name: "delta", overlays: ["base", "delta"] }, overlays)) {
      applyOverlay(dir, dest);
    }

    expect(fs.readFileSync(path.join(dest, ".claude", "settings.json"), "utf8")).toBe('{"mode":"strict"}');
    expect(fs.readFileSync(path.join(dest, "big.json"), "utf8")).toBe("inherited");
  });
});

describe("mempalace arms", () => {
  const MEMPALACE_ARMS = ["mempalace", "haiku-mempalace", "mempalace-v2", "haiku-mempalace-v2"];

  it("registers all four arms with the right model and corpus generation", () => {
    for (const name of MEMPALACE_ARMS) {
      const spec = getCondition(name);
      expect(spec.mcp).toBeDefined();
      expect(spec.model).toBe(name.startsWith("haiku-") ? HAIKU_MODEL : undefined);
      expect(spec.corpus).toBe(name.endsWith("-v2") ? "v2" : "v1");
    }
  });

  // The whole point of the v2 pair is that its index covers docs/. An arm
  // pointing at the v1 palace while its CLAUDE.md advertises documents would
  // measure a broken tool and read as "semantic search cannot find docs".
  it("points each arm at the palace built for its own corpus generation", () => {
    expect(getCondition("mempalace").mcp!.resourceDir).toBe(".palaces/palace-v1");
    expect(getCondition("haiku-mempalace").mcp!.resourceDir).toBe(".palaces/palace-v1");
    expect(getCondition("mempalace-v2").mcp!.resourceDir).toBe(".palaces/palace-v2");
    expect(getCondition("haiku-mempalace-v2").mcp!.resourceDir).toBe(".palaces/palace-v2");
  });

  it("uses the overlay whose CLAUDE.md matches its corpus generation", () => {
    expect(getCondition("mempalace").overlays).toEqual(["mempalace"]);
    expect(getCondition("haiku-mempalace").overlays).toEqual(["mempalace"]);
    expect(getCondition("mempalace-v2").overlays).toEqual(["mempalace-v2"]);
    expect(getCondition("haiku-mempalace-v2").overlays).toEqual(["mempalace-v2"]);
  });

  // The instruction surface must differ from baseline in exactly one place:
  // the appended section. Anything else and the pair stops isolating the index.
  it("ships baseline's instruction text verbatim plus one appended section", () => {
    const baseline = fs.readFileSync(path.join(OVERLAYS, "baseline", "CLAUDE.md"), "utf8");
    for (const overlay of ["mempalace", "mempalace-v2"]) {
      const text = fs.readFileSync(path.join(OVERLAYS, overlay, "CLAUDE.md"), "utf8");
      expect(text.startsWith(baseline)).toBe(true);
      expect(text.slice(baseline.length)).toContain("## mempalace");
      expect(text.slice(baseline.length)).toContain("mempalace_search");
    }
  });

  // `source_path` is baked into the palace at build time, so the root the
  // overlay tells the agent to strip must be the root build-palace.sh mined.
  it("states the index root its own generation was built at", () => {
    expect(fs.readFileSync(path.join(OVERLAYS, "mempalace", "CLAUDE.md"), "utf8")).toContain(
      "/tmp/mempalace-index/v1/taskflow/",
    );
    expect(fs.readFileSync(path.join(OVERLAYS, "mempalace-v2", "CLAUDE.md"), "utf8")).toContain(
      "/tmp/mempalace-index/v2/taskflow/",
    );
  });

  it("never mentions graphify — the arms must not prime each other", () => {
    for (const overlay of ["mempalace", "mempalace-v2"]) {
      expect(fs.readFileSync(path.join(OVERLAYS, overlay, "CLAUDE.md"), "utf8")).not.toMatch(/graphify/i);
    }
  });
});

describe("renderMcpConfig", () => {
  const spec = getCondition("mempalace").mcp!;

  it("expands ${PALACE} in the args and the env to the same directory", () => {
    const config = renderMcpConfig(spec, "/run/tmp/palace");
    expect(config.mcpServers.mempalace!.args).toEqual(["--palace", "/run/tmp/palace"]);
    expect(config.mcpServers.mempalace!.env).toEqual({ MEMPALACE_PALACE_PATH: "/run/tmp/palace" });
  });

  // The server name is what namespaces every tool in the transcript, which is
  // the only handle features.ts has for counting mempalace calls.
  it("keys the server under the name the transcript will use", () => {
    expect(Object.keys(renderMcpConfig(spec, "/p").mcpServers)).toEqual(["mempalace"]);
    expect(mcpToolPrefix(spec.name)).toBe("mcp__mempalace__");
  });

  it("leaves a string with no placeholder alone", () => {
    expect(expandPalace("--palace", "/p")).toBe("--palace");
    expect(expandPalace("${PALACE}/sub", "/p")).toBe("/p/sub");
  });

  it("omits env entirely when the arm declares none", () => {
    const bare = renderMcpConfig({ ...spec, envTemplate: undefined }, "/p");
    expect(bare.mcpServers.mempalace!.env).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Phase 10: runtime levers (no index, no tool — only how the CLI is invoked)
// ---------------------------------------------------------------------------

describe("runtime lever arms", () => {
  it("changes nothing but the effort flag on the effort-* arms", () => {
    for (const [name, effort] of [
      ["effort-medium", "medium"],
      ["effort-low", "low"],
    ] as const) {
      const spec = getCondition(name);
      expect(spec.overlays).toEqual(["baseline"]);
      expect(spec.effort).toBe(effort);
      expect(spec.model).toBeUndefined();
      expect(spec.extraClaudeArgs).toBeUndefined();
      expect(spec.env).toBeUndefined();
      expect(spec.mcp).toBeUndefined();
      expect(spec.corpus).toBe("v1");
    }
  });

  // The arms ship baseline's overlay, so `env.effort` in run.meta.json is the
  // ONLY thing separating an effort-low run directory from a baseline one.
  it("resolves the arm's effort over the harness default, and leaves other arms alone", () => {
    expect(effectiveEffort(getCondition("effort-medium"), "high")).toBe("medium");
    expect(effectiveEffort(getCondition("effort-low"), "high")).toBe("low");
    expect(effectiveEffort(getCondition("baseline"), "high")).toBe("high");
    expect(effectiveEffort(getCondition("haiku-explore"), "high")).toBe("high");
    // A harness default other than `high` still shows through for an arm that
    // declares no override — the override is the arm's value, not a constant.
    expect(effectiveEffort(getCondition("baseline"), "low")).toBe("low");
  });

  it("puts the resolved effort on the command line claude actually receives", () => {
    const argv = buildArgs({
      prompt: "p",
      cwd: "/tmp/x",
      sessionId: "s",
      model: "claude-sonnet-5",
      effort: effectiveEffort(getCondition("effort-low"), "high"),
    });
    expect(argv.slice(argv.indexOf("--effort"), argv.indexOf("--effort") + 2)).toEqual(["--effort", "low"]);
  });

  it("gives haiku-explore its own overlay and no CLI override at all", () => {
    const spec = getCondition("haiku-explore");
    expect(spec.overlays).toEqual(["haiku-explore"]);
    expect(spec.model).toBeUndefined();
    expect(spec.effort).toBeUndefined();
    expect(spec.extraClaudeArgs).toBeUndefined();
    expect(spec.corpus).toBe("v1");
  });

  // The arm's whole claim is "same instructions, different explorer". A single
  // added word in CLAUDE.md would make it an instruction experiment instead.
  it("ships baseline's instruction text byte for byte", () => {
    expect(fs.readFileSync(path.join(OVERLAYS, "haiku-explore", "CLAUDE.md"), "utf8")).toBe(
      fs.readFileSync(path.join(OVERLAYS, "baseline", "CLAUDE.md"), "utf8"),
    );
  });

  // Project agents outrank Claude Code's built-ins, so the frontmatter `name`
  // must be the built-in's name and the model must be haiku — get either wrong
  // and the arm silently re-measures baseline with an extra unused agent file.
  it("overrides the built-in Explore agent onto haiku, read-only", () => {
    const agent = fs.readFileSync(path.join(OVERLAYS, "haiku-explore", ".claude", "agents", "Explore.md"), "utf8");
    const frontmatter = agent.split("---")[1] ?? "";
    expect(frontmatter).toMatch(/^name:\s*Explore$/m);
    expect(frontmatter).toMatch(/^model:\s*haiku$/m);
    // Read-only: an exploration agent that could Edit would change what the arm
    // measures from "who explores" to "who does the work".
    const tools = /^tools:\s*(.+)$/m.exec(frontmatter)?.[1] ?? "";
    expect(tools.split(",").map((t) => t.trim()).sort()).toEqual(["Bash", "Glob", "Grep", "Read"]);
    expect(agent).not.toMatch(/graphify/i);
  });

  it("lands the agent definition inside the corpus copy where --setting-sources project finds it", () => {
    const dest = fs.mkdtempSync(path.join(os.tmpdir(), "levers-overlay-"));
    try {
      const written = applyOverlay(path.join(OVERLAYS, "haiku-explore"), dest);
      expect(written).toContain(path.join(".claude", "agents", "Explore.md"));
      expect(fs.existsSync(path.join(dest, ".claude", "agents", "Explore.md"))).toBe(true);
      expect(fs.existsSync(path.join(dest, "CLAUDE.md"))).toBe(true);
    } finally {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  });

  it("registers all three levers", () => {
    for (const n of ["effort-medium", "effort-low", "haiku-explore"]) expect(conditionNames()).toContain(n);
  });
});
