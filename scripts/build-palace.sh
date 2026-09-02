#!/usr/bin/env bash
#
# build-palace.sh — build the MemPalace index the `mempalace*` benchmark arms read.
#
#   scripts/build-palace.sh v1     # code only            -> .palaces/palace-v1
#   scripts/build-palace.sh v2     # code + docs/         -> .palaces/palace-v2
#
# The palace is built ONCE per corpus generation and then copied per run by
# bench/run.ts, for two reasons: ChromaDB's sqlite file is not safe to share
# between concurrent readers, and `mempalace mine` writes to `~/.mempalace`
# (a global entity registry) — doing that once at build time keeps the 130
# measured runs free of that side effect entirely.
#
# ## Why the staging directory matters
#
# `mempalace_search` returns each hit's `source_path` as the ABSOLUTE path the
# file had when it was mined, and its `wing` as the top-level directory under
# the mined root. Both are baked into the palace and are visible to the agent
# at query time, so the staging path is part of the experiment's surface:
#
#   * It must be NEUTRAL. The agent must not be able to infer from a search
#     result that it is inside a graphify benchmark, which is the same reason
#     bench/lib/env.ts gives the run directory an opaque uuid name.
#   * It must be STABLE and SHORT, so that stripping the `<root>/taskflow/`
#     prefix from a `source_path` yields exactly the repository-relative path
#     the answer contract asks for. The overlay's CLAUDE.md states that rule,
#     which is what makes the tool usable for a `locate` task at all.
#
# Hence `/tmp/mempalace-index/<gen>/taskflow` rather than anything under this
# repository or a session scratchpad.
#
# Only git-tracked corpus files are staged, which is the same file set graph v1
# indexed (docs/plan/GRAPH.md §1): no node_modules, no build output.
#
# Requires `mempalace` on PATH, or MEMPALACE_EXE pointing at the executable.

set -euo pipefail

GEN="${1:-}"
if [[ "$GEN" != "v1" && "$GEN" != "v2" ]]; then
  echo "usage: scripts/build-palace.sh v1|v2" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MEMPALACE_EXE="${MEMPALACE_EXE:-$(command -v mempalace || true)}"
if [[ -z "$MEMPALACE_EXE" || ! -x "$MEMPALACE_EXE" ]]; then
  echo "build-palace: no mempalace executable. Install it and/or set MEMPALACE_EXE." >&2
  exit 1
fi

BUILD_ROOT="${MEMPALACE_BUILD_ROOT:-/tmp/mempalace-index}/$GEN"
STAGE="$BUILD_ROOT/taskflow"
PALACE="$REPO_ROOT/.palaces/palace-$GEN"

rm -rf "$BUILD_ROOT" "$PALACE"
mkdir -p "$STAGE" "$(dirname "$PALACE")"

# Stage the corpus generation's file set. v1 is the code-only corpus; v2 adds
# the 139-file documentation layer. `git ls-files` is the definition of both —
# the corpus is frozen in git, so anything untracked is build output.
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

echo "build-palace: staged $FILE_COUNT file(s) for $GEN at $STAGE"
echo "build-palace: mining into $PALACE"

STARTED="$(date +%s)"
export MEMPALACE_PALACE_PATH="$PALACE"
# --yes  : auto-approve entity detection (there is no stdin here)
# --no-llm: skip the optional local-LLM enrichment, which would make the build
#           non-deterministic and require an Ollama endpoint.
"$MEMPALACE_EXE" init --yes --auto-mine --no-llm "$STAGE" 2>&1 | tail -20
ELAPSED="$(( $(date +%s) - STARTED ))"

if [[ ! -d "$PALACE" ]]; then
  echo "build-palace: mempalace produced no palace at $PALACE" >&2
  exit 1
fi

BYTES="$(du -sk "$PALACE" | awk '{print $1 * 1024}')"
PALACE_FILES="$(find "$PALACE" -type f | wc -l | tr -d ' ')"
# Content hash over the palace's own files, so a rebuild can be compared to the
# figure recorded in docs/plan/MEMPALACE.md. Paths are relative to the palace
# root; the palace itself is gitignored, so this record is its only identity.
HASH="$(cd "$PALACE" && find . -type f | sort | xargs shasum -a 256 | shasum -a 256 | awk '{print $1}')"

echo
echo "corpus generation: $GEN"
echo "source files:      $FILE_COUNT"
echo "palace:            $PALACE"
echo "palace files:      $PALACE_FILES"
echo "palace bytes:      $BYTES"
echo "build seconds:     $ELAPSED"
echo "content hash:      $HASH"
echo "index root:        $STAGE"
