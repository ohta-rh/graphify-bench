import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONDITIONS,
  HAIKU_MODEL,
  conditionNames,
  effectiveModel,
  overlayDirs,
  resolveCondition,
} from "./conditions.js";
import { buildArgs } from "./lib/claude-p.js";
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
