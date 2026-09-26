#!/bin/bash
# Hard-set measurement launcher: 16 hidden-test tasks x 5 arms x 2 reps.
# The graded spec is installed only after the agent exits (task.hidden), so the
# visible suite gives the agent no pointer to the defect or the required API.
set -euo pipefail
cd "$(dirname "$0")/.."
SNAP="${BENCH_CORPUS_V1:?set BENCH_CORPUS_V1 to a corpus-v1 snapshot (corpus/taskflow without docs/)}"
[ -d "$SNAP" ] || { echo "corpus-v1 snapshot not found: $SNAP" >&2; exit 1; }
[ ! -e "$SNAP/docs" ] || { echo "snapshot still contains docs/: $SNAP" >&2; exit 1; }
exec env BENCH_RESULTS_DIR=results/hard pnpm bench:full -- \
  --tasks tasks/tasks-hard.json \
  --conditions opus-effort-medium,opus-effort-low,effort-medium,effort-low,effort-low-nosub,effort-high,effort-xhigh,opus-effort-high,opus-effort-xhigh \
  --reps 2 --concurrency 3 --corpus "$SNAP"
