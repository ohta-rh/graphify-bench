# overlays/cgr

Overlay for the **`cgr`** and **`haiku-cgr`** arms (corpus-v1).

`CLAUDE.md` is `overlays/baseline/CLAUDE.md` verbatim plus a `## code-graph-rag`
section. Keeping the shared text byte-identical to baseline's is what makes the
pair a clean contrast: the only instruction difference between the two arms is
the appended section.

That section is deliberately the same shape and roughly the same length as the
`## graphify` section `graphify install --project` writes and the `## mempalace`
section `overlays/mempalace/CLAUDE.md` carries — a one-line statement of what
exists, then a short rule list telling the agent to consult it first and open
only what it points to. Three differently-persuasive nudges would measure the
nudges, not the indexes.

**This overlay ships no index.** code-graph-rag's index is not a directory this
overlay could carry: it lives in a shared Memgraph + Qdrant stack (`cgr daemon
up`), built once by `scripts/build-cgr-index.sh v1` from the code-only corpus
staged at `/tmp/cgr-index/v1/taskflow`, and every run reads that same shared,
read-only graph — there is nothing to clone per run, unlike mempalace's palace.
`bench/conditions.ts`'s `cgrMcp("v1")` points `TARGET_REPO_PATH` at that staging
directory, which is how the MCP server derives which project's subgraph to
answer from. It also sets `QDRANT_URL=http://127.0.0.1:6333` — without it cgr
writes/reads embeddings from a cwd-relative local Qdrant instead of the
daemon's shared container, and `semantic_search` answers "No embeddings have
been generated yet" from any working directory other than the one that built
the index (verified live 2026-09-03).

**Install:** `uv tool install --python 3.12 --with "mcp<2"
"code-graph-rag[treesitter-full,semantic,ast-grep]"`. The `mcp<2` pin is
required, not optional — code-graph-rag 0.0.845 declares `mcp>=1.28.1` with no
upper bound, and the `mcp` 2.x package removed `Server.list_tools`, so an
unpinned install crashes the MCP server at startup.

**Only nine of the server's tools are allowed**, all LLM-free and read-only:
`semantic_search`, `get_code_snippet`, `get_function_source`,
`find_duplicate_code`, `structural_search`, `list_projects`, `flow_verdict`,
`explain_traceback`, `rank_root_causes`. Twelve others are disallowed via
`--disallowedTools` (`bench/conditions.ts`'s `CGR_DISALLOWED_ARGS`):
`ask_agent` and `query_code_graph` are the tool's headline natural-language
Cypher path, and both require an external LLM the harness deliberately does not
wire up (`docs/plan/CGR.md` §2 says why); `index_repository`,
`update_repository`, `reingest`, `wipe_database` and `delete_project` would
mutate the graph every concurrent run reads; `surgical_replace_code`,
`write_file` and `structural_replace` would mutate the staging tree the graph
was built from; and `read_file` / `list_directory` read that staging copy
directly rather than the agent's own working directory, which would let the
agent open a file through a path `collect.ts` never counts as a `Read` — the
MCP equivalent of the `read_graph_json` counter-productive case this benchmark
already watches for graphify.

**The staging-path rule.** Every path and qualified name code-graph-rag returns
is rooted at the STAGING copy the graph was built from
(`/tmp/cgr-index/v1/taskflow`), not the agent's working directory — the same
situation as MemPalace's `source_path`, and why the overlay's `CLAUDE.md`
carries the prefix-stripping rule.
