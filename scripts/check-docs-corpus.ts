#!/usr/bin/env tsx
/**
 * check-docs-corpus.ts — integrity gate for the Taskflow documentation corpus.
 *
 * The docs under `corpus/taskflow/docs/` are benchmark fixtures: their value comes
 * entirely from being *consistent with each other* and *accurate about the frozen code*.
 * A dangling `REQ-123`, a duplicated `DES-104` heading or a cited source file that does not
 * exist would silently turn a doc-to-code question into a trick question. This script is
 * the gate that keeps that from happening.
 *
 * Checks
 *   (a) Every REQ / DES / ADR id referenced anywhere in the corpus is DEFINED exactly once.
 *       An id is DEFINED by a Markdown heading whose text begins with that id; every other
 *       occurrence is a reference.
 *   (b) Every code path cited in the docs (any backticked `src/...` or `tests/...` token,
 *       including those in "Implemented by" / "Code:" fields and in traceability.md) exists
 *       under corpus/taskflow.
 *   (c) Prints file and word counts per directory.
 *
 * Usage:  pnpm docs:check   (or: pnpm exec tsx scripts/check-docs-corpus.ts)
 * Exit code 0 on success, 1 on any violation.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const corpusRoot = join(repoRoot, "corpus", "taskflow");
const docsRoot = join(corpusRoot, "docs");

/** Files the checker deliberately ignores: review scratch that is not part of the corpus. */
const IGNORED_BASENAMES = new Set([".review-notes.json"]);

type Located = { file: string; line: number };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".md") && !IGNORED_BASENAMES.has(entry)) {
      out.push(full);
    }
  }
  return out;
}

if (!existsSync(docsRoot)) {
  console.error(`docs root not found: ${docsRoot}`);
  process.exit(1);
}

const files = walk(docsRoot).sort();
const rel = (f: string) => relative(repoRoot, f);

// --- collect ---------------------------------------------------------------

const ID_PATTERN = /\b(REQ|DES|ADR)-(\d{3})\b/g;
/** A heading whose text starts with an id defines that id. */
const HEADING_DEF = /^#{1,6}\s+(REQ|DES|ADR)-(\d{3})\b/;
/** Backticked corpus-relative source path. */
const CODE_PATH = /`((?:src|tests|scripts)\/[^`\s]+?\.(?:ts|tsx|js|mjs|json|sql|css|md))`/g;
/** Fenced code blocks are skipped for id scanning to avoid counting illustrative snippets. */
const FENCE = /^\s*```/;

const definitions = new Map<string, Located[]>();
const references = new Map<string, Located[]>();
const citedPaths = new Map<string, Located[]>();
const wordsByDir = new Map<string, number>();
const filesByDir = new Map<string, number>();

let totalWords = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  const words = text.split(/\s+/).filter(Boolean).length;
  totalWords += words;
  const dirKey = relative(docsRoot, file).split(sep).slice(0, -1).join("/") || ".";
  wordsByDir.set(dirKey, (wordsByDir.get(dirKey) ?? 0) + words);
  filesByDir.set(dirKey, (filesByDir.get(dirKey) ?? 0) + 1);

  let inFence = false;
  lines.forEach((line, i) => {
    const at: Located = { file, line: i + 1 };

    if (FENCE.test(line)) {
      inFence = !inFence;
      return;
    }

    for (const m of line.matchAll(CODE_PATH)) {
      push(citedPaths, m[1]!, at);
    }

    if (inFence) return;

    const def = HEADING_DEF.exec(line);
    if (def) {
      push(definitions, `${def[1]}-${def[2]}`, at);
      return; // a defining heading is not also a reference to itself
    }

    for (const m of line.matchAll(ID_PATTERN)) {
      push(references, `${m[1]}-${m[2]}`, at);
    }
  });
}

function push(map: Map<string, Located[]>, key: string, at: Located): void {
  const list = map.get(key);
  if (list) list.push(at);
  else map.set(key, [at]);
}

// --- (a) id integrity ------------------------------------------------------

const problems: string[] = [];

for (const [id, locs] of [...definitions].sort()) {
  if (locs.length > 1) {
    problems.push(
      `duplicate definition of ${id} (${locs.length}x): ` +
        locs.map((l) => `${rel(l.file)}:${l.line}`).join(", "),
    );
  }
}

for (const [id, locs] of [...references].sort()) {
  if (!definitions.has(id)) {
    const shown = locs.slice(0, 4).map((l) => `${rel(l.file)}:${l.line}`).join(", ");
    problems.push(
      `undefined id ${id} referenced ${locs.length}x: ${shown}` +
        (locs.length > 4 ? ", ..." : ""),
    );
  }
}

const orphans = [...definitions.keys()].filter((id) => !references.has(id)).sort();

// --- (b) cited code paths exist -------------------------------------------

for (const [path, locs] of [...citedPaths].sort()) {
  if (!existsSync(join(corpusRoot, path))) {
    const shown = locs.slice(0, 3).map((l) => `${rel(l.file)}:${l.line}`).join(", ");
    problems.push(`cited code path does not exist: ${path} (${shown})`);
  }
}

// --- (c) report ------------------------------------------------------------

const byNamespace = (ns: string) =>
  [...definitions.keys()].filter((id) => id.startsWith(ns)).sort();

const range = (ids: string[]) =>
  ids.length === 0 ? "-" : `${ids[0]} .. ${ids[ids.length - 1]} (${ids.length})`;

console.log("Taskflow documentation corpus\n");
console.log(`root: ${relative(repoRoot, docsRoot)}`);
console.log(`files: ${files.length}    words: ${totalWords.toLocaleString()}\n`);

console.log("per directory:");
const dirs = [...filesByDir.keys()].sort();
const pad = Math.max(...dirs.map((d) => d.length));
for (const dir of dirs) {
  console.log(
    `  ${dir.padEnd(pad)}  ${String(filesByDir.get(dir)).padStart(4)} files  ` +
      `${String(wordsByDir.get(dir)!.toLocaleString()).padStart(9)} words`,
  );
}

const totalRefs = [...references.values()].reduce((n, l) => n + l.length, 0);
console.log("\nidentifiers:");
console.log(`  REQ  ${range(byNamespace("REQ"))}`);
console.log(`  DES  ${range(byNamespace("DES"))}`);
console.log(`  ADR  ${range(byNamespace("ADR"))}`);
console.log(
  `  ${definitions.size} defined, ${totalRefs} references, ` +
    `density ${(totalRefs / Math.max(1, definitions.size)).toFixed(1)} refs/id`,
);
console.log(`  distinct code paths cited: ${citedPaths.size}`);

if (orphans.length > 0) {
  console.log(
    `\nnote: ${orphans.length} id(s) defined but never referenced elsewhere: ` +
      orphans.slice(0, 12).join(", ") +
      (orphans.length > 12 ? ", ..." : ""),
  );
}

if (problems.length > 0) {
  console.error(`\nFAIL — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

console.log("\nOK — every referenced id is defined exactly once, every cited path exists.");
