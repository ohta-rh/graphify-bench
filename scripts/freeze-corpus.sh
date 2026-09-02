#!/usr/bin/env bash
#
# freeze-corpus.sh — report the identity of the Taskflow corpus.
#
# Prints the tree hash, file count and line count for corpus/taskflow/{src,tests}.
# The tree hash is what pins the corpus: any change to any tracked source or
# test file moves it, so a benchmark result is only comparable to another run
# quoting the same hash. Run from anywhere; paths resolve against the repo root.
#
# The numbers it prints are the ones recorded in docs/plan/CORPUS.md. It does
# not tag, commit, or modify anything.
#
# Usage:
#   scripts/freeze-corpus.sh          # human-readable
#   scripts/freeze-corpus.sh --json   # one JSON object

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CORPUS_DIRS=(corpus/taskflow/src corpus/taskflow/tests)

for dir in "${CORPUS_DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    echo "freeze-corpus: missing $dir (run from a checkout with the corpus present)" >&2
    exit 1
  fi
done

# One list, sorted, used for every measurement below so the three numbers
# always describe the same set of files.
FILES="$(find "${CORPUS_DIRS[@]}" -type f | sort)"

TREE_HASH="$(printf '%s\n' "$FILES" | xargs shasum -a 256 | shasum -a 256 | awk '{print $1}')"
FILE_COUNT="$(printf '%s\n' "$FILES" | wc -l | tr -d ' ')"
LOC="$(printf '%s\n' "$FILES" | xargs wc -l | tail -1 | awk '{print $1}')"
WORDS="$(printf '%s\n' "$FILES" | xargs wc -w | tail -1 | awk '{print $1}')"

if [[ "${1:-}" == "--json" ]]; then
  printf '{"tree_hash":"%s","file_count":%s,"loc":%s,"words":%s}\n' \
    "$TREE_HASH" "$FILE_COUNT" "$LOC" "$WORDS"
  exit 0
fi

echo "corpus:     ${CORPUS_DIRS[*]}"
echo "tree hash:  $TREE_HASH"
echo "files:      $FILE_COUNT"
echo "lines:      $LOC"
echo "words:      $WORDS"
