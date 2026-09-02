import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONDITIONS,
  HAIKU_MODEL,
  assertRegistryMatchesDisk,
  conditionNames,
  effectiveModel,
  getCondition,
  overlayDirs,
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
