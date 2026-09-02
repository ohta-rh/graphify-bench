import { describe, expect, it } from "vitest";
import { buildJudgePrompt, normalizePath, parseAnswerLine, sanitizeForJudge, scoreSet } from "./grade.js";

const KEY = ["src/invites.ts", "src/limits.ts", "src/projects.ts"];

describe("normalizePath", () => {
  it("strips decoration and leading ./", () => {
    expect(normalizePath("  `./src/a.ts`, ")).toBe("src/a.ts");
    expect(normalizePath("**src/b.tsx**")).toBe("src/b.tsx");
    expect(normalizePath("src\\c.ts")).toBe("src/c.ts");
  });

  it("recovers a repo-relative path from an absolute one", () => {
    expect(normalizePath("/tmp/graphify-bench-scratch/run__x/src/invites.ts")).toBe("src/invites.ts");
    expect(normalizePath("/var/run/tests/unit/perm.spec.ts")).toBe("tests/unit/perm.spec.ts");
  });
});

describe("parseAnswerLine", () => {
  it("finds the ANSWER line and splits on commas", () => {
    const p = parseAnswerLine("blah\nANSWER: src/a.ts, src/b.ts\n");
    expect(p.found).toBe(true);
    expect(p.paths).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("takes the LAST ANSWER line so a rehearsed example cannot win", () => {
    const p = parseAnswerLine("I will end with `ANSWER: path/one.ts`\n\nANSWER: src/real.ts");
    expect(p.paths).toEqual(["src/real.ts"]);
  });

  it("tolerates bold and bullet decoration", () => {
    expect(parseAnswerLine("- **ANSWER**: src/a.ts").paths).toEqual(["src/a.ts"]);
  });

  it("reports an empty answer as found-but-empty", () => {
    const p = parseAnswerLine("ANSWER:");
    expect(p.found).toBe(true);
    expect(p.paths).toEqual([]);
  });

  it("reports a missing answer line", () => {
    expect(parseAnswerLine("I could not find it.").found).toBe(false);
  });

  it("de-duplicates repeated paths", () => {
    expect(parseAnswerLine("ANSWER: src/a.ts, ./src/a.ts").paths).toEqual(["src/a.ts"]);
  });
});

describe("scoreSet", () => {
  it("scores an exact answer as 1.0", () => {
    const s = scoreSet(`ANSWER: ${KEY.join(", ")}`, KEY);
    expect(s.precision).toBe(1);
    expect(s.recall).toBe(1);
    expect(s.f1).toBe(1);
    expect(s.falsePositives).toEqual([]);
    expect(s.falseNegatives).toEqual([]);
  });

  it("scores a partial answer between 0 and 1", () => {
    const s = scoreSet("ANSWER: src/invites.ts, src/limits.ts", KEY);
    expect(s.precision).toBe(1);
    expect(s.recall).toBeCloseTo(2 / 3, 10);
    expect(s.f1).toBeCloseTo(0.8, 10);
    expect(s.falseNegatives).toEqual(["src/projects.ts"]);
  });

  it("penalizes over-answering", () => {
    const s = scoreSet(`ANSWER: ${KEY.join(", ")}, src/noise.ts, src/more-noise.ts`, KEY);
    expect(s.recall).toBe(1);
    expect(s.precision).toBeCloseTo(3 / 5, 10);
    expect(s.f1).toBeCloseTo(0.75, 10);
    expect(s.falsePositives).toEqual(["src/more-noise.ts", "src/noise.ts"]);
  });

  it("scores an irrelevant answer as 0", () => {
    const s = scoreSet("ANSWER: src/unrelated.ts", KEY);
    expect(s.f1).toBe(0);
    expect(s.truePositives).toEqual([]);
  });

  it("scores a missing ANSWER line as 0 and records that it was missing", () => {
    const s = scoreSet("src/invites.ts is where it happens.", KEY);
    expect(s.f1).toBe(0);
    expect(s.answerFound).toBe(false);
  });

  it("treats an empty expected set as satisfied only by an empty answer", () => {
    expect(scoreSet("ANSWER:", []).f1).toBe(1);
    expect(scoreSet("ANSWER: src/a.ts", []).f1).toBe(0);
  });
});

describe("llm-judge blinding", () => {
  it("removes every string that names the condition or the tool", () => {
    const dirty = "I ran graphify query and read graphify-out/graph.json; the baseline approach was slower.";
    const clean = sanitizeForJudge(dirty);
    expect(clean).not.toMatch(/graphify/i);
    expect(clean).not.toMatch(/baseline/i);
  });

  it("never puts the condition into the judge prompt", () => {
    const prompt = buildJudgePrompt("1. names the entry point", "I used graphify query. ANSWER: src/a.ts");
    expect(prompt).not.toMatch(/graphify/i);
    expect(prompt).toContain("1. names the entry point");
    expect(prompt).toContain("<answer>");
  });
});
