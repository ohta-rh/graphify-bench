# overlays/mempalace-v2

Overlay for the **`mempalace-v2`** and **`haiku-mempalace-v2`** arms (corpus-v2).

Identical to `overlays/mempalace` except for two words in the `## mempalace`
section: its index covers the 139-file `docs/` layer as well as the code, and
its index root is `/tmp/mempalace-index/v2/taskflow`. Both statements have to be
true of the artifact the arm actually reads, which is why this is a separate
overlay rather than a shared one — an arm whose CLAUDE.md advertises documents
its index does not contain would measure a broken tool, and one whose stated
index root is wrong would have every `source_path` translate to the wrong
repository-relative path.

It mirrors the `overlays/graphify` / `overlays/graphify-v2` split for the same
reason, and like that pair it is a full overlay rather than a delta: the payload
is one small file, so layering it on top of `mempalace` would add a mechanism
without saving anything. (The delta form exists for `graphify-strict*`, where it
avoids duplicating a multi-megabyte graph in git.)

The index itself is `.palaces/palace-v2` — gitignored, built by
`pnpm palace:build v2`, cloned per run. See `overlays/mempalace/README.md` for
why it cannot live in this directory.
