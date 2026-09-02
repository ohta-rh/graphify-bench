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
 * `importers` — files whose `import`/`export ... from` specifier resolves to
 *               the given module. The module itself is excluded.
 * `hop`       — TWO hops, for tasks that cannot be answered by one lookup:
 *               first the files subscribing to `event` (as `subscribes`),
 *               then, among the modules those files import directly, the ones
 *               whose path starts with `prefix`. The seed files themselves are
 *               NOT part of the answer — the question asks what the handlers
 *               reach, not who the handlers are.
 */
type CodeSpecBody =
  | { kind: "callers"; file: string; symbol: string }
  | { kind: "refs"; file: string; symbol: string }
  | { kind: "subscribes"; event: string }
  | { kind: "literal"; text: string }
  | { kind: "importers"; file: string }
  | { kind: "hop"; event: string; prefix: string };

/**
 * Doc-side derivations, added with the corpus-v2 documentation layer. They read
 * `corpus/taskflow/docs/**` as text and apply the same two conventions the docs
 * checker enforces, so a key can never disagree with `pnpm docs:check`:
 *
 * `docs-id-home` — the single file whose heading DEFINES each id (`^#+ REQ-061`).
 *                  This is the "which document governs X" answer for a `locate`.
 * `docs-id-refs` — every doc that mentions the id anywhere outside a defining
 *                  heading, plus the definer. The rename-impact set of an id.
 * `docs-cites-code` — every doc that names the code path inside backticks.
 *                  `field` narrows it to one metadata line (`Implemented by`,
 *                  `Verified by`, `Code`), which is the difference between "docs
 *                  that mention this file" and "docs that claim to specify it".
 * `docs-decided-in` — the ADR files named by the `Decided in:` lines of one
 *                  design document: a two-hop traceability question.
 * `docs-discrepancy` — the doc paths of named entries in
 *                  `tasks/keys/docs-discrepancies.json`. The ground truth was
 *                  written when the discrepancies were planted, so the key is a
 *                  projection of that record, never a fresh reading of the docs.
 * `union`        — set union of other specs, for `impact` keys that must span
 *                  documents AND code.
 */
type DocSpecBody =
  | { kind: "docs-id-home"; ids: string[] }
  | { kind: "docs-id-refs"; ids: string[] }
  | { kind: "docs-cites-code"; code: string; field?: string; dirs?: string[] }
  | { kind: "docs-decided-in"; file: string }
  | { kind: "docs-discrepancy"; ids: string[] }
  | { kind: "union"; parts: SpecBody[] };

type SpecBody = CodeSpecBody | DocSpecBody;
type KeySpec = SpecBody & { id: string; notes: string };

const EXCLUSION_RULE =
  "Derived mechanically by scripts/derive-keys.ts (ts-morph over corpus/taskflow/tsconfig.json); " +
  "re-running it must reproduce this file. Paths are repo-relative to the corpus root. " +
  "tests/** is excluded from every key: the tasks ask about application code, and a spec that " +
  "merely exercises a symbol is not a place the behaviour lives.";

/** The same promise for the doc-side keys, which are text-derived rather than compiler-derived. */
const DOC_EXCLUSION_RULE =
  "Derived mechanically by scripts/derive-keys.ts from corpus/taskflow/docs/** using the same two " +
  "conventions scripts/check-docs-corpus.ts enforces (a heading whose text starts with an id DEFINES " +
  "it; a backticked src/tests/scripts path is a code citation); re-running it must reproduce this " +
  "file. Paths are repo-relative to the corpus root. The aggregator documents traceability.md, " +
  "glossary.md and every index.md are excluded from doc keys: they are generated from, or index, the " +
  "whole corpus, so they cite nearly every id and path and would appear in every answer regardless " +
  "of the question.";

/** Doc-side kinds get DOC_EXCLUSION_RULE; a union spanning both gets the pair. */
function exclusionRuleFor(spec: KeySpec): string {
  const usesDocs = (body: SpecBody): boolean =>
    body.kind === "union" ? body.parts.some(usesDocs) : body.kind.startsWith("docs-");
  const usesCode = (body: SpecBody): boolean =>
    body.kind === "union" ? body.parts.some(usesCode) : !body.kind.startsWith("docs-");
  if (usesDocs(spec) && usesCode(spec)) return `${EXCLUSION_RULE} ${DOC_EXCLUSION_RULE}`;
  return usesDocs(spec) ? DOC_EXCLUSION_RULE : EXCLUSION_RULE;
}

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

  // -------------------------------------------------------------------------
  // tasks-ext.json — the second set. Different hubs, events and types from the
  // six specs above; see tasks/README.md for the per-task rationale.
  // -------------------------------------------------------------------------
  {
    id: "XREF1-assertorgscope-callers",
    kind: "callers",
    file: "src/lib/tenant.ts",
    symbol: "assertOrgScope",
    notes:
      "Every file that CALLS assertOrgScope(). src/lib/tenant.ts is included only because another " +
      "function in it calls the guard. The sibling tenant helpers assertRowsInScope(), " +
      "isInOrgScope(), scopedOrNull() and withOrgScope() do NOT count — the question asks for the " +
      "throwing org-scope guard specifically.",
  },
  {
    id: "XREF2-emit-callers",
    kind: "callers",
    file: "src/lib/event-bus.ts",
    symbol: "emit",
    notes:
      "Every file that CALLS emit() from the in-process event bus. Files that only subscribe(), " +
      "or that declare/label event names, are excluded; src/lib/event-bus.ts is included because " +
      "it calls emit() itself.",
  },
  {
    id: "XREF3-isenabled-callers",
    kind: "callers",
    file: "src/lib/feature-flags.ts",
    symbol: "isEnabled",
    notes:
      "Every file that CALLS isEnabled(). The largest call-site set in the corpus, spanning " +
      "actions, Route Handlers, Server and Client Components, hooks, config, jobs and services. " +
      "Files that only build a FlagContext, read a FeatureFlagSnapshot, or render <FeatureGate> " +
      "without calling the predicate are excluded.",
  },
  {
    id: "XREF4-comment-created-subscribers",
    kind: "subscribes",
    event: "comment.created",
    notes:
      'Every file registering a handler for the "comment.created" domain event via subscribe() or ' +
      "subscribeOnce(). The emitter (comment-service) and the files that merely declare or label " +
      "the event name are excluded — the question asks who reacts, not who publishes.",
  },
  {
    id: "XREF5-rate-limit-importers",
    kind: "importers",
    file: "src/lib/rate-limit.ts",
    notes:
      "Every file that imports the rate limiter module, whichever symbol it takes " +
      "(consumeRateLimit, getBucketConfig, RATE_LIMIT_BUCKETS, setOrgPlan, resetRateLimits). " +
      "The module itself is excluded. This is a whole-module dependency question, not a " +
      "single-symbol one.",
  },
  {
    id: "XREF6-member-joined-repositories",
    kind: "hop",
    event: "member.joined",
    prefix: "src/server/repositories/",
    notes:
      "TWO hops: first the files that subscribe to \"member.joined\", then the repository modules " +
      "those handler files import directly. The subscriber files themselves are NOT in the answer " +
      "— the question asks which repositories the event ultimately reaches. Repositories imported " +
      "by other subscribers, or by the emitter, are out of scope.",
  },

  {
    id: "XIMP1-role-union",
    kind: "refs",
    file: "src/types/member.ts",
    symbol: "Role",
    notes:
      "Every file referencing the exported Role union. Rule: adding a role forces a change " +
      "wherever the union is named — the permission matrix, the Zod enum, the role picker, the " +
      "badge, the seed and the two event payloads that carry a Role. Files that pass a role as a " +
      "bare string literal without naming the type are out.",
  },
  {
    id: "XIMP2-rename-comment-created",
    kind: "literal",
    text: "comment.created",
    notes:
      'Every file containing the string literal "comment.created". Rule: the event name is a ' +
      "string, not a compiler symbol, so the impact set of renaming it is exactly the set of " +
      "literal occurrences — emitter, subscribers, the event map, the activity/webhook enums and " +
      "the UI label table alike.",
  },
  {
    id: "XIMP3-issue-status-union",
    kind: "refs",
    file: "src/types/issue.ts",
    symbol: "IssueStatus",
    notes:
      "Every file referencing the exported IssueStatus union. Rule: adding a status forces a " +
      "change wherever the union is named — the board column model, the status select, the tone " +
      "map, the filter params, the optimistic reducer, the Zod enum and the repository. Files " +
      "that only compare a status to a string literal are out.",
  },
  {
    id: "XIMP4-feature-flag-key-union",
    kind: "refs",
    file: "src/types/feature-flag.ts",
    symbol: "FeatureFlagKey",
    notes:
      "Every file referencing the exported FeatureFlagKey union. Rule: adding a flag key forces a " +
      "change wherever the union is named — the flag catalogue, the plan-limits flag table, the " +
      "nav item type, the hooks and the settings UI. Call sites that pass a flag name as a bare " +
      "string to isEnabled() without naming the type are out.",
  },
  {
    id: "XIMP5-plan-id-union",
    kind: "refs",
    file: "src/types/billing.ts",
    symbol: "PlanId",
    notes:
      "Every file referencing the exported PlanId union. Rule: adding a plan forces a change " +
      "wherever the union is named, which reaches past billing into the rate limiter (bucket " +
      "sizes scale per plan), the flag context and the org type. Files that only read a plan's " +
      "numbers through getPlanLimits() without naming the type are out.",
  },
  {
    id: "XIMP6-limit-check-field",
    kind: "refs",
    file: "src/types/billing.ts",
    symbol: "LimitCheck",
    notes:
      "Every file referencing the exported LimitCheck interface. Rule: adding a required field to " +
      "an interface breaks exactly the files that name the type — the service that constructs it " +
      "and the UI/hooks that consume it. Files that call checkLimit() and immediately read one " +
      "property off the result without naming the type are out.",
  },

  // -------------------------------------------------------------------------
  // tasks-docs.json — the doc<->code set over the corpus-v2 documentation layer.
  // These answer with DOCUMENT paths (and, for `impact`, documents and code
  // together). See tasks/README.md and docs/plan/GRAPH-V2.md.
  // -------------------------------------------------------------------------

  // locate: which document GOVERNS a behaviour described in prose.
  {
    id: "DLOC1-issue-number-scope",
    kind: "docs-id-home",
    ids: ["REQ-061"],
    notes:
      "The single document that DEFINES the requirement governing issue-number allocation scope " +
      "(REQ-061, numbers unique per project and never reused). Documents that merely restate or " +
      "cite the rule — the DB dictionary, the issue design and the API catalogue — are out: the " +
      "question asks which document governs the behaviour, and exactly one heading defines it.",
  },
  {
    id: "DLOC2-webhook-retry-decision",
    kind: "docs-id-home",
    ids: ["ADR-018"],
    notes:
      "The architecture decision record that DEFINES the queue-and-backoff webhook delivery policy " +
      "(ADR-018). The webhook requirements, the webhook service design and the delivery runbook all " +
      "cite the decision but do not make it; only the ADR itself is the governing document.",
  },
  {
    id: "DLOC3-subscriber-isolation",
    kind: "docs-id-home",
    ids: ["DES-052"],
    notes:
      "The design document that DEFINES how one event subscriber's failure is prevented from " +
      "aborting the others (DES-052, Promise.allSettled handler isolation). ADR-005 decides that " +
      "there IS an in-process bus; the mechanism that isolates handlers is specified only here.",
  },
  {
    id: "DLOC4-webhook-delivery-history-screen",
    kind: "docs-cites-code",
    code: "src/app/(dashboard)/[orgSlug]/settings/webhooks/page.tsx",
    dirs: ["docs/ui/"],
    notes:
      "The UI specification whose Files field names the webhook settings page — the screen where an " +
      "administrator inspects past delivery attempts. Restricted to docs/ui/ because the question " +
      "asks for the screen specification, not every document that mentions the page component.",
  },

  // reference: traceability between documents and code.
  {
    id: "DREF1-webhook-service-requirements",
    kind: "docs-cites-code",
    code: "src/server/services/webhook-service.ts",
    field: "Implemented by",
    notes:
      "Every requirements document that claims webhook-service.ts as an implementation site, i.e. " +
      "names it on an `Implemented by:` line. Documents that mention the module in prose, in a " +
      "design `Code:` field, or in a runbook are NOT part of the answer — the question asks which " +
      "requirements the module implements, and only the Implemented by field asserts that.",
  },
  {
    id: "DREF2-digest-cadence-adrs",
    kind: "docs-decided-in",
    file: "docs/design/service-digest-and-email.md",
    notes:
      "Every architecture decision record named on a `Decided in:` line of the digest and email " +
      "service design — the ADRs the digest cadence and delivery design trace back through. This " +
      "is a two-hop question: the design document is the hop, the ADRs are the answer, and the " +
      "design document itself is therefore not in the set.",
  },
  {
    id: "DREF3-permission-matrix-verified-by",
    kind: "docs-cites-code",
    code: "tests/lib/permissions.matrix.test.ts",
    field: "Verified by",
    notes:
      "Every requirements document with at least one requirement whose `Verified by:` field names " +
      "the permission-matrix spec. Documents that cite the spec in the test plan or in prose are " +
      "out; only a Verified by claim counts, which is what makes this mechanically checkable " +
      "against the documents rather than a judgement about coverage.",
  },
  {
    id: "DREF4-adr017-references",
    kind: "docs-id-refs",
    ids: ["ADR-017"],
    notes:
      "DELIBERATELY EASY control: every document that mentions ADR-017, a literal id lookup a grep " +
      "answers exactly. Included so the doc set has a zero-advantage reference baseline to compare " +
      "the semantic questions against. The defining ADR is included; the aggregator documents are " +
      "not.",
  },

  // impact: documents AND code that a change forces.
  {
    id: "DIMP1-error-code-union",
    kind: "union",
    parts: [
      { kind: "refs", file: "src/types/api.ts", symbol: "ErrorCode" },
      { kind: "docs-cites-code", code: "src/types/api.ts" },
      { kind: "docs-cites-code", code: "src/lib/errors.ts" },
    ],
    notes:
      "Adding a member to the shared ErrorCode union. Code side: every file naming the union (the " +
      "status map, the action wrapper, the error translator, the UI copy tables). Document side: " +
      "every document citing the union's declaring module or the error-translation module, which " +
      "is where the per-action error lists that would go stale are anchored.",
  },
  {
    id: "DIMP2-job-cadence-table",
    kind: "union",
    parts: [
      { kind: "importers", file: "src/server/jobs/scheduler.ts" },
      { kind: "docs-cites-code", code: "src/server/jobs/scheduler.ts" },
    ],
    notes:
      "Adding a job to the scheduler's cadence table. Code side: every module importing the " +
      "scheduler (the declaring module is excluded by the importers rule even though the table " +
      "lives there — see the notes on the code-side keys). Document side: every document citing " +
      "scheduler.ts, i.e. the background-job design, the job requirements and the ops runbooks.",
  },
  {
    id: "DIMP3-notification-kind-union",
    kind: "union",
    parts: [
      { kind: "refs", file: "src/types/notification.ts", symbol: "NotificationKind" },
      { kind: "docs-cites-code", code: "src/types/notification.ts" },
    ],
    notes:
      "Adding a member to the NotificationKind union. Code side: every file naming the union — the " +
      "service, the repository, the preference table and the inbox UI. Document side: every " +
      "document citing the declaring module. A deliberately narrow document side: it tests whether " +
      "a wide code impact is reported without inventing document hits to match it.",
  },
  {
    id: "DIMP4-req157-renumber",
    kind: "docs-id-refs",
    ids: ["REQ-157"],
    notes:
      "DELIBERATELY EASY control: renumbering REQ-157 forces an edit in every document that " +
      "mentions the id, which is a literal lookup a grep answers exactly. Included so the doc set " +
      "has a zero-advantage impact baseline. Document-only by construction — an id is a documentation " +
      "artifact and appears nowhere in the code.",
  },

  // discrepancy: documents the frozen code contradicts, within one domain.
  {
    id: "DDIS1-permissions-and-role-gates",
    kind: "docs-discrepancy",
    ids: ["D01", "D07", "D11"],
    notes:
      "The documents whose role-gate claims the ROLE_MATRIX contradicts: comment creation stated as " +
      "open to viewers, project archiving stated as owner-only, and the flags settings screen stated " +
      "as member-and-above. Projected from tasks/keys/docs-discrepancies.json, which was written " +
      "when the discrepancies were planted, so the key never depends on re-reading the documents.",
  },
  {
    id: "DDIS2-time-and-retry-constants",
    kind: "docs-discrepancy",
    ids: ["D02", "D08", "D09"],
    notes:
      "The documents whose time-and-retry constants the code contradicts: the digest job cadence, " +
      "the webhook attempt ceiling's stated source of truth, and the session TTL. Projected from " +
      "tasks/keys/docs-discrepancies.json. Note the corpus contains correct statements of two of " +
      "these values elsewhere, so the domain is not uniformly wrong.",
  },
  {
    id: "DDIS3-schema-indexes",
    kind: "docs-discrepancy",
    ids: ["D03", "D12"],
    notes:
      "The database dictionary pages whose index definitions the Drizzle schema contradicts: an " +
      "index on search_index that does not exist, and the issue-number unique index described over " +
      "the wrong columns. Projected from tasks/keys/docs-discrepancies.json.",
  },
  {
    id: "DDIS4-quotas-flags-and-rate-limits",
    kind: "docs-discrepancy",
    ids: ["D04", "D05", "D06", "D10"],
    notes:
      "The documents whose quota, rollout and throttling numbers the configuration contradicts: an " +
      "error code an action cannot return, the free-plan project quota, a percentage rollout, and a " +
      "rate-limit refill rate. Projected from tasks/keys/docs-discrepancies.json. The largest of " +
      "the four discrepancy domains, and the one whose documents sit furthest apart.",
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

function deriveCallers(spec: Extract<CodeSpecBody, { kind: "callers" }>): string[] {
  const decl = declarationOrThrow(spec.file, spec.symbol);
  const files = new Set<string>();
  for (const node of referencingNodes(decl)) {
    if (!isCallee(node)) continue;
    const rel = corpusPath(node.getSourceFile());
    if (rel && !isExcluded(rel)) files.add(rel);
  }
  return [...files];
}

function deriveRefs(spec: Extract<CodeSpecBody, { kind: "refs" }>): string[] {
  const decl = declarationOrThrow(spec.file, spec.symbol);
  const files = new Set<string>();
  for (const node of referencingNodes(decl)) {
    const rel = corpusPath(node.getSourceFile());
    if (rel && !isExcluded(rel)) files.add(rel);
  }
  return [...files];
}

const SUBSCRIBE_FNS = new Set(["subscribe", "subscribeOnce"]);

function deriveSubscribes(spec: Extract<CodeSpecBody, { kind: "subscribes" }>): string[] {
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

function deriveLiteral(spec: Extract<CodeSpecBody, { kind: "literal" }>): string[] {
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

/** The corpus files a module specifier in `sf` resolves to. */
function directImports(sf: SourceFile): string[] {
  const out: string[] = [];
  for (const decl of [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]) {
    const target = decl.getModuleSpecifierSourceFile();
    if (!target) continue;
    const rel = corpusPath(target);
    if (rel && !isExcluded(rel)) out.push(rel);
  }
  return out;
}

function deriveImporters(spec: Extract<CodeSpecBody, { kind: "importers" }>): string[] {
  const target = sourceFileOrThrow(spec.file).getFilePath();
  const files = new Set<string>();
  for (const sf of project.getSourceFiles()) {
    const rel = corpusPath(sf);
    if (!rel || isExcluded(rel) || rel === spec.file) continue;
    for (const decl of [...sf.getImportDeclarations(), ...sf.getExportDeclarations()]) {
      if (decl.getModuleSpecifierSourceFile()?.getFilePath() === target) files.add(rel);
    }
  }
  return [...files];
}

function deriveHop(spec: Extract<CodeSpecBody, { kind: "hop" }>): string[] {
  const seeds = deriveSubscribes({ kind: "subscribes", event: spec.event });
  if (seeds.length === 0) throw new Error(`derive-keys: no subscribers for ${spec.event}`);
  const files = new Set<string>();
  for (const seed of seeds) {
    for (const imported of directImports(sourceFileOrThrow(seed))) {
      if (imported.startsWith(spec.prefix)) files.add(imported);
    }
  }
  return [...files];
}

// ---------------------------------------------------------------------------
// doc-side derivation (corpus-v2 documentation layer)
// ---------------------------------------------------------------------------

const DOCS_ROOT = path.join(CORPUS_ROOT, "docs");

/** Same conventions as scripts/check-docs-corpus.ts — keep the two in step. */
const ID_PATTERN = /\b(REQ|DES|ADR)-(\d{3})\b/g;
const HEADING_DEF = /^#{1,6}\s+(REQ|DES|ADR)-(\d{3})\b/;
const CODE_PATH = /`((?:src|tests|scripts)\/[^`\s*]+?\.(?:ts|tsx|js|mjs|json|sql|css|md))`/g;
const FENCE = /^\s*```/;

/**
 * Aggregator documents excluded from every doc key.
 *
 * `traceability.md` is generated from the other documents' metadata and
 * therefore cites nearly every id and path in the corpus; the per-directory
 * `index.md` files and `glossary.md` are the same kind of artifact by hand.
 * Including them would make every doc key contain the same three or four
 * files regardless of the question — the doc-side analogue of the `tests/**`
 * exclusion applied to the code keys.
 */
function isExcludedDoc(rel: string): boolean {
  const base = path.posix.basename(rel);
  return base === "index.md" || rel === "docs/traceability.md" || rel === "docs/glossary.md";
}

interface DocFile {
  /** Corpus-relative POSIX path, e.g. `docs/requirements/issues.md`. */
  rel: string;
  lines: string[];
}

function listDocs(): DocFile[] {
  const out: DocFile[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) {
        const rel = path.relative(CORPUS_ROOT, full).split(path.sep).join("/");
        out.push({ rel, lines: fs.readFileSync(full, "utf8").split("\n") });
      }
    }
  };
  walk(DOCS_ROOT);
  return out;
}

const DOCS = listDocs();

/** Scan a document line by line, mirroring the checker's fenced-block handling. */
function scanDoc(doc: DocFile, visit: (line: string, inFence: boolean, isDefHeading: boolean) => void): void {
  let inFence = false;
  for (const line of doc.lines) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    visit(line, inFence, !inFence && HEADING_DEF.test(line));
  }
}

function deriveDocsIdHome(spec: Extract<DocSpecBody, { kind: "docs-id-home" }>): string[] {
  const found = new Map<string, string>();
  for (const doc of DOCS) {
    scanDoc(doc, (line, inFence) => {
      if (inFence) return;
      const def = HEADING_DEF.exec(line);
      if (!def) return;
      const id = `${def[1]}-${def[2]}`;
      if (!spec.ids.includes(id)) return;
      const previous = found.get(id);
      if (previous && previous !== doc.rel) {
        throw new Error(`derive-keys: ${id} is defined in both ${previous} and ${doc.rel}`);
      }
      found.set(id, doc.rel);
    });
  }
  for (const id of spec.ids) {
    if (!found.has(id)) throw new Error(`derive-keys: no document defines ${id}`);
  }
  return [...new Set(found.values())];
}

function deriveDocsIdRefs(spec: Extract<DocSpecBody, { kind: "docs-id-refs" }>): string[] {
  const files = new Set<string>();
  for (const doc of DOCS) {
    if (isExcludedDoc(doc.rel)) continue;
    scanDoc(doc, (line, inFence) => {
      if (inFence) return;
      for (const m of line.matchAll(ID_PATTERN)) {
        if (spec.ids.includes(`${m[1]}-${m[2]}`)) files.add(doc.rel);
      }
    });
  }
  if (files.size === 0) throw new Error(`derive-keys: no document references ${spec.ids.join(", ")}`);
  return [...files];
}

function deriveDocsCitesCode(spec: Extract<DocSpecBody, { kind: "docs-cites-code" }>): string[] {
  const files = new Set<string>();
  const fieldPrefix = spec.field ? `- **${spec.field}:**` : null;
  for (const doc of DOCS) {
    if (isExcludedDoc(doc.rel)) continue;
    if (spec.dirs && !spec.dirs.some((d) => doc.rel.startsWith(d))) continue;
    // A metadata value may wrap onto continuation lines; once a matching field
    // opens, keep reading until the next `- **Field:**` or a blank line.
    let inField = fieldPrefix === null;
    scanDoc(doc, (line) => {
      if (fieldPrefix !== null) {
        if (line.startsWith(fieldPrefix)) inField = true;
        else if (/^- \*\*[^*]+:\*\*/.test(line) || line.trim() === "") inField = false;
      }
      if (!inField) return;
      for (const m of line.matchAll(CODE_PATH)) {
        if (m[1] === spec.code) files.add(doc.rel);
      }
    });
  }
  if (files.size === 0) {
    throw new Error(`derive-keys: no document cites ${spec.code}${spec.field ? ` under "${spec.field}"` : ""}`);
  }
  return [...files];
}

function deriveDocsDecidedIn(spec: Extract<DocSpecBody, { kind: "docs-decided-in" }>): string[] {
  const doc = DOCS.find((d) => d.rel === spec.file);
  if (!doc) throw new Error(`derive-keys: no such document ${spec.file}`);
  const ids = new Set<string>();
  let inField = false;
  scanDoc(doc, (line) => {
    if (line.startsWith("- **Decided in:**")) inField = true;
    else if (/^- \*\*[^*]+:\*\*/.test(line) || line.trim() === "") inField = false;
    if (!inField) return;
    for (const m of line.matchAll(ID_PATTERN)) {
      if (m[1] === "ADR") ids.add(`${m[1]}-${m[2]}`);
    }
  });
  if (ids.size === 0) throw new Error(`derive-keys: ${spec.file} has no "Decided in:" ADR references`);
  return deriveDocsIdHome({ kind: "docs-id-home", ids: [...ids] });
}

interface Discrepancy {
  id: string;
  doc_path: string;
}

function deriveDocsDiscrepancy(spec: Extract<DocSpecBody, { kind: "docs-discrepancy" }>): string[] {
  const file = path.join(KEYS_DIR, "docs-discrepancies.json");
  const record = JSON.parse(fs.readFileSync(file, "utf8")) as { discrepancies: Discrepancy[] };
  const byId = new Map(record.discrepancies.map((d) => [d.id, d]));
  const files = new Set<string>();
  for (const id of spec.ids) {
    const entry = byId.get(id);
    if (!entry) throw new Error(`derive-keys: docs-discrepancies.json has no entry ${id}`);
    // The record stores repo-relative paths; keys are corpus-relative.
    const prefix = "corpus/taskflow/";
    if (!entry.doc_path.startsWith(prefix)) {
      throw new Error(`derive-keys: ${id} doc_path is not under ${prefix}: ${entry.doc_path}`);
    }
    files.add(entry.doc_path.slice(prefix.length));
  }
  return [...files];
}

function deriveBody(spec: SpecBody): string[] {
  switch (spec.kind) {
    case "callers":
      return deriveCallers(spec);
    case "refs":
      return deriveRefs(spec);
    case "subscribes":
      return deriveSubscribes(spec);
    case "literal":
      return deriveLiteral(spec);
    case "importers":
      return deriveImporters(spec);
    case "hop":
      return deriveHop(spec);
    case "docs-id-home":
      return deriveDocsIdHome(spec);
    case "docs-id-refs":
      return deriveDocsIdRefs(spec);
    case "docs-cites-code":
      return deriveDocsCitesCode(spec);
    case "docs-decided-in":
      return deriveDocsDecidedIn(spec);
    case "docs-discrepancy":
      return deriveDocsDiscrepancy(spec);
    case "union":
      return [...new Set(spec.parts.flatMap(deriveBody))];
  }
}

function derive(spec: KeySpec): string[] {
  return deriveBody(spec).sort();
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
    const next: KeyFile = { files, notes: `${spec.notes} ${exclusionRuleFor(spec)}` };
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
