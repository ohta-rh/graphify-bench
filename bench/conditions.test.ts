import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CONDITION_IDS, CONDITIONS, assertRegistryMatchesDisk, getCondition } from "./conditions.js";
import { OVERLAY_BASE_FILE, applyOverlay, resolveOverlayChain } from "./lib/copy.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OVERLAYS = path.join(REPO_ROOT, "overlays");

function tmpdir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bench-overlay-"));
}

describe("condition registry", () => {
  it("registers every overlay on disk, and nothing that is not there", () => {
    const onDisk = fs
      .readdirSync(OVERLAYS, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    expect([...CONDITION_IDS].sort()).toEqual(onDisk);
  });

  it("agrees with the .overlay-base markers on disk", () => {
    expect(() => assertRegistryMatchesDisk(OVERLAYS)).not.toThrow();
  });

  it("names the unknown condition and the registered ones when asked for a typo", () => {
    expect(() => getCondition("grahpify-v2")).toThrow(/grahpify-v2/);
    expect(() => getCondition("grahpify-v2")).toThrow(/baseline/);
  });

  it("declares exactly one delta overlay, layered on graphify-v2", () => {
    const deltas = CONDITIONS.filter((c) => c.base !== null);
    expect(deltas.map((c) => c.id)).toEqual(["graphify-strict-v2"]);
    expect(deltas[0]!.base).toBe("graphify-v2");
  });

  it("keeps the v2 conditions on the v2 corpus and the v1 ones on v1", () => {
    expect(getCondition("graphify").corpus).toBe("v1");
    expect(getCondition("graphify-v2").corpus).toBe("v2");
    expect(getCondition("graphify-strict-v2").corpus).toBe("v2");
  });
});

describe("resolveOverlayChain", () => {
  it("returns a single directory for a full overlay", () => {
    expect(resolveOverlayChain(OVERLAYS, "graphify-v2")).toEqual([
      path.join(OVERLAYS, "graphify-v2"),
    ]);
  });

  it("returns base-first order for a delta overlay", () => {
    expect(resolveOverlayChain(OVERLAYS, "graphify-strict-v2")).toEqual([
      path.join(OVERLAYS, "graphify-v2"),
      path.join(OVERLAYS, "graphify-strict-v2"),
    ]);
  });

  it("throws on a missing overlay rather than returning an empty chain", () => {
    expect(() => resolveOverlayChain(OVERLAYS, "no-such-condition")).toThrow(/overlay not found/);
  });

  it("throws on a missing base rather than silently applying the delta alone", () => {
    const root = tmpdir();
    fs.mkdirSync(path.join(root, "leaf"));
    fs.writeFileSync(path.join(root, "leaf", OVERLAY_BASE_FILE), "gone\n");
    expect(() => resolveOverlayChain(root, "leaf")).toThrow(/overlay not found for condition "gone"/);
  });

  it("throws on a cycle", () => {
    const root = tmpdir();
    for (const [name, base] of [["a", "b"], ["b", "a"]]) {
      fs.mkdirSync(path.join(root, name!));
      fs.writeFileSync(path.join(root, name!, OVERLAY_BASE_FILE), base!);
    }
    expect(() => resolveOverlayChain(root, "a")).toThrow(/cycle/);
  });

  it("rejects a base that is a path rather than a sibling name", () => {
    const root = tmpdir();
    fs.mkdirSync(path.join(root, "leaf"));
    fs.writeFileSync(path.join(root, "leaf", OVERLAY_BASE_FILE), "../elsewhere");
    expect(() => resolveOverlayChain(root, "leaf")).toThrow(/sibling overlay directory/);
  });
});

describe("applyOverlay with a delta", () => {
  it("lets the delta win on collision and never copies the marker", () => {
    const root = tmpdir();
    const dest = path.join(root, "work");
    fs.mkdirSync(dest);

    const base = path.join(root, "overlays", "base");
    fs.mkdirSync(path.join(base, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(base, ".claude", "settings.json"), '{"mode":"nudge"}');
    fs.writeFileSync(path.join(base, "big.json"), "inherited");

    const delta = path.join(root, "overlays", "delta");
    fs.mkdirSync(path.join(delta, ".claude"), { recursive: true });
    fs.writeFileSync(path.join(delta, OVERLAY_BASE_FILE), "base\n");
    fs.writeFileSync(path.join(delta, ".claude", "settings.json"), '{"mode":"strict"}');

    for (const dir of resolveOverlayChain(path.join(root, "overlays"), "delta")) {
      applyOverlay(dir, dest);
    }

    expect(fs.readFileSync(path.join(dest, ".claude", "settings.json"), "utf8")).toBe(
      '{"mode":"strict"}',
    );
    expect(fs.readFileSync(path.join(dest, "big.json"), "utf8")).toBe("inherited");
    expect(fs.existsSync(path.join(dest, OVERLAY_BASE_FILE))).toBe(false);
  });
});
