# overlays/graphify

Overlay for condition **B (graphify)**. Files here are copied over a fresh corpus
copy before each run. Built 2026-09-02 against graphifyy **0.9.53**, corpus `corpus-v1`.

`applyOverlay` drops this top-level `README.md`, so the agent never sees it.

## Contents

| Path | Origin |
|---|---|
| `CLAUDE.md` | shared instruction text + the `## graphify` section **verbatim** as `graphify install --project` writes it (byte-identical to 0.9.53's output — re-verified 2026-09-02) |
| `.claude/CLAUDE.md` | written by `graphify install --project`; three lines pointing at the project skill |
| `.claude/settings.json` | the two PreToolUse nudge hooks (`Bash\|Grep` → `hook-guard search`, `Read\|Glob` → `hook-guard read`) |
| `.claude/skills/graphify/**` | project-scoped skill, `SKILL.md` + 8 `references/*.md` (0.9.53) |
| `graphify-out/` | the frozen graph — see below |

`graphify-out/` holds exactly `graph.json`, `GRAPH_REPORT.md`,
`.graphify_analysis.json`, `.graphify_labels.json`, `manifest.json`,
`.graphify_python`, `.graphify_root`.
It **must not** gain `memory/`, `reflections/`, `graph.html`, `cache/` or
`.vocab.txt` — carrying session state across runs would leak session-to-session
learning (architecture.md §8).

## Maintenance

`graphify install --project` in 0.9.53 writes the hook command as a bare
`graphify` (it no longer bakes in an absolute path). The overlay deliberately
stores it as an **absolute** path instead, so the hook cannot silently no-op
when the spawned `claude` process has a PATH that omits `~/.local/bin` — a
fail-open hook would quietly degrade condition B into condition A.

That absolute path is machine-specific. Run

```bash
pnpm exec tsx scripts/patch-overlay.ts        # rewrite for this host
pnpm exec tsx scripts/patch-overlay.ts --check # verify without writing
```

after refreshing the overlay and on any new host before measuring.

`.graphify_python` is likewise a machine-specific absolute path. It is only a
probe for graphify's *git* hooks, not for the PreToolUse guard, so a stale value
does not affect measurement.
