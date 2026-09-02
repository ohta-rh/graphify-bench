# `graphify-strict-v2` overlay (delta only)

This directory is **not** a complete overlay. The `graphify-strict-v2` condition
in `bench/conditions.ts` declares `overlays: ["graphify-v2", "graphify-strict-v2"]`,
so the runner applies `overlays/graphify-v2/` first and then this directory on
top. Files here win on collision; everything else — the graph, the skill, both
CLAUDE.md files — is inherited.

That is the whole point of the delta: `graphify-v2/graphify-out/graph.json` is
several megabytes, and a second full copy of it to change one flag on one hook
command would double the repository's weight for no measurement value. It also
guarantees that the two v2 graphify arms share byte-identical graph, skill and
CLAUDE.md payloads — any measured difference is the hook, not a drifted copy.

The layering lives only in the condition registry; there is no marker file
inside the overlay directory, so an arm's full definition is readable without
walking `overlays/`.

## What it changes

One line of `.claude/settings.json`. The `Read|Glob` PreToolUse hook becomes:

```
graphify hook-guard read --strict
```

In strict mode the hook **blocks** the first raw file read of a session until
one `graphify query` has run, instead of returning an `additionalContext` nudge
and letting the read through; every later read degrades to the ordinary soft
nudge, so the agent can never be stranded. The `Bash|Grep` search hook is
unchanged and still only nudges. This is what `graphify install --project
--strict` writes; the settings file here is byte-identical to that output apart
from the absolute executable path (see below).

## Maintenance

The hook command is stored as an absolute path, for the reason recorded in
`docs/plan/GRAPH.md` §3: 0.9.53's installer writes a bare `graphify`, and a
bare command fails to spawn when the process that launched `claude` has no
`~/.local/bin` on its PATH — which degrades the condition silently, fail-open.
Run `pnpm exec tsx scripts/patch-overlay.ts` on any new host before measuring;
`--check` is non-zero when a path is stale. That script discovers every
overlay's settings file, this one included.

`GRAPHIFY_HOOK_STRICT=0` in the environment disables strict mode at run time, so
never set it for this condition. `bench/lib/env.ts` reads the opposite knob
(`GRAPHIFY_HOOK_STRICT=1`) to force strictness onto a non-strict overlay; the
two mechanisms are independent and this overlay does not rely on the env var.
