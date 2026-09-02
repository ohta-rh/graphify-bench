# `graphify-strict` overlay (delta only)

This directory is **not** a standalone overlay. The `graphify-strict` condition in
`bench/conditions.ts` applies `overlays/graphify` first and then this directory on
top, so the only thing that differs between the two graphify arms is the one file
below.

- `.claude/settings.json` — identical to `overlays/graphify/.claude/settings.json`
  except the `Read|Glob` PreToolUse hook runs `graphify hook-guard read --strict`.

Keeping it a delta is deliberate: `overlays/graphify/graphify-out/graph.json` is
4.6 MB, and a full copy would double it in git for a one-word change. It also
guarantees the two graphify arms share byte-identical graph, skill and CLAUDE.md
payloads — any measured difference is the hook, not a drifted copy.

`scripts/patch-overlay.ts` rewrites the absolute `graphify` executable path in
**both** settings files, so this one is kept in sync with the host machine like
the other.

Strict semantics (graphify 0.9.53, `graphify/cli.py::_run_hook_guard`): the FIRST
raw `Read` per session of an in-project source file that `manifest.json` indexes
is answered with `permissionDecision: "deny"` and a redirect to `graphify query`;
every later read degrades to the ordinary soft nudge, so the agent can never be
stranded. `Glob` and the `Bash|Grep` guard stay nudge-only in strict mode.
