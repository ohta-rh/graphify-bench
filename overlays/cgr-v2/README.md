# overlays/cgr-v2

Overlay for the **`cgr-v2`** and **`haiku-cgr-v2`** arms (corpus-v2).

Identical to `overlays/cgr` except for two words in the `## code-graph-rag`
section: its graph covers the 139-file `docs/` layer as well as the code
(indexed as `Section` nodes per heading, not full-text chunks), and its
staging root is `/tmp/cgr-index/v2/taskflow`. Both statements have to be true
of the artifact the arm actually reads, which is why this is a separate
overlay rather than a shared one — an arm whose `CLAUDE.md` advertises
documents its graph does not contain would measure a broken tool, and one
whose stated staging root is wrong would have every path translate to the
wrong repository-relative location.

It mirrors the `overlays/graphify` / `overlays/graphify-v2` and
`overlays/mempalace` / `overlays/mempalace-v2` splits for the same reason, and
like those pairs it is a full overlay rather than a delta: the payload is one
small file, so layering it on top of `cgr` would add a mechanism without
saving anything.

The index itself is the shared Memgraph + Qdrant graph built by
`scripts/build-cgr-index.sh v2` from the code-and-docs corpus staged at
`/tmp/cgr-index/v2/taskflow`, with `--project-name taskflow-v2`. See
`overlays/cgr/README.md` for why `read_file` / `list_directory` are disallowed
and why nothing about the index lives in this directory.
