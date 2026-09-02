# overlays/graphify-v2

Overlay for condition **graphify-v2**: graphify over code **and** the 139-file
documentation layer. Files here are copied over a fresh corpus copy before each
run. Built 2026-09-02 against graphifyy **0.9.53**, corpus `corpus-v2`.

`applyOverlay` drops this top-level `README.md`, so the agent never sees it.

## What differs from `overlays/graphify`

Only `graphify-out/`. The instruction surface — `CLAUDE.md`, `.claude/CLAUDE.md`,
`.claude/settings.json`, `.claude/skills/graphify/**` — is **byte-identical** to
the v1 overlay, deliberately: if the prompt surface moved at the same time as the
graph, a v1-vs-v2 difference could not be attributed to the graph.

The v2 graph adds semantically extracted document nodes and, more to the point,
doc→code and doc→doc edges: a requirement's `Implemented by` citation, a design
element's `Code:` field, a screen spec's `Files:` field, and every
`REQ-###`/`DES-###`/`ADR-###` cross-reference. That is what the `tasks-docs.json`
questions traverse. See `docs/plan/GRAPH-V2.md` for the build record.

## Contents

| Path | Origin |
|---|---|
| `CLAUDE.md` | shared instruction text + the `## graphify` section verbatim as `graphify install --project` writes it (0.9.53); copied from `overlays/graphify/` |
| `.claude/CLAUDE.md` | written by `graphify install --project`; three lines pointing at the project skill |
| `.claude/settings.json` | the two PreToolUse **nudge** hooks (`Bash\|Grep` → `hook-guard search`, `Read\|Glob` → `hook-guard read`) |
| `.claude/skills/graphify/**` | project-scoped skill, `SKILL.md` + 8 `references/*.md` (0.9.53) |
| `graphify-out/` | the frozen v2 graph — see below |

`graphify-out/` holds exactly `graph.json`, `GRAPH_REPORT.md`,
`.graphify_analysis.json`, `.graphify_labels.json`, `manifest.json`,
`.graphify_python`, `.graphify_root`.
It **must not** gain `memory/`, `reflections/`, `graph.html`, `cache/` or
`.vocab.txt` — carrying session state across runs would leak session-to-session
learning (architecture.md §8).

## The strict variant layers on this one

`overlays/graphify-strict-v2/` is a **delta overlay**: it holds a `.overlay-base`
file naming this directory and ships only the settings file that switches the read
hook to blocking mode. `bench/lib/copy.ts#resolveOverlayChain` applies this overlay
first and the delta on top, so the multi-megabyte graph exists once. Do not copy
`graphify-out/` into the strict overlay to "make it self-contained" — that would
double the repository's weight and let the two graphs drift.

## Maintenance

`graphify install --project` in 0.9.53 writes the hook command as a bare
`graphify`. This overlay deliberately stores it as an **absolute** path, so the
hook cannot silently no-op when the spawned `claude` process has a PATH that omits
`~/.local/bin` — a fail-open hook would quietly degrade the condition into the
baseline.

That absolute path is machine-specific. Run

```bash
pnpm exec tsx scripts/patch-overlay.ts        # rewrite every overlay for this host
pnpm exec tsx scripts/patch-overlay.ts --check # verify without writing
```

after refreshing an overlay and on any new host before measuring. The script now
walks every `overlays/*` directory that ships a settings file, so the strict delta
is maintained together with this one.

`.graphify_python` is likewise a machine-specific absolute path. It is only a probe
for graphify's *git* hooks, not for the PreToolUse guard, so a stale value does not
affect measurement.
