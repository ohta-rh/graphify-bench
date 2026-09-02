import { describe, expect, it } from "vitest";
import { buildArgs, encodeCwd, encodeCwdCandidates } from "./claude-p.js";

describe("encodeCwd", () => {
  // Both pairs were observed on this machine on 2026-09-02 under
  // ~/.claude/projects with Claude Code 2.1.258.
  it("matches the observed project-directory name for a plain repo path", () => {
    expect(encodeCwd("/Users/tetsuyaohta/projects/other/graphify-bench")).toBe(
      "-Users-tetsuyaohta-projects-other-graphify-bench",
    );
  });

  it("matches the observed name for a macOS temp run directory (the `_` case)", () => {
    expect(
      encodeCwd(
        "/private/var/folders/82/dclbn8z5181_3ppfdtp8csd40000gn/T/graphify-bench-scratch/EX1-seat-cap__baseline__r1__203f7b64",
      ),
    ).toBe(
      "-private-var-folders-82-dclbn8z5181-3ppfdtp8csd40000gn-T-graphify-bench-scratch-EX1-seat-cap--baseline--r1--203f7b64",
    );
  });

  it("maps a leading-dash segment to a doubled dash", () => {
    expect(encodeCwd("/private/tmp/claude-501/-Users-x/scratchpad")).toBe(
      "-private-tmp-claude-501--Users-x-scratchpad",
    );
  });

  it("maps dots the same way", () => {
    expect(encodeCwd("/a/.claude/b")).toBe("-a--claude-b");
  });

  it("offers the realpath form as a second candidate when cwd is a symlink", () => {
    const candidates = encodeCwdCandidates("/tmp");
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    expect(candidates).toContain(encodeCwd("/tmp"));
  });
});

describe("buildArgs", () => {
  const base = {
    prompt: "find it",
    cwd: "/tmp/x",
    sessionId: "00000000-0000-4000-8000-000000000001",
    model: "claude-sonnet-5",
    effort: "high",
    maxTurns: 60,
    maxBudgetUsd: 4,
  };

  it("emits the fixed flag set from implementation-plan.md §6.2", () => {
    expect(buildArgs(base)).toEqual([
      "-p",
      "find it",
      "--output-format",
      "json",
      "--model",
      "claude-sonnet-5",
      "--effort",
      "high",
      "--setting-sources",
      "project",
      "--permission-mode",
      "bypassPermissions",
      "--max-turns",
      "60",
      "--max-budget-usd",
      "4",
      "--session-id",
      base.sessionId,
    ]);
  });

  it("never passes --no-session-persistence for a measured run (the JSONL is needed)", () => {
    expect(buildArgs(base)).not.toContain("--no-session-persistence");
  });

  it("blocks user-level settings so the global graphify skill cannot leak in", () => {
    const args = buildArgs(base);
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("project");
  });

  it("appends extra args, which the judge uses to opt out of persistence", () => {
    expect(buildArgs({ ...base, extraArgs: ["--no-session-persistence"] })).toContain("--no-session-persistence");
  });
});
