/**
 * Derives the ground-truth file sets for the `reference` and `impact` tasks
 * from the corpus itself, using ts-morph over `corpus/taskflow/tsconfig.json`.
 *
 *   pnpm exec tsx scripts/derive-keys.ts          # refresh + diff
 *   pnpm exec tsx scripts/derive-keys.ts --check  # diff only, non-zero on drift
 *
 * Why mechanical: a hand-listed "every caller of `can()`" key is exactly the
 * thing the benchmark is measuring, so it must not be produced by the same
 * kind of reading the agent under test performs. Re-running this after the
 * corpus is frozen must reproduce the committed keys byte for byte.
 *
 * graphify output is never consulted here — the keys come from the TypeScript
 * compiler's own symbol table, so the comparison stays non-circular.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Node, Project, SyntaxKind, type SourceFile } from "ts-morph";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_ROOT = path.join(REPO_ROOT, "corpus", "taskflow");
const KEYS_DIR = path.join(REPO_ROOT, "tasks", "keys");

// ---------------------------------------------------------------------------
// declarative spec
// ---------------------------------------------------------------------------

/**
 * `callers`   — files containing a *call* of the named exported function.
 *               The declaring file is excluded unless it calls the function too.
 * `refs`      — files containing any reference to the named exported
 *               declaration (value use, type position or import specifier).
 *               The declaring file IS included: renaming it or adding a
 *               required field edits the declaration itself.
 * `subscribes`— files calling `subscribe(...)` / `subscribeOnce(...)` with the
 *               given event name as the first argument.
 * `literal`   — files containing a string literal equal to `text` (used for
 *               "rename this event" impact sets, where the event name is a
 *               string and has no compiler symbol of its own).
 */
type KeySpec =
  | { id: string; kind: "callers"; file: string; symbol: string; notes: string }
  | { id: string; kind: "refs"; file: string; symbol: string; notes: string }
  | { id: string; kind: "subscribes"; event: string; notes: string }
  | { id: string; kind: "literal"; text: string; notes: string };

const EXCLUSION_RULE =
  "Derived mechanically by scripts/derive-keys.ts (ts-morph over corpus/taskflow/tsconfig.json); " +
  "re-running it must reproduce this file. Paths are repo-relative to the corpus root. " +
  "tests/** is excluded from every key: the tasks ask about application code, and a spec that " +
  "merely exercises a symbol is not a place the behaviour lives.";

const SPECS: readonly KeySpec[] = [
  {
    id: "REF1-assertcan-callers",
    kind: "callers",
    file: "src/lib/permissions.ts",
    symbol: "assertCan",
    notes:
      "Every file that CALLS assertCan(). src/lib/permissions.ts declares it and is excluded " +
      "because it does not call it. Files that only call can()/explain()/canAll() are excluded.",
  },
  {
    id: "REF2-would-exceed-limit-callers",
    kind: "callers",
    file: "src/config/plan-limits.ts",
    symbol: "wouldExceedLimit",
    notes:
      "Every file that CALLS wouldExceedLimit(). src/config/plan-limits.ts declares it; it is " +
      "included only if it also calls it. Callers of the sibling helpers getLimit()/getPlanLimits() " +
      "are NOT part of this set.",
  },
  {
    id: "REF3-issue-created-subscribers",
    kind: "subscribes",
    event: "issue.created",
    notes:
      'Every file that registers a handler for the "issue.created" domain event via subscribe() ' +
      "or subscribeOnce() from src/lib/event-bus.ts. Emitters and type declarations are excluded — " +
      "the question asks who reacts, not who publishes.",
  },
  {
    id: "IMP1-planlimits-field",
    kind: "refs",
    file: "src/config/plan-limits.ts",
    symbol: "PlanLimits",
    notes:
      "Every file referencing the exported PlanLimits interface (type positions and import " +
      "specifiers included). Rule: adding a required field to an interface breaks exactly the files " +
      "that name the type — a caller that only reads a number through getLimit() never names it and " +
      "is therefore out. The declaring file is included: the new field is written there.",
  },
  {
    id: "IMP2-rename-issue-created",
    kind: "literal",
    text: "issue.created",
    notes:
      'Every file containing the string literal "issue.created". Rule: the event name is a string, ' +
      "not a compiler symbol, so the impact set of renaming it is exactly the set of literal " +
      "occurrences — emitters, subscribers, the event map, the activity/webhook enums and the UI " +
      "label table alike.",
  },
  {
    id: "IMP3-limited-resource-union",
    kind: "refs",
    file: "src/types/billing.ts",
    symbol: "LimitedResource",
    notes:
      "Every file referencing the exported LimitedResource union. Rule: adding a member to a union " +
      "type forces a change wherever the union is named — exhaustive switches, Record keys and " +
      "function signatures. The declaring file is included.",
  },
];

// ---------------------------------------------------------------------------
// derivation
// ---------------------------------------------------------------------------

const project = new Project({
  tsConfigFilePath: path.join(CORPUS_ROOT, "tsconfig.json"),
  skipAddingFilesFromTsConfig: false,
});

/** Repo-relative POSIX path inside the corpus, or null for anything outside it. */
function corpusPath(sourceFile: SourceFile): string | null {
  const rel = path.relative(CORPUS_ROOT, sourceFile.getFilePath());
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join("/");
}

/** The single exclusion rule, applied to every key. */
function isExcluded(rel: string): boolean {
  return rel.startsWith("tests/") || rel.startsWith(".next/") || rel.endsWith(".d.ts");
}

function sourceFileOrThrow(rel: string): SourceFile {
  const sf = project.getSourceFile(path.join(CORPUS_ROOT, rel));
  if (!sf) throw new Error(`derive-keys: no source file ${rel} in the corpus project`);
  return sf;
}

/** The exported declaration named `symbol` in `rel`. */
function declarationOrThrow(rel: string, symbol: string): Node {
  const sf = sourceFileOrThrow(rel);
  const declarations = sf.getExportedDeclarations().get(symbol);
  const decl = declarations?.[0];
  if (!decl) throw new Error(`derive-keys: ${rel} does not export ${symbol}`);
  return decl;
}

/** Every identifier that resolves to the declaration, across the whole project. */
function referencingNodes(decl: Node): Node[] {
  const findable = decl as Node & { findReferencesAsNodes?: () => Node[] };
  if (typeof findable.findReferencesAsNodes !== "function") {
    throw new Error(`derive-keys: ${decl.getKindName()} is not reference-findable`);
  }
  return findable
    .findReferencesAsNodes()
    .filter((node) => corpusPath(node.getSourceFile()) !== null);
}

/** True when `node` is the callee of a call expression (`f()`, `ns.f()`). */
function isCallee(node: Node): boolean {
  const parent = node.getParent();
  if (Node.isCallExpression(parent)) return parent.getExpression() === node;
  if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === node) {
    const grand = parent.getParent();
    return Node.isCallExpression(grand) && grand.getExpression() === parent;
  }
  return false;
}

function deriveCallers(spec: Extract<KeySpec, { kind: "callers" }>): string[] {
  const decl = declarationOrThrow(spec.file, spec.symbol);
  const files = new Set<string>();
  for (const node of referencingNodes(decl)) {
    if (!isCallee(node)) continue;
    const rel = corpusPath(node.getSourceFile());
    if (rel && !isExcluded(rel)) files.add(rel);
  }
  return [...files];
}

function deriveRefs(spec: Extract<KeySpec, { kind: "refs" }>): string[] {
  const decl = declarationOrThrow(spec.file, spec.symbol);
  const files = new Set<string>();
  for (const node of referencingNodes(decl)) {
    const rel = corpusPath(node.getSourceFile());
    if (rel && !isExcluded(rel)) files.add(rel);
  }
  return [...files];
}

const SUBSCRIBE_FNS = new Set(["subscribe", "subscribeOnce"]);

function deriveSubscribes(spec: Extract<KeySpec, { kind: "subscribes" }>): string[] {
  const files = new Set<string>();
  for (const sf of project.getSourceFiles()) {
    const rel = corpusPath(sf);
    if (!rel || isExcluded(rel)) continue;
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const callee = call.getExpression();
      const name = Node.isPropertyAccessExpression(callee)
        ? callee.getName()
        : Node.isIdentifier(callee)
          ? callee.getText()
          : null;
      if (name === null || !SUBSCRIBE_FNS.has(name)) continue;
      const first = call.getArguments()[0];
      if (first && Node.isStringLiteral(first) && first.getLiteralValue() === spec.event) {
        files.add(rel);
      }
    }
  }
  return [...files];
}

function deriveLiteral(spec: Extract<KeySpec, { kind: "literal" }>): string[] {
  const files = new Set<string>();
  for (const sf of project.getSourceFiles()) {
    const rel = corpusPath(sf);
    if (!rel || isExcluded(rel)) continue;
    const hit = sf
      .getDescendantsOfKind(SyntaxKind.StringLiteral)
      .some((literal) => literal.getLiteralValue() === spec.text);
    if (hit) files.add(rel);
  }
  return [...files];
}

function derive(spec: KeySpec): string[] {
  switch (spec.kind) {
    case "callers":
      return deriveCallers(spec).sort();
    case "refs":
      return deriveRefs(spec).sort();
    case "subscribes":
      return deriveSubscribes(spec).sort();
    case "literal":
      return deriveLiteral(spec).sort();
  }
}

// ---------------------------------------------------------------------------
// write + diff
// ---------------------------------------------------------------------------

interface KeyFile {
  files: string[];
  notes?: string;
}

function readExisting(file: string): KeyFile | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as KeyFile;
  } catch {
    return null;
  }
}

function main(): void {
  const checkOnly = process.argv.includes("--check");
  fs.mkdirSync(KEYS_DIR, { recursive: true });

  let drifted = 0;

  for (const spec of SPECS) {
    const files = derive(spec);
    const keyPath = path.join(KEYS_DIR, `${spec.id}.json`);
    const existing = readExisting(keyPath);
    const next: KeyFile = { files, notes: `${spec.notes} ${EXCLUSION_RULE}` };
    const serialized = `${JSON.stringify(next, null, 2)}\n`;

    const before = new Set(existing?.files ?? []);
    const added = files.filter((f) => !before.has(f));
    const removed = [...before].filter((f) => !files.includes(f));
    const notesChanged = existing !== null && existing.notes !== next.notes;
    const changed = added.length > 0 || removed.length > 0 || notesChanged;

    if (changed) drifted += 1;

    if (!checkOnly) fs.writeFileSync(keyPath, serialized);

    const status = existing === null ? "NEW" : changed ? "CHANGED" : "same";
    console.log(`${spec.id}  ${files.length} files  [${status}]`);
    for (const f of added) console.log(`  + ${f}`);
    for (const f of removed) console.log(`  - ${f}`);
    if (notesChanged) console.log("  ~ notes");
  }

  if (checkOnly && drifted > 0) {
    console.error(`\n${drifted} key(s) differ from the committed set.`);
    process.exitCode = 1;
  } else if (drifted === 0) {
    console.log("\nall derived keys reproduce the committed set with no diff.");
  }
}

main();
