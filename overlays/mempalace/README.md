# overlays/mempalace

Overlay for the **`mempalace`** and **`haiku-mempalace`** arms (corpus-v1).

`CLAUDE.md` is `overlays/baseline/CLAUDE.md` verbatim plus a `## mempalace`
section. Keeping the shared text byte-identical to baseline's is what makes the
pair a clean contrast: the only instruction difference between the two arms is
the appended section.

That section is deliberately the same shape and roughly the same length as the
`## graphify` section `graphify install --project` writes — a one-line statement
of what exists, then a short rule list telling the agent to consult it first and
open only what it points to. Three arms with three differently-persuasive
nudges would measure the nudges, not the indexes.

The third bullet is the one that has no counterpart in the graphify overlay, and
it is a handicap removal rather than an extra advantage. `mempalace_search`
returns each hit's `source_path` as the **absolute path the file had when it was
indexed** (`scripts/build-palace.sh` pins that root at
`/tmp/mempalace-index/v1/taskflow`), not a path relative to the agent's working
directory. Without the translation rule the tool cannot answer a `locate` task
at all, since the answer contract asks for repository-relative paths; graphify
needs no equivalent line because `graphify query` already reports in-project
paths.

**This overlay ships no index.** The palace is tens of megabytes of ChromaDB and
is not a file the agent may read: `applyOverlay` copies an overlay directory
wholesale into the corpus copy, so an index stored here would land inside the
agent's own working directory. It lives in `.palaces/palace-v1` (gitignored,
built by `pnpm palace:build v1`) and is cloned into a private temp directory per
run by `bench/run.ts`, which then points the MCP server at the clone.
