#!/bin/bash
# Opus-vs-Sonnet measurement launcher. Both model pairs run in the same batch on
# the same Claude Code build, so the Sonnet twins are re-measured here rather
# than borrowed from results/levers (which ran on an older CLI). effort-low-nosub
# is the delegation-free Sonnet reference: Opus never spawned a subagent here.
set -euo pipefail
cd "$(dirname "$0")/.."
# The docs-free corpus-v1 snapshot: corpus/taskflow minus docs/. Its src/tests
# tree hash must match scripts/freeze-corpus.sh (4148d9b2…, 477 files).
SNAP="${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot (corpus/taskflow without docs/)}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
[ ! -e "$SNAP/docs" ] || { echo "snapshot still contains docs/: $SNAP" >&2; exit 1; }
exec env BENCH_RESULTS_DIR=results/opus pnpm bench:full -- \
  --tasks tasks/tasks.json,tasks/tasks-ext.json \
  --conditions opus-effort-medium,opus-effort-low,effort-medium,effort-low,effort-low-nosub \
  --reps 1 --concurrency 3 --corpus "$SNAP"
