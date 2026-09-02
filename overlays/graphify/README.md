# overlays/graphify

Overlay for condition **B (graphify)**. Files here are copied over a fresh corpus
copy before each run.

Present:

- `CLAUDE.md` — the shared instruction text (identical to `overlays/baseline/CLAUDE.md`)
  plus the `## graphify` section **verbatim** as `graphify install --project` writes it
  (source: `graphify/always_on/claude-md.md`, graphifyy 0.9.53).

Still to be produced by the Phase 2 worker (do not hand-write these):

- `.claude/settings.json` — the PreToolUse hook. Its `command` contains an absolute
  path to the `graphify` executable; run `pnpm exec tsx scripts/patch-overlay.ts`
  after copying it in, to rewrite that path for the current machine.
- `.claude/skills/graphify/` — the project-scoped skill.
- `graphify-out/` — the frozen graph: `graph.json`, `GRAPH_REPORT.md`,
  `.graphify_analysis.json`, `.graphify_labels.json`, `manifest.json`,
  `.graphify_python`, `.graphify_root`.
  **Must not include** `memory/`, `reflections/`, or `graph.html` — carrying those
  across runs would leak session-to-session learning (architecture.md §8).
