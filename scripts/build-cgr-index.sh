#!/usr/bin/env bash
#
# build-cgr-index.sh — build the code-graph-rag index the `cgr*` benchmark arms query.
#
#   scripts/build-cgr-index.sh v1           # code only            -> .cgr/index-v1/manifest.json
#   scripts/build-cgr-index.sh v2           # code + docs/         -> .cgr/index-v2/manifest.json
#   scripts/build-cgr-index.sh v1 --force   # rebuild over an existing staging dir
#
# Unlike MemPalace's palace (`build-palace.sh`), code-graph-rag's index is not
# a directory this script or `bench/run.ts` can clone: it lives in a shared
# Memgraph + Qdrant stack (`cgr daemon up`, Docker), and every run reads that
# ONE read-only graph. There is nothing to clone per run — `run.ts`'s
# `provisionMcp` still clones `resourceDir`, but `resourceDir` here is the tiny
# manifest directory this script writes, not the graph itself.
#
# ## Why the staging directory matters
#
# The MCP server derives the project it answers from `TARGET_REPO_PATH`
# (dirname + a sha256 prefix), so that env var must be the exact STAGING path
# this script indexed. Graph nodes also store the ABSOLUTE staged path as
# their source location — the same situation as MemPalace's `source_path` — so
# the staging path is part of the experiment's surface for the same two
# reasons `build-palace.sh` gives:
#
#   * It must be NEUTRAL: nothing in a query result should let the agent infer
#     it is inside a graphify benchmark.
#   * It must be STABLE and SHORT, so stripping the `<root>/taskflow/` prefix
#     from a returned path yields exactly the repository-relative path the
#     answer contract asks for. The overlay's CLAUDE.md states that rule.
#
# Hence `/tmp/cgr-index/<gen>/taskflow` rather than anything under this
# repository or a session scratchpad — the same root `build-palace.sh` uses
# for MemPalace, one directory over.
#
# Only git-tracked corpus files are staged: v1 excludes corpus/taskflow/docs/,
# v2 includes it. Same file-set definition as build-palace.sh.
#
# Requires `cgr` (or `code-graph-rag`) on PATH, or CGR_EXE pointing at it, and
# a running `cgr daemon` (Memgraph + Qdrant) — this script does not start one.

set -euo pipefail

GEN="${1:-}"
FORCE=0
for arg in "$@"; do
  [[ "$arg" == "--force" ]] && FORCE=1
done
if [[ "$GEN" != "v1" && "$GEN" != "v2" ]]; then
  echo "usage: scripts/build-cgr-index.sh v1|v2 [--force]" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CGR_EXE="${CGR_EXE:-$(command -v cgr || command -v code-graph-rag || true)}"
if [[ -z "$CGR_EXE" || ! -x "$CGR_EXE" ]]; then
  echo "build-cgr-index: no cgr/code-graph-rag executable. Install it and/or set CGR_EXE." >&2
  exit 1
fi

BUILD_ROOT="${CGR_BUILD_ROOT:-/tmp/cgr-index}/$GEN"
STAGE="$BUILD_ROOT/taskflow"
PROJECT="taskflow-$GEN"
INDEX_DIR="$REPO_ROOT/.cgr/index-$GEN"
MANIFEST="$INDEX_DIR/manifest.json"

if [[ -d "$STAGE" ]]; then
  if [[ "$FORCE" -eq 1 ]]; then
    rm -r "$STAGE"
  else
    echo "build-cgr-index: staging dir already exists at $STAGE. Pass --force to rebuild." >&2
    exit 1
  fi
fi
mkdir -p "$STAGE" "$INDEX_DIR"

# Stage the corpus generation's file set. v1 is the code-only corpus; v2 adds
# the 139-file documentation layer. `git ls-files` is the definition of both.
if [[ "$GEN" == "v1" ]]; then
  FILES="$(git ls-files corpus/taskflow | grep -v '^corpus/taskflow/docs/')"
else
  FILES="$(git ls-files corpus/taskflow)"
fi
FILE_COUNT="$(printf '%s\n' "$FILES" | wc -l | tr -d ' ')"

while IFS= read -r f; do
  rel="${f#corpus/taskflow/}"
  mkdir -p "$STAGE/$(dirname "$rel")"
  cp "$f" "$STAGE/$rel"
done <<<"$FILES"

echo "build-cgr-index: staged $FILE_COUNT file(s) for $GEN at $STAGE"
echo "build-cgr-index: indexing into the shared graph as project \"$PROJECT\""

STARTED="$(date +%s)"
export ORCHESTRATOR_PROVIDER=ollama
export ORCHESTRATOR_MODEL=qwen3.5:4b
export CYPHER_PROVIDER=ollama
export CYPHER_MODEL=qwen3.5:4b
# The daemon's Qdrant container, not cgr's cwd-relative fallback
# (./.qdrant_code_embeddings) — without this the build's embeddings land
# somewhere `semantic_search` can never find them from a run's own cwd.
export QDRANT_URL=http://127.0.0.1:6333

# Drop any stale project of the same name first, so a rebuild never leaves
# orphaned embeddings from a previous run behind in the shared Qdrant/Memgraph
# stores. Ignored when the project does not exist yet (first build).
"$CGR_EXE" --quiet delete-project --name "$PROJECT" --repo-path "$STAGE" < /dev/null 2>&1 | tail -10 || true

# --quiet             : non-interactive-friendly output
# --update-graph      : (re)build the graph for this project rather than only
#                        opening a REPL against an existing one
# --no-instructions   : skip the interactive first-run instructions prompt
# < /dev/null          : close stdin — there is no terminal to answer prompts,
#                        and an unexpected prompt must fail loudly, not hang
"$CGR_EXE" --quiet start \
  --repo-path "$STAGE" \
  --project-name "$PROJECT" \
  --update-graph \
  --no-instructions \
  < /dev/null 2>&1 | tail -40
ELAPSED="$(( $(date +%s) - STARTED ))"

CGR_VERSION="$("$CGR_EXE" --version 2>/dev/null | head -1 || echo unknown)"

# Content hash over the STAGED files (not the graph, which is not a directory
# this script can hash) — same recipe as build-palace.sh's content hash, so
# the two families' manifests are comparable at a glance.
HASH="$(cd "$STAGE" && find . -type f | sort | xargs shasum -a 256 | shasum -a 256 | awk '{print $1}')"

# `cgr stats` has no per-project flag; it prints every project in the shared graph.
STATS="$("$CGR_EXE" --quiet stats 2>&1 | sed 's/\x1b\[[0-9;]*m//g' || echo "(cgr stats failed)")"

cat >"$MANIFEST" <<JSON
{
  "generation": "$GEN",
  "project": "$PROJECT",
  "index_root": "$STAGE",
  "source_files": $FILE_COUNT,
  "staged_tree_sha256": "$HASH",
  "cgr_version": $(printf '%s' "$CGR_VERSION" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),
  "build_seconds": $ELAPSED,
  "stats": $(printf '%s' "$STATS" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
  "built_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo
echo "corpus generation: $GEN"
echo "source files:      $FILE_COUNT"
echo "project:           $PROJECT"
echo "index root:        $STAGE"
echo "build seconds:     $ELAPSED"
echo "staged tree hash:  $HASH"
echo "cgr version:       $CGR_VERSION"
echo "manifest:          $MANIFEST"
