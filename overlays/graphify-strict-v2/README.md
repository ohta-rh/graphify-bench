# overlays/graphify-strict-v2 — a delta overlay

This directory is **not** a complete overlay. It carries a `.overlay-base` file
naming `graphify-v2`, and `bench/lib/copy.ts#resolveOverlayChain` expands that
into "apply `overlays/graphify-v2/` first, then this directory on top". Files
here win on collision; everything else — the graph, the skill, both CLAUDE.md
files — is inherited.

That is the whole point of the delta: `graphify-v2/graphify-out/graph.json` is
several megabytes, and a second full copy of it to change one flag on one hook
command would double the repository's weight for no measurement value.
`.overlay-base` itself is stripped during application and never reaches the
agent.

## What it changes

One line of `.claude/settings.json`. The `Read|Glob` PreToolUse hook becomes:

```
graphify hook-guard read --strict
```

In strict mode the hook **blocks** the first raw file read of a session until
one `graphify query` has run, instead of returning an `additionalContext` nudge
and letting the read through. The `Bash|Grep` search hook is unchanged and
still only nudges. This is what `graphify install --project --strict` writes;
the settings file here is byte-identical to that output apart from the absolute
executable path (see below).

The condition is registered in `bench/conditions.ts`, which asserts that the
`base` it declares matches the `.overlay-base` on disk.

## Maintenance

The hook command is stored as an absolute path, for the reason recorded in
`docs/plan/GRAPH.md` §3: 0.9.53's installer writes a bare `graphify`, and a
bare command fails to spawn when the process that launched `claude` has no
`~/.local/bin` on its PATH — which degrades the condition silently, fail-open.
Run `pnpm exec tsx scripts/patch-overlay.ts` on any new host before measuring;
`--check` is non-zero when a path is stale. That script maintains every
overlay's settings file, this one included.

`GRAPHIFY_HOOK_STRICT=0` in the environment disables strict mode at run time, so
never set it for this condition. `bench/lib/env.ts` reads the opposite knob
(`GRAPHIFY_HOOK_STRICT=1`) to force strictness onto a non-strict overlay; the
two mechanisms are independent and this overlay does not rely on the env var.
